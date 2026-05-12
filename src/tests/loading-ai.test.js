// src/tests/loading-ai.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
  document.body.innerHTML = '';
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('shouldPlayAiLoading', () => {
  it('returns true when entering the AI room and not yet played', async () => {
    const { shouldPlayAiLoading } = await import('../loading-ai.js');
    expect(shouldPlayAiLoading('ai', false)).toBe(true);
  });

  it('returns false when entering the AI room but already played', async () => {
    const { shouldPlayAiLoading } = await import('../loading-ai.js');
    expect(shouldPlayAiLoading('ai', true)).toBe(false);
  });

  it('returns false for other room targets', async () => {
    const { shouldPlayAiLoading } = await import('../loading-ai.js');
    expect(shouldPlayAiLoading('nature', false)).toBe(false);
    expect(shouldPlayAiLoading('exterior', false)).toBe(false);
  });
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

  it('does not leak overlay elements across repeated calls', async () => {
    // Ensure matchMedia returns false so we get the real overlay path
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { playAiLoadingScreen } = await import('../loading-ai.js');

    {
      const p = playAiLoadingScreen();
      await vi.advanceTimersByTimeAsync(2600);
      await p;
    }
    {
      const p = playAiLoadingScreen();
      await vi.advanceTimersByTimeAsync(2600);
      await p;
    }

    const overlays = document.querySelectorAll('#ai-loading-overlay');
    expect(overlays.length).toBe(0);
  });
});
