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

  it('builds a static overlay and fades when ready under prefers-reduced-motion', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    let resolveReady;
    const readyPromise = new Promise((r) => { resolveReady = r; });
    const promise = playAiLoadingScreen({ readyPromise });

    // Overlay must exist while waiting for ready, even with reduced motion.
    expect(document.getElementById('ai-loading-overlay')).not.toBeNull();

    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(1000);
    expect(resolved).toBe(false);

    resolveReady();
    await vi.advanceTimersByTimeAsync(50);   // microtask flush, fade starts
    await vi.advanceTimersByTimeAsync(350);  // fade (300ms) + buffer
    expect(resolved).toBe(true);
    expect(document.getElementById('ai-loading-overlay')).toBeNull();
  });

  it('respects maxDurationMs cap under prefers-reduced-motion when readyPromise never resolves', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const neverReady = new Promise(() => {});
    const promise = playAiLoadingScreen({ maxDurationMs: 2000, readyPromise: neverReady });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(1900);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('honors a custom minDurationMs', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    // minDurationMs=1500 → minLockinStart=500, lock-in 500-1200, fade 1200-1500.
    const promise = playAiLoadingScreen({ minDurationMs: 1500 });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(1400);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(200); // total 1600ms > 1500ms
    expect(resolved).toBe(true);
  });

  it('does not fade before minDurationMs even if readyPromise resolves earlier', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const readyPromise = Promise.resolve(); // already resolved
    // minDurationMs=1500 → function still floors at 1500ms even though ready is immediate.
    const promise = playAiLoadingScreen({ minDurationMs: 1500, readyPromise });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(1400);
    expect(resolved).toBe(false); // still under min duration

    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(true);
  });

  it('waits for readyPromise past minDurationMs', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    let resolveReady;
    const readyPromise = new Promise((r) => { resolveReady = r; });
    // minDurationMs=1500 → minLockinStart=500. With ready settled at t=2000ms,
    // lock-in starts at 2000ms, fade at 2700ms, resolve at 3000ms.
    const promise = playAiLoadingScreen({ minDurationMs: 1500, readyPromise });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(2000);
    expect(resolved).toBe(false); // past minDurationMs floor, but ready hasn't resolved

    resolveReady();
    await vi.advanceTimersByTimeAsync(50);   // microtasks flush, lock-in starts
    await vi.advanceTimersByTimeAsync(350);  // t≈2400ms — old fade-only flow would have resolved by now
    expect(resolved).toBe(false);            // new lock-in+fade still pending → discriminates old vs new

    await vi.advanceTimersByTimeAsync(700);  // t≈3100ms — past fade end
    expect(resolved).toBe(true);
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

  it('honors maxDurationMs cap when readyPromise never resolves', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const neverReady = new Promise(() => {}); // intentionally pending forever
    const promise = playAiLoadingScreen({
      minDurationMs: 1000,
      maxDurationMs: 3000,
      readyPromise: neverReady,
    });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(2900);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(200); // 3100ms total > 3000ms cap
    expect(resolved).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('readyPromise did not settle within 3000ms')
    );
    warnSpy.mockRestore();
  });
});
