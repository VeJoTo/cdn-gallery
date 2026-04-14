// src/navigation.js
import * as THREE from 'three';
import gsap from 'gsap';

export const HOTSPOTS = {
  overview:       { position: { x: 0,    y: 4.5, z: 7  }, target: { x: 0,    y: 1,   z: 0 }, label: 'Overview' },
  'arcade-left':  { position: { x: -1.8, y: 1.8, z: 0.8  }, target: { x: -3.15, y: 1.3, z: 0.8  }, label: 'Arcade 1' },
  'arcade-right': { position: { x: -1.8, y: 1.8, z: -0.5 }, target: { x: -3.15, y: 1.3, z: -0.5 }, label: 'Arcade 2' },
  'wall-left':    { position: { x: -1,   y: 2,   z: 0  }, target: { x: -3.5, y: 1.5, z: 0 }, label: 'Left Wall' },
  'wall-right':   { position: { x: 1,    y: 2,   z: 0  }, target: { x: 3.5,  y: 1.5, z: 0 }, label: 'Right Wall' },
  desk:           { position: { x: 1.8,  y: 1.5, z: -0.6 }, target: { x: 1.8,  y: 1.2, z: -2.6 }, label: 'Gaming Desk' },
  globe:          { position: { x: 0.6,  y: 1.2, z: -1.5 }, target: { x: 0.2,  y: 0.85, z: -2.4 }, label: 'Globe' },
  pedestal:       { position: { x: -2.0, y: 1.4, z: 1.6  }, target: { x: -2.8, y: 1.2, z: 2.6  }, label: 'Magic Tome' },
  'rabbit-hole':  { position: { x: -0.2, y: 1.2, z: -1.5 }, target: { x: -0.8, y: 0.2, z: -2.4 }, label: 'Rabbit Hole' },
  tv:                 { position: { x: 2.0,  y: 2.8, z: 0    }, target: { x: 3.49, y: 2.85, z: 0    }, label: 'TV' },
  'poster-0':         { position: { x: -2.5, y: 2.0, z: -1.5 }, target: { x: -2.5, y: 2.0,  z: -2.90 }, label: 'Galaga' },
  'poster-1':         { position: { x: -1.4, y: 2.0, z: -1.5 }, target: { x: -1.4, y: 2.0,  z: -2.90 }, label: 'Pac-Man' },
  'poster-2':         { position: { x: -0.3, y: 2.0, z: -1.5 }, target: { x: -0.3, y: 2.0,  z: -2.90 }, label: 'Space Invaders' },
  'poster-ai-cinema': { position: { x: 2.0,  y: 1.5, z: 2.2  }, target: { x: 3.42, y: 1.5,  z: 2.2   }, label: 'AI Cinema' },
  exit:               { position: { x: 0,    y: 2,   z: 5    }, target: { x: 0,    y: 1,    z: 3     }, label: 'Exit' },
  table:          { position: { x: 0.5,  y: 1.2, z: 0.8 }, target: { x: 0,    y: 0.5, z: 1.5 }, label: 'Table' },
  'desk-left-monitor':  { position: { x: 1.0, y: 1.4, z: -1.8 }, target: { x: 1.25, y: 1.18, z: -3.0 }, label: 'Left Monitor' },
  'desk-right-monitor': { position: { x: 2.6, y: 1.4, z: -1.8 }, target: { x: 2.35, y: 1.18, z: -3.0 }, label: 'Right Monitor' },
  'seat-beanbag-left':  { position: { x: -0.8, y: 0.5, z: 2.2 }, target: { x: 0, y: 1.0, z: 0 }, label: 'Relaxing...' },
  'seat-beanbag-right': { position: { x: 0.8, y: 0.5, z: 2.2 }, target: { x: 0, y: 1.0, z: 0 }, label: 'Relaxing...' },
  'seat-chair':         { position: { x: 1.8, y: 0.7, z: -1.7 }, target: { x: 1.8, y: 1.2, z: -2.6 }, label: 'Seated at desk' }
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

export function createNavigationSystem(camera, state, ui, controls) {
  // Proxy object for GSAP to tween plain numbers instead of Vector3
  const proxy = {
    px: camera.position.x,
    py: camera.position.y,
    pz: camera.position.z,
    tx: 0, ty: 1, tz: 0
  };

  function applyProxy() {
    camera.position.set(proxy.px, proxy.py, proxy.pz);
    camera.lookAt(proxy.tx, proxy.ty, proxy.tz);
    if (controls) {
      controls.target.set(proxy.tx, proxy.ty, proxy.tz);
    }
  }

  function goTo(id) {
    if (!state.startTransition(id)) return;
    const h = HOTSPOTS[id];
    gsap.to(proxy, {
      px: h.position.x, py: h.position.y, pz: h.position.z,
      tx: h.target.x,   ty: h.target.y,   tz: h.target.z,
      duration: 0.8,
      ease: 'power2.inOut',
      onUpdate: applyProxy,
      onComplete: () => {
        state.endTransition();
        ui.updateHUD(id);
      }
    });
    ui.updateHUD(id);
  }

  return { goTo };
}

export function setupClickHandler(renderer, camera, clickableObjects, nav, ui, navState) {
  const raycaster = new THREE.Raycaster();
  const mouse     = new THREE.Vector2();
  let downX = 0, downY = 0;

  renderer.domElement.addEventListener('mousedown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
  });

  renderer.domElement.addEventListener('mouseup', (event) => {
    // Ignore if the mouse moved more than 5px (that's a drag, not a click)
    const dx = event.clientX - downX;
    const dy = event.clientY - downY;
    if (Math.sqrt(dx * dx + dy * dy) > 5) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(clickableObjects, true);
    if (!hits.length) return;

    // Walk up parent chain to find userData.clickable
    let obj = hits[0].object;
    while (obj && !obj.userData.clickable) obj = obj.parent;
    if (!obj) return;

    const { hotspot, action, panelId, panelTitle } = obj.userData;

    if (hotspot)                      nav.goTo(hotspot);
    if (action === 'openPanel')       ui.openPanelDrawer(panelId, panelTitle);
    if (action === 'openBook')        ui.openBook();
    if (action === 'enterRabbitHole') ui.openRabbitHole();
    if (action === 'openReport' && navState.current === 'table') ui.openReport();
    if (action === 'openPoster' && navState.current === hotspot) ui.openPanelDrawer(panelId, panelTitle);
  });
}
