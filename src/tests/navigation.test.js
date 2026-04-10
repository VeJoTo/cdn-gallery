// src/tests/navigation.test.js
import { describe, it, expect } from 'vitest';
import { createNavigationState, HOTSPOTS } from '../navigation.js';

describe('NavigationState', () => {
  it('starts at overview', () => {
    const state = createNavigationState();
    expect(state.current).toBe('overview');
  });

  it('is not transitioning initially', () => {
    const state = createNavigationState();
    expect(state.canNavigate()).toBe(true);
  });

  it('startTransition sets current and blocks navigation', () => {
    const state = createNavigationState();
    const ok = state.startTransition('arcade-left');
    expect(ok).toBe(true);
    expect(state.current).toBe('arcade-left');
    expect(state.canNavigate()).toBe(false);
  });

  it('startTransition returns false when already transitioning', () => {
    const state = createNavigationState();
    state.startTransition('arcade-left');
    const ok = state.startTransition('arcade-right');
    expect(ok).toBe(false);
    expect(state.current).toBe('arcade-left');
  });

  it('endTransition restores navigability', () => {
    const state = createNavigationState();
    state.startTransition('arcade-left');
    state.endTransition();
    expect(state.canNavigate()).toBe(true);
  });

  it('does not navigate to unknown hotspot', () => {
    const state = createNavigationState();
    const ok = state.startTransition('nonexistent');
    expect(ok).toBe(false);
  });
});

describe('HOTSPOTS', () => {
  it('includes desk hotspot', () => {
    expect(HOTSPOTS.desk).toBeDefined();
    expect(HOTSPOTS.desk.label).toBe('Gaming Desk');
  });

  it('includes pedestal hotspot', () => {
    expect(HOTSPOTS.pedestal).toBeDefined();
    expect(HOTSPOTS.pedestal.label).toBe('Magic Tome');
  });
});
