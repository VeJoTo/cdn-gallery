// src/navigation.js
import * as THREE from 'three';

export const HOTSPOTS = {
  overview:       { position: { x: 0,    y: 6,   z: 10 }, target: { x: 0,    y: 1,   z: 0 }, label: 'Overview' },
  'arcade-left':  { position: { x: -2.5, y: 2.5, z: 4  }, target: { x: -2.5, y: 1.5, z: 0 }, label: 'Left Arcade' },
  'arcade-right': { position: { x: 2.5,  y: 2.5, z: 4  }, target: { x: 2.5,  y: 1.5, z: 0 }, label: 'Right Arcade' },
  'wall-left':    { position: { x: -1,   y: 2,   z: 0  }, target: { x: -3.5, y: 1.5, z: 0 }, label: 'Left Wall' },
  'wall-right':   { position: { x: 1,    y: 2,   z: 0  }, target: { x: 3.5,  y: 1.5, z: 0 }, label: 'Right Wall' },
  exit:           { position: { x: 0,    y: 2,   z: 5  }, target: { x: 0,    y: 1,   z: 3 }, label: 'Exit' }
};

export function createNavigationState() {
  let current = 'overview';
  let transitioning = false;

  return {
    get current() { return current; },
    canNavigate() { return !transitioning; },
    startTransition(id) {
      if (transitioning) return false;
      if (!HOTSPOTS[id]) return false;
      current = id;
      transitioning = true;
      return true;
    },
    endTransition() {
      transitioning = false;
    }
  };
}
