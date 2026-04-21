# CDN Website Landing Page — Design Spec

## Overview

Recreate the UiB Center for Digital Narrative webpage as a landing page that serves as the entry point to the project. The page faithfully mirrors the structure, content, and visual design of `https://www4.uib.no/en/research/research-centres/center-for-digital-narrative`. A prominent "Explore the CDN Gallery!" link opens the existing 3D gallery in a new browser tab.

## Architecture

### File Structure

- `website.html` — new entry point, the CDN website recreation
- `index.html` — existing 3D gallery (unchanged)
- `styles/website.css` — dedicated stylesheet for the website page
- `vite.config.js` — updated for multi-page build (both `website.html` and `index.html`)

### Routing

- The deployed root URL serves `website.html`
- The gallery link points to `index.html`, opened via `target="_blank"`
- No shared runtime between the two pages; they are independent HTML documents

## Content Sections

All sections below reproduce the real CDN page content faithfully.

### 1. Header

- UiB logo (top-left), linking to `https://www.uib.no/en`
- Navigation bar: Studies, Research, About UiB, Museum, Library, For students, For employees
- Search icon/field (visual only — no backend)
- Language toggle: Norwegian / English (visual only)

### 2. Breadcrumb

- Path: Home > Research > Research centres
- Links point to real UiB URLs

### 3. Hero Section

- Page title: "Center for Digital Narrative"
- Subtitle: description of CDN's research focus
- CDN logo image (horizontal color variant) — use CDN's public logo or a placeholder

### 4. Gallery Call-to-Action Banner

Placed immediately after the hero section. A visually distinct but tonally appropriate banner:

- Text: "Explore the CDN Gallery!"
- Subtext: "Step into an interactive 3D experience of CDN's research"
- Styled as a highlighted card/banner — subtle background color (e.g., light blue or CDN accent), clear CTA button
- `<a href="index.html" target="_blank" rel="noopener">` behavior
- Should feel native to the UiB page, not like an ad

### 5. About Section

- Heading introducing CDN as a Norwegian Centre of Research Excellence (2023-2033)
- Funded by Norwegian Research Council
- Three focus areas: algorithmic narrativity, new environments/materialities, shifting cultural contexts
- Key paragraph on contemporary digital narratives
- Interdisciplinary research methods description

### 6. Research Nodes

Six integrated research nodes, each as a titled item (can be a list or card grid):

1. Electronic Literature
2. Computer Games and Interactive Digital Narrative
3. Computational Narrative Systems
4. Social Media and Network Narratives
5. Extended Digital Narratives
6. Artistic Integrated Research

### 7. Resources & Links

Featured resources list:

- Podcast: Off Center
- YouTube seminars/talks
- Living Glossary of Digital Narrative
- CDN Collection
- CDN Governance documentation

Social media links: Newsletter, LinkedIn, Bluesky, Facebook, Instagram, Mastodon

### 8. Featured Articles

Three highlighted items with thumbnail images (or placeholders), titles, and dates:

- CFP — After Virtual Reality Symposium (15 April 2026)
- Understanding New Stories By Telling Them (26 March 2026)
- Call for 2027 CDN Guest Researcher Fellowship (19 March 2026)

### 9. Events

Upcoming events with date, title, and location:

1. CDN and iGGi Game Jam (27-29 April) — NG5, Bergen
2. Daemons, Myths, and Monsters (29 May) — narratives of technology/AI

### 10. Research Groups & Projects

**Groups:** Electronic Literature, Computational Narrative Systems, Computer Games, Social Media & Network Narratives, Extending Digital Narrative, Artistic Integrated Research, Publishing & Infrastructure

**Featured Projects:**

- Understanding Masculinity in Games
- Extending Digital Narratives
- Algorithmic Folklore
- AI STORIES

### 11. People Section

**Leadership:**

- Scott Rettberg (Center Director)
- Jill Walker Rettberg (Co-Director)

**Staff by role:** Postdoctors, researchers, professors, PhD candidates, administrative staff. List names with links to UiB profile pages.

### 12. Affiliations & Contact

**Affiliations:**

- Faculty of Humanities
- Department of Information Science and Media Studies
- Department of Linguistic, Literary and Aesthetic Studies

**Contact:**

- Address: Langes gate 1-3, 5007 Bergen
- Phone: +47 55 58 69 13
- Email: adm.cdn@uib.no
- Communications: Andreas Hadsel Opsvik

**Funding badge:** Norwegian Centre of Excellence — funded by Research Council of Norway and UiB (Project 332643)

### 13. Footer

Multi-column footer:

- Contact UiB (contact page, find employees, press)
- Shortcuts (studies, vacant positions)
- Social media icons
- Website info (cookies, privacy, accessibility)
- UiB logo

## Visual Design

### Colors

- Background: white (`#ffffff`)
- Text: dark gray/black
- UiB red accent: `#c41230` (used in header, links, highlights)
- Section backgrounds: alternating white and very light gray (`#f5f5f5`) for visual separation
- Gallery CTA banner: subtle blue/teal accent or CDN brand color

### Typography

- Font family: system fonts matching UiB (Arial/Helvetica-based sans-serif stack)
- Title: large, bold
- Section headings: medium weight, clear hierarchy (h2, h3)
- Body: standard readable size (~16px)

### Layout

- Max-width container (~1200px), centered
- Single column with occasional two-column sections (e.g., articles grid, people columns)
- Generous whitespace between sections
- Responsive: stacks to single column on mobile

### Images

- CDN logo in hero section
- Placeholder thumbnails for featured articles (colored rectangles with text)
- UiB logo in header and footer

## Vite Configuration

Update `vite.config.js` to handle multi-page build:

```js
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        website: resolve(__dirname, 'website.html'),
        gallery: resolve(__dirname, 'index.html'),
      },
    },
  },
});
```

## Out of Scope

- Backend functionality (search, language toggle are visual-only)
- Dynamic content loading
- CMS integration
- Changes to the existing 3D gallery
