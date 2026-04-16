// src/ui.js

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  { image: 'bok-12.jpg' },
  { type: 'intro' },
  { type: 'deviation' }
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

export function createUI(camera, renderer, controls) {
  // Helper: unlock pointer when opening overlays, re-lock when closing
  function unlockForOverlay() {
    // Free cursor — no pointer lock to manage
  }
  function relockAfterOverlay() {
    // Hide step-back button and close panel drawer
    const sb = document.getElementById('stepback-btn');
    if (sb) sb.classList.add('hidden');
    panelDrawer.classList.remove('open');
    setTimeout(() => panelDrawer.classList.add('hidden'), 350);
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
  chatSend.addEventListener('click', () => {
    sendChatMessage(chatInput.value);
    chatInput.value = '';
  });
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
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
    inventoryOverlay.classList.remove('hidden');
  }

  function closeInventory() {
    inventoryOverlay.classList.add('hidden');
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

  function clearPageBackgrounds() {
    bookPageL.style.backgroundImage = '';
    bookPageR.style.backgroundImage = '';
  }

  function renderImagePage(image) {
    const imgPath = (import.meta.env.BASE_URL || '/') + 'book/' + image;
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
  }

  function renderIntroPage() {
    clearPageBackgrounds();
    bookPageL.innerHTML = `
      <div class="book-intro">
        <h2>Want to dig deeper?</h2>
        <p>You've read the story. Now let's look at what AI does differently when retelling folklore like this one.</p>
        <p>Based on research by <strong>Anne Sigrid Refsum</strong><br>Centre for Digital Narrative, University of Bergen</p>
      </div>
    `;
    bookPageR.innerHTML = `
      <div class="book-intro-right">
        <button class="book-big-btn" data-action="go-deviation">
          What mistakes does AI do<br>when retelling the folklore?
        </button>
      </div>
    `;
  }

  function renderDeviationPage(selectedKey) {
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
        <button class="book-back-btn" data-action="go-intro">Go back</button>
      </div>
    `;

    const content = selectedKey && DIVE_DEEPER_CONTENT[selectedKey]
      ? `<div class="dive-content"><h3>${DIVE_DEEPER_CONTENT[selectedKey].title}</h3>${DIVE_DEEPER_CONTENT[selectedKey].body}</div>`
      : `<div class="dive-placeholder">Choose a point to dive deeper into…</div>`;
    bookPageR.innerHTML = `<div class="book-deviation-right">${content}</div>`;
  }

  function renderBookPage() {
    const page = BOOK_PAGES[bookPageIndex];
    if (page.type === 'intro') {
      renderIntroPage();
    } else if (page.type === 'deviation') {
      renderDeviationPage(deviationSelectedKey);
    } else {
      renderImagePage(page.image);
    }
    bookPrev.disabled = bookPageIndex === 0;
    bookNext.disabled = bookPageIndex === BOOK_PAGES.length - 1;
  }

  let deviationSelectedKey = null;

  // Delegate clicks inside the book pages
  function handleBookPageClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'go-deviation') {
      bookPageIndex = BOOK_PAGES.findIndex(p => p.type === 'deviation');
      deviationSelectedKey = null;
      renderBookPage();
    } else if (action === 'go-intro') {
      bookPageIndex = BOOK_PAGES.findIndex(p => p.type === 'intro');
      deviationSelectedKey = null;
      renderBookPage();
    } else if (action === 'dive') {
      deviationSelectedKey = btn.dataset.key;
      renderBookPage();
    }
  }
  bookPageL.addEventListener('click', handleBookPageClick);
  bookPageR.addEventListener('click', handleBookPageClick);

  function openBook() {
    bookPageIndex = 0;
    renderBookPage();
    bookOverlay.classList.remove('hidden');
    unlockForOverlay();
  }

  function closeBook() {
    bookOverlay.classList.add('hidden');
    relockAfterOverlay();
  }

  bookPrev.addEventListener('click',  () => { bookPageIndex = getPrevPageIndex(bookPageIndex); renderBookPage(); });
  bookNext.addEventListener('click',  () => { bookPageIndex = getNextPageIndex(bookPageIndex); renderBookPage(); });
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

  // ── Global Escape key ────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanelDrawer();
      closeGatekeeperChat();
      closeInventory();
      closeBook();
      closeRabbitHole();
      closeReport();
      closeFinDuMonde();
    }
  });

  function updateHints() {
    // No-op in first person mode
  }

  return {
    updateHUD,
    openPanelDrawer,
    openGatekeeperChat,
    openInventory,
    openBook,
    openRabbitHole,
    openReport,
    openFinDuMonde,
    updateHints
  };
}
