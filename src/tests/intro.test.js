import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { typewriteTokens, playIntro } from '../intro.js';

function collect(iter) {
  return Array.from(iter);
}

describe('typewriteTokens', () => {
  it('yields each visible character one at a time', () => {
    expect(collect(typewriteTokens('hi'))).toEqual(['h', 'i']);
  });

  it('emits HTML tags as a single atomic token', () => {
    expect(collect(typewriteTokens('a <strong>b</strong>'))).toEqual([
      'a', ' ', '<strong>', 'b', '</strong>'
    ]);
  });

  it('handles self-closing / void tags atomically', () => {
    expect(collect(typewriteTokens('x<br/>y'))).toEqual(['x', '<br/>', 'y']);
  });

  it('treats emoji as a single character', () => {
    // Intro script uses 🪄 in "Welcome kids! 🪄" — must type as one token
    expect(collect(typewriteTokens('🪄 hi'))).toEqual(['🪄', ' ', 'h', 'i']);
  });

  it('yields nothing for empty string', () => {
    expect(collect(typewriteTokens(''))).toEqual([]);
  });

  it('handles text with no tags', () => {
    expect(collect(typewriteTokens('abc'))).toEqual(['a', 'b', 'c']);
  });

  it('handles text that is only a tag', () => {
    expect(collect(typewriteTokens('<em>x</em>'))).toEqual(['<em>', 'x', '</em>']);
  });
});

function setupDom() {
  document.body.innerHTML = `
    <div id="gatekeeper-chat" class="hidden">
      <div id="guide-dialog">
        <div id="chat-messages"></div>
        <div id="chat-footer">▸ Space to continue · ESC to skip</div>
      </div>
    </div>
  `;
  return {
    chatOverlay: document.getElementById('gatekeeper-chat'),
    guideDialog: document.getElementById('guide-dialog'),
    chatMessages: document.getElementById('chat-messages'),
  };
}

function press(key) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function clickDialog() {
  document.getElementById('guide-dialog').click();
}

describe('playIntro', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupDom();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  const TWO_LINE_SCRIPT = [
    { text: 'hi' },
    { text: 'bye' },
  ];

  it('opens the dialog and types the first line char-by-char', () => {
    const { chatMessages } = setupDom();
    playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(10);
    expect(chatMessages.textContent).toBe('h');
    vi.advanceTimersByTime(10);
    expect(chatMessages.textContent).toBe('hi');
  });

  it('advance while typing completes the current line immediately', () => {
    const { chatMessages } = setupDom();
    playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(10);
    press(' ');
    expect(chatMessages.textContent).toBe('hi');
  });

  it('advance after a line is complete moves to the next line', () => {
    const { chatMessages } = setupDom();
    playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(20);
    press(' ');
    vi.advanceTimersByTime(10);
    expect(chatMessages.textContent).toBe('b');
  });

  it('click on the dialog advances the same as Space', () => {
    const { chatMessages } = setupDom();
    playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(10);
    clickDialog();
    expect(chatMessages.textContent).toBe('hi');
  });

  it('Enter advances', () => {
    const { chatMessages } = setupDom();
    playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(10);
    press('Enter');
    expect(chatMessages.textContent).toBe('hi');
  });

  it('resolves with { skipped: false } after advancing past final line', async () => {
    const promise = playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(20);
    press(' ');
    vi.advanceTimersByTime(30);
    press(' ');
    await expect(promise).resolves.toEqual({ skipped: false });
  });

  it('ESC skips and resolves with { skipped: true }', async () => {
    const promise = playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(10);
    press('Escape');
    await expect(promise).resolves.toEqual({ skipped: true });
  });

  it('renders HTML tags as HTML, not as text', () => {
    const { chatMessages } = setupDom();
    playIntro({
      script: [{ text: 'a <strong>B</strong>', html: true }],
      charDelayMs: 10,
    });
    vi.advanceTimersByTime(50);
    expect(chatMessages.innerHTML).toContain('<strong>B</strong>');
    expect(chatMessages.textContent).toBe('a B');
  });

  it('removes its keydown listener on completion', async () => {
    const { chatMessages } = setupDom();
    const promise = playIntro({ script: [{ text: 'x' }], charDelayMs: 10 });
    vi.advanceTimersByTime(10);
    press(' ');
    await promise;
    const afterHtml = chatMessages.innerHTML;
    press(' ');
    press('Escape');
    expect(chatMessages.innerHTML).toBe(afterHtml);
  });

  it('ignores key-repeat events', () => {
    const { chatMessages } = setupDom();
    playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(10);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true }));
    expect(chatMessages.textContent).toBe('h');
  });

  it('resolves immediately with { skipped: false } for an empty script', async () => {
    setupDom();
    await expect(playIntro({ script: [] })).resolves.toEqual({ skipped: false });
  });
});
