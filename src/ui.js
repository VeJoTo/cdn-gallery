// src/ui.js
import { applySkyMode, getSkyMode, setSkyMode } from './sky.js';
import { playIntro as runIntroDialogue } from './intro.js';

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const INTRO_FLAG_KEY = 'cdn-gallery:intro-seen';

export const INTRO_SCRIPT = [
  { text: 'Welcome kids! 🪄' },
  { text: "You've just stepped into the home of CDN — the Centre for Digital Narrative at the University of Bergen. Everything you see here is a visualization of the research happening at the centre." },
  { text: "CDN studies how stories work in the digital age — games, AI that writes fiction, virtual worlds, interactive art. I'll be your guide through it." },
  {
    html: true,
    text: 'Go ahead and look around: <strong>WASD</strong> to walk, <strong>mouse</strong> to look. Press <strong>E</strong> to open your inventory, and call me back any time with the <strong>G</strong> key. Off you pop!'
  }
];

// Safe localStorage readers — browser private mode / quota issues never break the app.
export function hasSeenIntro(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (!storage) return false;
  try {
    return storage.getItem(INTRO_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (!storage) return;
  try {
    storage.setItem(INTRO_FLAG_KEY, '1');
  } catch {
    /* swallow — worst case the player sees the intro again, which is tolerable */
  }
}

export const BOOK_PAGES = [
  { image: 'bok-1.jpg'  },
  { image: 'bok-2.jpg'  },
  { image: 'bok-3.jpg'  },
  { image: 'bok-4.jpg'  },
  { image: 'bok-5.jpg'  },
  { image: 'bok-6.jpg'  },
  { image: 'bok-7.jpg'  },
  { image: 'bok-8.jpg'  },
  { image: 'bok-9.jpg'  },
  { image: 'bok-10.jpg' },
  { image: 'bok-11.jpg' },
  { image: 'bok-12.jpg' }
];

// Detailed content for each "dive deeper" point on the deviation page
export const DIVE_DEEPER_CONTENT = {
  creepier: {
    title: 'A "creepier" retelling',
    body: `<p>The AI version leans into horror tropes that the original folktale never needed. The original storyteller trusted the audience — a bloody room full of skeletons was enough. The tale didn't linger on the gore.</p>
           <p>LLMs trained on modern horror fiction amplify the creepiness — adding eerie descriptions of flickering candles, whispering shadows, and "a sense of dread that crept up her spine." The original is matter-of-fact; the AI is <em>atmospheric</em>.</p>
           <p>Why? Because training data includes thousands of horror novels, each pattern-matching "scary forest house" to ominous prose.</p>`
  },
  explicit: {
    title: 'Implicit becomes explicit',
    body: `<p>Folktales rely on <strong>implication</strong>. "The bird said: be bold, but not too bold" — the audience fills in why. The original doesn't explain the bird's motivation or the protagonist's feelings.</p>
           <p>The AI retelling adds inner monologue: <em>"She felt a chill run down her spine as the bird's warning echoed in her mind, a nagging sense that something was terribly wrong..."</em></p>
           <p>The machine explains what should be felt. Human storytellers trust the listener to feel it.</p>`
  },
  scenic: {
    title: 'Less ambiguous scenes',
    body: `<p>In Karen's 1847 version, the house is just "a beautiful house." The forest is just "the forest." These locations are scaffolding — the listener imagines their own.</p>
           <p>The AI version anchors every scene: <em>"a grand Victorian mansion with ivy creeping up the weathered stone walls, surrounded by ancient oak trees whose gnarled branches reached toward the moonlit sky."</em></p>
           <p>It's vivid, but it removes the listener's imagination. The tale becomes a movie pitch, not a folktale.</p>`
  },
  floating: {
    title: 'Floating motifs',
    body: `<p>The AI mixes motifs from different folktales — pieces of <em>Bluebeard</em>, <em>Hansel & Gretel</em>, <em>East of the Sun</em> — all stories that sit close together in its training data.</p>
           <p>A typical AI retelling adds a trail of breadcrumbs (from Hansel), a locked forbidden room (from Bluebeard), and a mysterious helper animal (from many tales). None of these belong in "The Sweetheart in the Forest."</p>
           <p>Folklorist Lauri Honko called the shared reservoir of oral tradition the <strong>"pool of tradition."</strong> AI swims in the same pool — but without knowing which drops go with which story.</p>`
  }
};

const KEYWORD_RESPONSES = [
  { keys: ['xp', 'level', 'experience'], reply: 'Earn XP by exploring rooms and reading panels. Each discovery counts!' },
  { keys: ['cdn', 'centre', 'narrative'], reply: 'CDN is the Centre for Digital Narrative at UiB — we study how digital tech shapes stories.' },
  { keys: ['arcade', 'game'],             reply: 'The arcades hold interactive CDN research. Click them to fly in!' },
  { keys: ['book', 'tome', 'lore', 'codex'], reply: 'Ah, the Codex! Visit the magical pedestal in the corner to read its secrets.' },
  { keys: ['globe', 'world', 'map'],      reply: 'The desk globe shows CDN\'s international research connections.' },
  { keys: ['hi', 'hello', 'hey'],         reply: 'Hello, curious visitor! Ask me anything about this gallery.' }
];

export function answer(question) {
  const q = question.toLowerCase();
  for (const { keys, reply } of KEYWORD_RESPONSES) {
    if (keys.some(k => q.includes(k))) return reply;
  }
  return "I'm still learning about that one. Try asking about XP, CDN, the arcades, or the magical book!";
}

export function getNextPageIndex(current) {
  return Math.min(current + 1, BOOK_PAGES.length - 1);
}

export function getPrevPageIndex(current) {
  return Math.max(current - 1, 0);
}

export function createUI(camera, renderer, controls, scene) {
  // Helper: unlock pointer when opening overlays, re-lock when closing
  function unlockForOverlay() {
    // Free cursor — no pointer lock to manage
  }
  function relockAfterOverlay() {
    const sb = document.getElementById('stepback-btn');
    if (sb) sb.classList.add('hidden');
    panelDrawer.classList.remove('open');
    setTimeout(() => panelDrawer.classList.add('hidden'), 350);
    try { controls.lock(); } catch { /* browser may refuse if no user gesture */ }
  }
  const breadcrumb       = document.getElementById('breadcrumb');
  const panelDrawer      = document.getElementById('panel-drawer');
  const drawerContent    = document.getElementById('drawer-content');
  const drawerClose      = document.getElementById('drawer-close');
  const gatekeeperChat   = document.getElementById('gatekeeper-chat');
  const chatMessages     = document.getElementById('chat-messages');
  const chatChips        = document.getElementById('chat-chips');
  const chatClose        = document.getElementById('chat-close');
  const inventoryOverlay = document.getElementById('inventory-overlay');
  const inventoryClose   = document.getElementById('inventory-close');
  const inventoryContent = document.getElementById('inventory-content');
  // ── HUD ──────────────────────────────────────────
  function updateHUD(hotspotId) {
    breadcrumb.textContent = 'CDN GALLERY';
  }

  updateHUD('overview');

  // ── Panel drawer ─────────────────────────────────
  function openPanelDrawer(panelId, title) {
    const safeTitle = escapeHtml(title);
    let content = '';

    if (panelId === 'globe') {
      content = `
        <h2>${safeTitle}</h2>
        <p>The CDN globe showcases international research connections. Explore one of our featured works:</p>
        <div style="background:rgba(13,33,55,0.5);border:1px solid #a8d8ea;border-radius:8px;padding:16px;margin:16px 0">
          <h3 style="color:#e84393;font-size:16px;margin-bottom:8px">Fin du Monde</h3>
          <p style="font-size:13px">An interactive digital narrative exploring themes of endings and new beginnings, part of the CDN collection.</p>
          <a href="https://collection.cdn.uib.no/2024/05/10/fin-du-monde/" target="_blank" rel="noopener"
             style="display:inline-block;margin-top:10px;padding:8px 16px;background:#e84393;color:#0d2137;border-radius:4px;text-decoration:none;font-size:13px;font-weight:bold">
            Visit CDN Collection →
          </a>
        </div>
        <p>CDN — the Centre for Digital Narrative at UiB — connects researchers across the globe studying digital storytelling.</p>
      `;
    } else if (panelId === 'tv') {
      content = `
        <h2>${safeTitle}</h2>
        <p>This screen shows a video from the Centre for Digital Narrative. Use the YouTube controls to unmute and watch with sound.</p>
        <p>The CDN produces video content showcasing research, events, and creative digital narratives.</p>
      `;
    } else if (panelId === 'ai-cinema') {
      content = `
        <h2>${safeTitle}</h2>
        <p>An Eye for AI Cinema is a CDN event series exploring the intersection of artificial intelligence and filmmaking.</p>
        <p>How is AI changing the way we create, edit, and experience cinema? From deepfakes to generative storytelling, this series examines the frontiers of computational creativity in film.</p>
        <div style="background:rgba(13,33,55,0.5);border:1px solid #a8d8ea;border-radius:8px;padding:16px;margin:16px 0">
          <p style="font-size:13px;margin-bottom:10px">Hosted by the Centre for Digital Narrative at the University of Bergen.</p>
          <a href="https://www4.uib.no/en/research/research-centres/center-for-digital-narrative/events/an-eye-for-ai-cinema" target="_blank" rel="noopener"
             style="display:inline-block;padding:8px 16px;background:#e84393;color:#0d2137;border-radius:4px;text-decoration:none;font-size:13px;font-weight:bold">
            View Event Details →
          </a>
        </div>
      `;
    } else if (panelId === 'poster-0') {
      content = `
        <h2>Neural Networks</h2>
        <p>Neural networks are computing systems inspired by biological brains — interconnected nodes that learn patterns from data.</p>
        <p>At CDN, researchers study how neural networks are transforming storytelling: from generating text and images to creating interactive narratives that adapt to their audience.</p>
        <p>How does a network of artificial neurons learn to tell a story? And what kind of stories does it choose to tell?</p>
      `;
    } else if (panelId === 'poster-1') {
      content = `
        <h2>Machine Learning</h2>
        <p>Machine learning enables computers to improve at tasks through experience — without being explicitly programmed for each step.</p>
        <p>CDN explores how ML models trained on vast corpora of human writing develop their own "style" — and what gets lost or transformed when algorithms learn from our collective creative output.</p>
        <p>Can a machine truly learn creativity, or does it only learn to imitate it?</p>
      `;
    } else if (panelId === 'poster-2') {
      content = `
        <h2>Synthetic Storytellers</h2>
        <p>When AI generates stories, who is the author? The programmer, the training data, or the machine itself?</p>
        <p>CDN researcher Anne Sigrid Refsum studied what happens when LLMs retell Norwegian folktales — they mix motifs from different traditions, add modern moral lessons, and lose cultural specificity.</p>
        <p>Read the full research in the magical book on the pedestal.</p>
      `;
    } else if (panelId === 'floating-motifs') {
      content = `
        <h2>${safeTitle}</h2>
        <p style="font-size:15px;color:#9ce0ff;margin-bottom:14px;font-style:italic">The holographic heart of the AI room.</p>
        <p>Folklorist Lauri Honko called the shared reservoir of oral tradition the <strong>pool of tradition</strong>. When a large language model retells a folktale, it swims in that pool — but without knowing which drops belong to which story.</p>
        <p>A trail of breadcrumbs from <em>Hansel &amp; Gretel</em> shows up in <em>The Sweetheart in the Forest</em>. A forbidden locked room from <em>Bluebeard</em> drifts into <em>East of the Sun</em>. A helper animal from one tale appears in another. These recurring images are <strong>floating motifs</strong> — pieces that travel between tales.</p>
        <p>CDN researcher Anne Sigrid Refsum's work examines what happens when AI treats the pool of tradition as one big soup, remixing motifs without cultural context.</p>
        <div style="background:rgba(13,33,55,0.5);border:1px solid #a8d8ea;border-radius:8px;padding:14px;margin-top:16px">
          <p style="font-size:13px;margin:0"><strong>Read the full research</strong> in the magical book on the pedestal.</p>
        </div>
      `;
    } else if (panelId === 'portal') {
      content = `
        <h2>Portal</h2>
        <p style="font-size:16px;color:#00d4ff;margin-bottom:16px">🚀 New rooms are being constructed...</p>
        <p>This portal will lead to new AI research rooms in future updates. Each room will explore a different aspect of digital narrative and AI creativity.</p>
        <div style="background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:8px;padding:16px;margin:16px 0">
          <p style="font-size:14px;margin-bottom:8px"><strong>Coming Soon:</strong></p>
          <p style="font-size:13px">🌿 The Garden Room — Digital ecology &amp; environmental storytelling</p>
          <p style="font-size:13px">🎵 The Music Studio — Sound design &amp; audio narratives</p>
          <p style="font-size:13px">📚 The Library — Archives of digital literature</p>
        </div>
      `;
    } else if (panelId === 'video-more-info') {
      const info = window.__currentVideoMoreInfo;
      const body = info?.body ?? '';
      content = `
        <h2>${safeTitle}</h2>
        <div style="line-height:1.75;font-size:14px">${body.replace(/\n\n/g, '<br><br>')}</div>
      `;
    } else {
      content = `
        <h2>${safeTitle}</h2>
        <p>This exhibit explores <strong>${safeTitle}</strong> as part of CDN's research into digital narratives and AI-driven storytelling.</p>
        <p>The Centre for Digital Narrative at the University of Bergen studies how computational technologies shape the stories we tell and experience.</p>
      `;
    }

    drawerContent.innerHTML = content;
    panelDrawer.classList.remove('hidden');
    requestAnimationFrame(() => panelDrawer.classList.add('open'));
    unlockForOverlay();
  }

  function closePanelDrawer() {
    panelDrawer.classList.remove('open');
    setTimeout(() => panelDrawer.classList.add('hidden'), 350);
    relockAfterOverlay();
  }

  drawerClose.addEventListener('click', closePanelDrawer);

  // ── Gatekeeper chat (speech bubble + free-form input) ──
  const SUGGESTED_QUESTIONS = [
    "What's in this room?",
    "How do I earn XP?",
    "Tell me about CDN"
  ];

  const chatInput = document.getElementById('chat-input');
  const chatSend  = document.getElementById('chat-send');

  function appendChatMessage(text, role) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function sendChatMessage(text) {
    if (!text.trim()) return;
    appendChatMessage(text, 'user');
    appendChatMessage(answer(text), 'gatekeeper');
  }

  function openGatekeeperChat() {
    chatMessages.innerHTML = '';
    appendChatMessage("Hey Kids! Welcome to the CDN gallery! What are you curious about?", 'gatekeeper');

    chatChips.innerHTML = SUGGESTED_QUESTIONS.map(q =>
      `<button class="chat-chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`
    ).join('');

    chatChips.querySelectorAll('.chat-chip').forEach(chip => {
      chip.addEventListener('click', () => sendChatMessage(chip.dataset.q));
    });

    gatekeeperChat.classList.remove('hidden');
    requestAnimationFrame(() => gatekeeperChat.classList.add('open'));
  }

  function closeGatekeeperChat() {
    gatekeeperChat.classList.remove('open');
    setTimeout(() => gatekeeperChat.classList.add('hidden'), 300);
  }

  chatClose.addEventListener('click', closeGatekeeperChat);

  // ── Intro sequence (first-visit welcome; see docs/superpowers/specs/…) ──
  let isIntroPlaying = false;

  function renderIntroChips() {
    chatChips.innerHTML = SUGGESTED_QUESTIONS.map(q =>
      `<button class="chat-chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`
    ).join('');
    chatChips.querySelectorAll('.chat-chip').forEach(chip => {
      chip.addEventListener('click', () => sendChatMessage(chip.dataset.q));
    });
  }

  async function playIntro() {
    const chatHeaderName = document.getElementById('chat-header-name');
    const originalName = chatHeaderName?.textContent ?? 'The Guide';

    chatMessages.innerHTML = '';
    chatChips.innerHTML = '';
    isIntroPlaying = true;
    gatekeeperChat.classList.add('intro-mode');
    if (chatHeaderName) chatHeaderName.textContent = 'Jason';
    gatekeeperChat.classList.remove('hidden');
    requestAnimationFrame(() => gatekeeperChat.classList.add('open'));

    await runIntroDialogue({ script: INTRO_SCRIPT });

    // Fade out while still in intro-mode so the normal guide chat doesn't
    // flash during the 300ms opacity transition. Reset after hidden.
    isIntroPlaying = false;
    gatekeeperChat.classList.remove('open');
    setTimeout(() => {
      gatekeeperChat.classList.add('hidden');
      gatekeeperChat.classList.remove('intro-mode');
      if (chatHeaderName) chatHeaderName.textContent = originalName;
      renderIntroChips();
    }, 300);
  }

  chatSend.addEventListener('click', () => {
    if (isIntroPlaying) return;
    sendChatMessage(chatInput.value);
    chatInput.value = '';
  });
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (isIntroPlaying) return;
      sendChatMessage(chatInput.value);
      chatInput.value = '';
    }
  });

  // ── Inventory overlay ────────────────────────────
  function openInventory() {
    inventoryContent.innerHTML = `
      <div class="scrapbook">
        <div class="scrapbook-page scrapbook-left">
          <h2 class="scrapbook-title">The Game Room</h2>
          <div class="polaroid">
            <div class="polaroid-img" style="background:#1a1a3e;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:32px">🎮</span>
            </div>
            <div class="polaroid-caption">My exploration so far</div>
          </div>
          <div class="sticky-note">
            <h3>Tasks</h3>
            <ul>
              <li>Explore the game room</li>
              <li>Read the wall panels</li>
              <li>Visit the rabbit hole</li>
              <li>Talk to the Guide</li>
            </ul>
          </div>
          <div class="sticky-note settings-stickynote">
            <h3>Settings</h3>
            <label class="sky-toggle" aria-label="Toggle day or night sky">
              <span class="sky-toggle-label">Sky</span>
              <span class="sky-toggle-pill">
                <span class="sky-toggle-icon sky-toggle-sun" aria-hidden="true">☀</span>
                <input type="checkbox" class="sky-toggle-input" id="sky-mode-checkbox" />
                <span class="sky-toggle-knob"></span>
                <span class="sky-toggle-icon sky-toggle-moon" aria-hidden="true">🌙</span>
              </span>
            </label>
          </div>
          <div class="scrapbook-doodle" style="position:absolute;bottom:20px;right:20px;font-size:24px;transform:rotate(-8deg);opacity:0.5">✨</div>
        </div>
        <div class="scrapbook-spine"></div>
        <div class="scrapbook-page scrapbook-right">
          <h2 class="scrapbook-title">Discoveries</h2>
          <div class="discovery-grid">
            <div class="discovery-item found">
              <div class="discovery-thumb">🏛</div>
              <div class="discovery-label">Game Room</div>
            </div>
            <div class="discovery-item found">
              <div class="discovery-thumb">📺</div>
              <div class="discovery-label">TV Archive</div>
            </div>
            <div class="discovery-item">
              <div class="discovery-thumb">?</div>
              <div class="discovery-label">???</div>
            </div>
            <div class="discovery-item">
              <div class="discovery-thumb">?</div>
              <div class="discovery-label">???</div>
            </div>
          </div>
          <div class="scrapbook-page-num">1 / 20</div>
          <div class="scrapbook-tabs">
            <button class="scrapbook-tab">🏆 Achievements</button>
            <button class="scrapbook-tab">👤 Profile</button>
            <button class="scrapbook-tab">📚 Resources</button>
            <button class="scrapbook-tab">🌐 CDN Website</button>
          </div>
        </div>
      </div>
    `;
    // Reflect current sky mode and wire the checkbox
    const skyCheckbox = inventoryContent.querySelector('#sky-mode-checkbox');
    if (skyCheckbox) {
      skyCheckbox.checked = getSkyMode() === 'night';
      skyCheckbox.addEventListener('change', () => {
        const nextMode = skyCheckbox.checked ? 'night' : 'day';
        setSkyMode(nextMode);
        applySkyMode(scene, nextMode);
      });
    }
    inventoryOverlay.classList.remove('hidden');
  }

  function isInventoryOpen() {
    return !inventoryOverlay.classList.contains('hidden');
  }

  function isAnyOtherOverlayOpen() {
    return (
      !panelDrawer.classList.contains('hidden') ||
      !gatekeeperChat.classList.contains('hidden') ||
      !bookOverlay.classList.contains('hidden') ||
      !rhOverlay.classList.contains('hidden') ||
      !reportOverlay.classList.contains('hidden') ||
      !fdmOverlay.classList.contains('hidden') ||
      !globeVideosOverlay.classList.contains('hidden')
    );
  }

  function toggleInventory() {
    if (isInventoryOpen()) {
      closeInventory();
      return;
    }
    if (isAnyOtherOverlayOpen()) return;
    // Release pointer lock before showing the overlay — same behavior the
    // old Inventory button had (`controls.unlock(); openInventory();`).
    controls.unlock();
    openInventory();
  }

  function closeInventory() {
    const wasOpen = !inventoryOverlay.classList.contains('hidden');
    inventoryOverlay.classList.add('hidden');
    if (!wasOpen) return;
    window.__hideFPOverlay?.();
    window.__relockControls?.();
  }

  inventoryClose.addEventListener('click', closeInventory);
  inventoryOverlay.addEventListener('click', (e) => {
    if (e.target === inventoryOverlay) closeInventory();
  });

  // ── Book overlay ─────────────────────────────────
  const bookOverlay  = document.getElementById('book-overlay');
  const bookPageL    = document.getElementById('book-page-left');
  const bookPageR    = document.getElementById('book-page-right');
  const bookPrev     = document.getElementById('book-prev');
  const bookNext     = document.getElementById('book-next');
  const bookClose    = document.getElementById('book-close');

  let bookPageIndex = 0;

  function spawnBookParticles() {
    bookOverlay.querySelectorAll('.book-particle').forEach(p => p.remove());
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'book-particle';
      p.style.left = (Math.random() * 100) + '%';
      p.style.bottom = (Math.random() * -20) + '%';
      p.style.animationDuration = (10 + Math.random() * 10) + 's';
      p.style.animationDelay = (Math.random() * -20) + 's';
      p.style.setProperty('--drift', ((Math.random() - 0.5) * 100) + 'px');
      p.style.width = p.style.height = (4 + Math.random() * 6) + 'px';
      bookOverlay.appendChild(p);
    }
  }

  function clearBookParticles() {
    bookOverlay.querySelectorAll('.book-particle').forEach(p => p.remove());
  }

  function clearPageBackgrounds() {
    bookPageL.style.backgroundImage = '';
    bookPageR.style.backgroundImage = '';
  }

  function renderCoverPage() {
    bookPageL.classList.remove('book-page-alive');
    bookPageR.classList.remove('book-page-alive');
    clearPageBackgrounds();
    bookPageL.innerHTML = `
      <div class="book-cover-left">
        <svg class="cover-figure" viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <!-- Ground -->
          <path d="M10 180 Q40 172 60 178 T112 178 L112 182 L10 182 Z" fill="#1a1a1a" opacity="0.85"/>
          <path d="M14 184 L108 184" stroke="#1a1a1a" stroke-width="1" opacity="0.5"/>
          <!-- Grass tufts -->
          <path d="M20 180 l2 -6 M24 180 l1 -4 M30 182 l2 -5 M80 180 l1 -5 M86 182 l2 -6 M94 181 l1 -4" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
          <!-- Staff -->
          <line x1="78" y1="50" x2="80" y2="180" stroke="#1a1a1a" stroke-width="2"/>
          <!-- Body silhouette -->
          <path d="M50 60
                   Q46 58 46 52 Q46 42 54 40 Q62 38 66 46 Q68 52 64 58
                   L66 68
                   L76 72 L82 80 L80 100 L76 108
                   L78 140 L76 170 L72 180
                   L58 180 L54 168 L50 140
                   L46 120 L44 100 L42 88
                   L40 78 L44 70 L50 66 Z"
                fill="#1a1a1a"/>
          <!-- Hat -->
          <path d="M40 44 Q46 38 56 38 Q66 38 70 44 L72 46 L38 46 Z" fill="#1a1a1a"/>
          <path d="M36 46 L74 46" stroke="#1a1a1a" stroke-width="2"/>
          <!-- Satchel -->
          <path d="M52 90 L68 90 L72 108 L48 108 Z" fill="#1a1a1a"/>
          <path d="M52 90 Q60 82 68 90" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
        </svg>
      </div>
    `;
    bookPageR.innerHTML = `
      <div class="book-cover-right">
        <h1 class="cover-title">
          <span class="cover-title-line">Once</span>
          <span class="cover-title-line">upon</span>
          <span class="cover-title-line">a</span>
          <span class="cover-title-line">Time</span>
        </h1>
      </div>
    `;
  }

  // Interactive state: 'start' | 'folklore' | 'deviation' | 'methodology'
  let bookTopic = 'start';
  let deviationSelectedKey = null;

  function renderStartState() {
    bookPageL.classList.remove('book-page-alive');
    bookPageR.classList.remove('book-page-alive');
    clearPageBackgrounds();
    bookPageL.innerHTML = `
      <div class="book-intro">
        <h2>What would happen if you asked a large language model to tell you a well known norwegian folktale?</h2>
        <p>This research explores how large language models (LLMs) generate and reshape stories, and how they tend to overuse and mix recurring narrative elements, known as &ldquo;floating motifs.&rdquo;</p>
        <p>To avoid influencing the results, the models were given no extra context and only simple prompts like: &ldquo;Tell the folktale &lsquo;The Sweetheart in the Forest.&rsquo;&rdquo;</p>
        <p>Explore the magic book and experience how an LLM tells the story.</p>
      </div>
    `;
    bookPageR.innerHTML = `
      <div class="book-topics">
        <h2 class="topics-heading">Choose a topic to explore further</h2>
        <button class="book-big-btn" data-action="go-folklore">
          What is the original folkelore like?
        </button>
        <button class="book-big-btn" data-action="go-deviation">
          What mistakes does AI do when retelling the folklore?
        </button>
        <button class="book-big-btn" data-action="go-methodology">
          How was the research done?
        </button>
      </div>
    `;
  }

  function renderFolklorePage() {
    bookPageL.classList.remove('book-page-alive');
    bookPageR.classList.remove('book-page-alive');
    clearPageBackgrounds();
    bookPageL.innerHTML = `
      <div class="book-deviation">
        <h2>The Sweetheart in the Forest</h2>
        <p class="book-body">A young woman was so beautiful that suitors came from across many kingdoms. One man — rich and handsome — won her heart.</p>
        <p class="book-body">He invited her to his house in the forest, promising to scatter peas along the path. But he scattered them a day too early. She arrived while he was still away.</p>
        <p class="book-body">Inside the beautiful house: only a strange bird in a cage that cried <em>"Beautiful maiden, be bold — but be not too bold!"</em></p>
        <p class="book-body">Room by room she explored. Rich rooms, stranger rooms, then one filled with buckets of blood, and last — a chamber of bones and the bodies of slain women.</p>
        <p class="book-body">The bird told her to hide. She watched from under the bed as her suitor returned with his next victim. She escaped, told the authorities, and the tale ended:</p>
        <p class="book-quote">"They seized him and killed him and burned both him and the house in the forest."</p>
        <button class="book-back-btn" data-action="go-start">Go back</button>
      </div>
    `;
    bookPageR.innerHTML = `
      <div class="book-folklore-right">
        <div class="folklore-image folklore-image-1">
          <div class="folklore-caption">The maiden approaches the house in the forest</div>
        </div>
        <div class="folklore-image folklore-image-2">
          <div class="folklore-caption">Rich rooms, and the caged bird that warns her</div>
        </div>
        <p class="folklore-note">AI-generated illustrations based on the 1847 folktale recorded from Karen.</p>
      </div>
    `;
  }

  function renderDeviationPage(selectedKey) {
    bookPageL.classList.remove('book-page-alive');
    bookPageR.classList.remove('book-page-alive');
    clearPageBackgrounds();
    const points = [
      { key: 'creepier', label: 'The AI version is told in a "creepier" way.' },
      { key: 'explicit', label: 'The AI version has a tendency to make the implicit more explicit.' },
      { key: 'scenic',   label: 'The AI is less ambiguous when describing the scenic elements.' },
      { key: 'floating', label: 'The use of "Floating motifs" and imagery.' }
    ];

    const rowsHTML = points.map(p => `
      <div class="dive-row">
        <p class="dive-label">${p.label}</p>
        <button class="dive-btn ${selectedKey === p.key ? 'active' : ''}" data-action="dive" data-key="${p.key}">Dive deeper</button>
      </div>
    `).join('');

    bookPageL.innerHTML = `
      <div class="book-deviation">
        <h2>What makes the AI version of the story deviate from the original?</h2>
        <div class="dive-rows">${rowsHTML}</div>
        <button class="book-back-btn" data-action="go-start">Go back</button>
      </div>
    `;

    const content = selectedKey && DIVE_DEEPER_CONTENT[selectedKey]
      ? `<div class="dive-content"><h3>${DIVE_DEEPER_CONTENT[selectedKey].title}</h3>${DIVE_DEEPER_CONTENT[selectedKey].body}</div>`
      : `<div class="dive-placeholder">Choose a point to dive deeper into…</div>`;
    bookPageR.innerHTML = `<div class="book-deviation-right">${content}</div>`;
  }

  function renderMethodologyPage() {
    bookPageL.classList.remove('book-page-alive');
    bookPageR.classList.remove('book-page-alive');
    clearPageBackgrounds();
    bookPageL.innerHTML = `
      <div class="book-deviation">
        <h2>How was the research done?</h2>
        <p class="book-body">32 Tales where generated using different LLM&rsquo;s, at different times, without any prior context. The prompts used where simple and short, as to not cause interference with how the LLM would tell the stories. The prompts were as follows:</p>
        <ul class="book-bullets">
          <li>&ldquo;Fortell eventyret &lsquo;Kjæresten i skogen&rsquo;&rdquo;, or the relatively similar &ldquo;Fortell det norske folkeeventyret &lsquo;Kjæresten i skogen&rsquo;&rdquo; (Literal translation: &ldquo;Tell the folktale &lsquo;The Sweetheart in the forest&rsquo;&rdquo;, &ldquo;Tell the Norwegian folktale &lsquo;The Sweetheart in the Forest&rsquo;&rdquo;).</li>
        </ul>
        <button class="book-back-btn" data-action="go-start">Go back</button>
      </div>
    `;
    bookPageR.innerHTML = `
      <div class="book-deviation-right book-methodology-right">
        <ul class="book-bullets">
          <li>&ldquo;Fortell en norsk versjon av eventyrtypen ATU 955&rdquo; (Literal translation: &ldquo;Tell a Norwegian version of the folktale type ATU 955&rdquo;).</li>
        </ul>
      </div>
    `;
  }

  function renderBookPage() {
    const imgPath = (import.meta.env.BASE_URL || '/') + 'book/' + BOOK_PAGES[bookPageIndex].image;
    bookPageL.innerHTML = '';
    bookPageR.innerHTML = '';
    bookPageL.style.backgroundImage = `url("${imgPath}")`;
    bookPageL.style.backgroundSize = '200% 100%';
    bookPageL.style.backgroundPosition = 'left center';
    bookPageL.style.backgroundRepeat = 'no-repeat';
    bookPageR.style.backgroundImage = `url("${imgPath}")`;
    bookPageR.style.backgroundSize = '200% 100%';
    bookPageR.style.backgroundPosition = 'right center';
    bookPageR.style.backgroundRepeat = 'no-repeat';
    bookPrev.disabled = bookPageIndex === 0;
    bookNext.disabled = bookPageIndex === BOOK_PAGES.length - 1;
  }

  function goToInteractive(topic, direction = 'next') {
    const idx = BOOK_PAGES.findIndex(p => p.type === 'interactive');
    if (idx >= 0) bookPageIndex = idx;
    animatePageFlip(direction, () => {
      bookTopic = topic;
      deviationSelectedKey = null;
      renderBookPage();
    });
  }

  // Delegate clicks inside the book pages — image spreads have no interactive elements
  function handleBookPageClick(_e) {
    // no-op for image pages
  }
  bookPageL.addEventListener('click', handleBookPageClick);
  bookPageR.addEventListener('click', handleBookPageClick);

  function openBook() {
    bookPageIndex = 0;
    bookTopic = 'start';
    deviationSelectedKey = null;
    renderBookPage();
    bookOverlay.classList.remove('hidden');
    spawnBookParticles();
    unlockForOverlay();
  }

  function closeBook() {
    const wasOpen = !bookOverlay.classList.contains('hidden');
    clearBookParticles();
    bookOverlay.classList.add('hidden');
    relockAfterOverlay();
    if (!wasOpen) return; // book wasn't open — skip relock/fallback
    window.__relockControls?.();
    // Fallback: if the browser rejected the pointer-lock request, show the
    // re-engage overlay so the user isn't left with a frozen cursor.
    setTimeout(() => {
      if (window.__isControlsLocked?.() === false) {
        window.__showFPOverlay?.();
      }
    }, 300);
  }

  let isFlipping = false;
  // Two-stage book flip:
  //   Phase 1: the "outgoing" page rotates away toward the spine (~0→90°)
  //   Phase 2: the "incoming" page rotates in from the spine back to flat
  function animatePageFlip(direction, onMidpoint) {
    if (isFlipping) return;
    isFlipping = true;

    const PHASE_MS = 320;
    const outEl = direction === 'next' ? bookPageR : bookPageL;
    const inEl  = direction === 'next' ? bookPageL : bookPageR;
    const outClass = direction === 'next' ? 'flipping-out-right' : 'flipping-out-left';
    const inClass  = direction === 'next' ? 'flipping-in-left'   : 'flipping-in-right';

    outEl.classList.add(outClass);

    setTimeout(() => {
      outEl.classList.remove(outClass);
      onMidpoint();
      requestAnimationFrame(() => {
        inEl.classList.add(inClass);
      });
    }, PHASE_MS);

    setTimeout(() => {
      inEl.classList.remove(inClass);
      isFlipping = false;
    }, PHASE_MS * 2);
  }

  function flipPage(direction) {
    const newIndex = direction === 'next' ? getNextPageIndex(bookPageIndex) : getPrevPageIndex(bookPageIndex);
    if (newIndex === bookPageIndex) return;
    animatePageFlip(direction, () => {
      bookPageIndex = newIndex;
      renderBookPage();
    });
  }

  bookPrev.addEventListener('click', () => flipPage('prev'));
  bookNext.addEventListener('click', () => flipPage('next'));
  bookClose.addEventListener('click', closeBook);
  bookOverlay.addEventListener('click', (e) => { if (e.target === bookOverlay) closeBook(); });

  // ── PDF Report viewer ───────────────────────────
  const reportOverlay = document.getElementById('report-overlay');
  const reportClose   = document.getElementById('report-close');

  function openReport() {
    reportOverlay.classList.remove('hidden');
    unlockForOverlay();
  }

  function closeReport() {
    reportOverlay.classList.add('hidden');
    relockAfterOverlay();
  }

  reportClose.addEventListener('click', closeReport);
  reportOverlay.addEventListener('click', (e) => { if (e.target === reportOverlay) closeReport(); });

  // ── Globe videos overlay ─────────────────────────
  const globeVideosOverlay    = document.getElementById('globe-videos-overlay');
  const globeVideosClose      = document.getElementById('globe-videos-close');
  const globeVideoIframes     = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => document.getElementById(`globe-video-${n}`));
  const globeVideosStartScreen = document.getElementById('globe-videos-start-screen');
  const globeVideosStartBtn   = document.getElementById('globe-videos-start-btn');
  const globeVideosColumns    = document.getElementById('globe-videos-columns');

  let _onGlobeStart = null;
  let _globeStarted = false;

  function openGlobeVideos(onStart) {
    _onGlobeStart = onStart || null;
    if (_globeStarted) {
      globeVideosStartScreen.classList.add('hidden');
      globeVideosColumns.classList.remove('hidden');
      for (const iframe of globeVideoIframes) iframe.src = iframe.dataset.src;
    } else {
      globeVideosStartScreen.classList.remove('hidden');
      globeVideosColumns.classList.add('hidden');
    }
    globeVideosOverlay.classList.remove('hidden');
    unlockForOverlay();
  }

  globeVideosStartBtn.addEventListener('click', () => {
    _globeStarted = true;
    globeVideosStartScreen.classList.add('hidden');
    globeVideosColumns.classList.remove('hidden');
    for (const iframe of globeVideoIframes) iframe.src = iframe.dataset.src;
    if (_onGlobeStart) { _onGlobeStart(); _onGlobeStart = null; }
  });

  function closeGlobeVideos() {
    for (const iframe of globeVideoIframes) iframe.src = '';
    globeVideosOverlay.classList.add('hidden');
    relockAfterOverlay();
  }

  globeVideosClose.addEventListener('click', closeGlobeVideos);
  globeVideosOverlay.addEventListener('click', (e) => { if (e.target === globeVideosOverlay) closeGlobeVideos(); });

  // ── Fin du Monde overlay ────────────────────────
  const fdmOverlay = document.getElementById('findumonde-overlay');
  const fdmClose   = document.getElementById('findumonde-close');

  function openFinDuMonde() {
    fdmOverlay.classList.remove('hidden');
    unlockForOverlay();
  }

  function closeFinDuMonde() {
    fdmOverlay.classList.add('hidden');
    relockAfterOverlay();
  }

  fdmClose.addEventListener('click', closeFinDuMonde);
  fdmOverlay.addEventListener('click', (e) => { if (e.target === fdmOverlay) closeFinDuMonde(); });

  // ── Rabbit hole scrollytelling ──────────────────
  const rhOverlay     = document.getElementById('rabbit-hole-overlay');
  const rhClimbBack   = document.getElementById('rh-climb-back');
  const rhAchievement = document.getElementById('rh-achievement');
  const rhSections    = document.querySelectorAll('.rh-section');
  let rhAchievementUnlocked = false;

  function openRabbitHole() {
    rhOverlay.classList.remove('hidden');
    rhOverlay.scrollTop = 0;
    unlockForOverlay();
    // Reset section visibility
    rhSections.forEach(s => s.classList.remove('visible'));
    // Start observing sections for scroll-based reveal
    setTimeout(checkRHSections, 100);
  }

  function closeRabbitHole() {
    rhOverlay.classList.add('hidden');
    relockAfterOverlay();
  }

  function checkRHSections() {
    const scrollY = rhOverlay.scrollTop;
    const viewH = rhOverlay.clientHeight;

    rhSections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const overlayRect = rhOverlay.getBoundingClientRect();
      const sectionTop = rect.top - overlayRect.top;
      if (sectionTop < viewH * 0.8) {
        section.classList.add('visible');
      }
    });

    // Check if user scrolled to the final section
    const lastSection = rhSections[rhSections.length - 1];
    if (lastSection && lastSection.classList.contains('visible') && !rhAchievementUnlocked) {
      rhAchievementUnlocked = true;
      rhAchievement.classList.remove('hidden');
    }
  }

  rhOverlay.addEventListener('scroll', checkRHSections);
  rhClimbBack.addEventListener('click', closeRabbitHole);

  // ── Global keyboard shortcuts ────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (window.__isAtTV?.()) return; // TV handles its own ESC — don't trigger relock
      closePanelDrawer();
      closeGatekeeperChat();
      closeInventory();
      closeBook();
      closeRabbitHole();
      closeReport();
      closeFinDuMonde();
      closeGlobeVideos();
      return;
    }

    // "E" toggles the inventory, but not while the user is typing.
    if (e.key === 'e' || e.key === 'E') {
      if (e.repeat) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      toggleInventory();
    }
  });

  function updateHints() {
    // No-op in first person mode
  }

  return {
    updateHUD,
    openPanelDrawer,
    openGatekeeperChat,
    playIntro,
    openInventory,
    openBook,
    openRabbitHole,
    openReport,
    openFinDuMonde,
    openGlobeVideos,
    updateHints,
    toggleInventory,
    isInventoryOpen,
  };
}
