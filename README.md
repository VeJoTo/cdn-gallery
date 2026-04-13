# CDN 3D Gallery

An interactive 3D gallery built for the Centre for Digital Narrative (CDN) at the University of Bergen. Explore a neon-lit arcade-themed gaming room featuring CDN research, interactive exhibits, and easter eggs.

Built as part of a bachelor thesis in Media & Interaction Design at UiB.

## Quick Start

**Prerequisites:** [Node.js](https://nodejs.org/) (v18 or later)

```bash
# Clone the repo
git clone https://github.com/VeJoTo/cdn-gallery.git
cd cdn-gallery

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

## Controls

- **Click** objects to zoom in and interact
- **Drag** to orbit the camera around the room
- **Scroll** to zoom in/out
- **Reset View** button (top-left) returns to the default camera position
- **Escape** closes any open panel or overlay

## What's Inside

- Two retro arcade cabinets with glowing neon screens
- A gaming desk with CRT monitors, a globe, VHS tapes, and a floppy disk
- A wall-mounted TV streaming a YouTube video (with sound toggle)
- A magical book on a pedestal with flippable parchment pages
- A rabbit hole with a scrollytelling deep-dive into CDN research
- A CDN Annual Report on the table (PDF viewer)
- An AI Cinema event poster linking to CDN's website
- A chatbot Guide you can talk to
- Background music toggle
- A scrapbook-style inventory with achievements
- Pac-Man and ghost easter eggs

## Tech Stack

- [Three.js](https://threejs.org/) — 3D rendering
- [GSAP](https://greensock.com/gsap/) — camera animations
- [Vite](https://vitejs.dev/) — dev server and bundler
- [Vitest](https://vitest.dev/) — testing
- Vanilla JavaScript (no frameworks)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Build for production |
| `npm test` | Run tests |

## Project Structure

```
src/
  main.js            # Entry point, renderer, camera, controls
  navigation.js      # Hotspot system, click handling, GSAP camera transitions
  ui.js              # All UI overlays (panels, chat, book, report, inventory)
  scene/
    room.js           # Room geometry, lighting, neon strips
    objects.js         # All 3D objects (arcades, desk, globe, pedestal, etc.)
    gatekeeper.js      # Guide character (portrait texture)
    panels.js          # Wall panel canvas textures
  tests/
    navigation.test.js
    ui.test.js
styles/
  main.css            # All CSS (HUD, overlays, scrapbook, chat)
public/
  guide.png           # Guide portrait
  cdn-report.pdf      # CDN Annual Report 2025
index.html
```

## License

This project was created for educational purposes as part of a UiB bachelor thesis.
