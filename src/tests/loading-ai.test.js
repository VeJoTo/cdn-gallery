// src/tests/loading-ai.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
  document.body.innerHTML = '';
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('playAiLoadingScreen', () => {
  it('returns a Promise that resolves after ~2.5s', async () => {
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const promise = playAiLoadingScreen();
    expect(promise).toBeInstanceOf(Promise);

    // Before 2.5s the promise should not have resolved.
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(2400);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(true);
  });

  it('attaches an overlay element to the DOM while playing', async () => {
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const promise = playAiLoadingScreen();
    const overlay = document.getElementById('ai-loading-overlay');
    expect(overlay).not.toBeNull();
    await vi.advanceTimersByTimeAsync(2600);
    await promise;
  });

  it('resolves immediately under prefers-reduced-motion', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const promise = playAiLoadingScreen();
    let resolved = false;
    promise.then(() => { resolved = true; });
    await vi.advanceTimersByTimeAsync(20);
    expect(resolved).toBe(true);
    expect(document.getElementById('ai-loading-overlay')).toBeNull();
  });
});
