// src/radioData.js
// ── Sci-Fi Radio podcast playlist ────────────────────────────────────────────
// Each entry is one episode shown on the neon display and played via <audio>.
// Fields:
//   url         — direct audio stream URL (no CORS required for plain <audio>)
//   title       — short uppercase title shown large on the display
//   label       — station / show name shown below the title
//   guest       — optional guest / topic line (shown on display if present)
//   description — longer episode blurb (used in future info panel / tooltip)

export const RADIO_PLAYLIST = [
  {
    url: "https://d3ctxlq1ktw2nl.cloudfront.net/staging/2026-3-27/422987755-44100-2-9323520ddaa74.m4a",
    title: "The AI Update XXI - Controversy Part 1",
    label: "Off Center - CDN RADIO",
    guest: "Scott & Jhave",
    description:
      'An exploratJoin Scott and Jhave for a candid, slightly cynical deep dive into the ethical quagmires currently reshaping the tech landscape on The AI Update. This episode tackles everything from the military entanglements of Anthropic and Palantir to the unsettling rise of AI-driven bioweapons and global cyber warfare. Amidst a flurry of deepfakes and "supervillain" corporate maneuvers, the duo questions whether humanity is truly prepared for the automated future it is so aggressively buildinion of how artificial intelligence is reshaping the way we create, curate, and preserve art across digital and physical spaces.',
  },
  {
    url: "https://d3ctxlq1ktw2nl.cloudfront.net/staging/2026-3-6/421538345-44100-2-957b9eefe30a9.m4a",
    title: "ALGOpod #7: Bokar N'Diaye",
    label: "Off Center - CDN RADIO",
    guest: "Gabriele de Seta & Bokar N'Diaye",
    description:
      "In episode seven of ALGOpod, Gabriele de Seta catches up with Bokar N'Diaye, doctoral researcher at the University of Amsterdam's Institute for Logic, Language and Computation, regarding the past and future of creativity and generative models.",
  },
  {
    url: "https://d3ctxlq1ktw2nl.cloudfront.net/staging/2026-2-31/421125050-44100-2-6c932fa40fd08.m4a",
    title: "The AI Update XX - AI Consciousness",
    label: "Off Center - CDN RADIO",
    guest: "Scott & Jhave",
    description:
      'On this episode Scott and Jhave talk about AI Consciousness, debating whether recent research into mechanistic interpretability suggests that frontier models are developing introspection, nascent sentience, and/or a "society of thought.',
  },
];
