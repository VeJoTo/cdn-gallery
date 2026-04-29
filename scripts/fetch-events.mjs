#!/usr/bin/env node
// scripts/fetch-events.mjs
//
// Fetches CDN's iCal calendar feed from UiB, parses it, and writes a
// simplified JSON snapshot to public/events.json. Run manually whenever
// you want fresh events:
//
//     node scripts/fetch-events.mjs
//
// The frontend then fetches /events.json (same-origin, no CORS issue)
// and renders the list in the inventory's CDN Events tab.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICS_URL = 'https://www.uib.no/en/node/138219/eventlist.ics';
const SOURCE_PAGE = 'https://www.uib.no/en/cdn/calendar';
const OUT_PATH = path.join(
  fileURLToPath(new URL('../public/', import.meta.url)),
  'events.json'
);

// Unfold lines per RFC 5545: a line beginning with a space or tab is a
// continuation of the previous line.
function unfold(text) {
  return text.replace(/\r?\n[ \t]/g, '');
}

// Decode iCal text escapes (\\, \,, \;, \n).
function unescapeIcal(s) {
  return s
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

// Parse a date string in iCal format. Two main shapes:
//   20260514T083000Z         (UTC)
//   20260514T083000          (floating local)
//   20260514                 (date-only)
function parseIcalDate(value) {
  const m = value.match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/
  );
  if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00', z] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${z ? 'Z' : ''}`;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function parseEvents(text) {
  const events = [];
  const blocks = unfold(text).split(/BEGIN:VEVENT/);
  blocks.shift(); // strip preamble
  for (const block of blocks) {
    const body = block.split(/END:VEVENT/)[0];
    const event = {};
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      // Strip parameters: "DTSTART;TZID=Europe/Oslo:..." → key="DTSTART"
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const keyPart = line.slice(0, colonIdx);
      const value = unescapeIcal(line.slice(colonIdx + 1));
      const key = keyPart.split(';')[0].toUpperCase();

      switch (key) {
        case 'SUMMARY':
          event.title = value;
          break;
        case 'DTSTART':
          event.start = parseIcalDate(value);
          break;
        case 'DTEND':
          event.end = parseIcalDate(value);
          break;
        case 'LOCATION':
          event.location = value;
          break;
        case 'URL':
          event.url = value;
          break;
        case 'DESCRIPTION':
          // Description can be long — trim to a single sentence-ish line.
          event.description = value.split('\n')[0].slice(0, 240);
          break;
        case 'CATEGORIES':
          event.category = value.toLowerCase().split(',')[0].trim();
          break;
      }
    }
    if (event.title && event.start) events.push(event);
  }
  return events;
}

async function main() {
  process.stdout.write(`Fetching ${ICS_URL}...\n`);
  const res = await fetch(ICS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch iCal: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const all = parseEvents(text);

  // Keep only events that haven't ended yet, sorted by start time.
  const now = Date.now();
  const upcoming = all
    .filter(e => {
      const cutoff = e.end ? Date.parse(e.end) : Date.parse(e.start);
      return cutoff >= now;
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .slice(0, 20); // hard cap so the feed never gets huge

  const output = {
    fetchedAt: new Date().toISOString(),
    sourceUrl: SOURCE_PAGE,
    icsUrl: ICS_URL,
    events: upcoming,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');
  process.stdout.write(
    `Wrote ${upcoming.length} upcoming events to ${path.relative(
      process.cwd(),
      OUT_PATH
    )}\n`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
