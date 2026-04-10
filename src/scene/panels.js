// src/scene/panels.js
import * as THREE from 'three';

const PANEL_W = 512;
const PANEL_H = 384;

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = PANEL_W;
  c.height = PANEL_H;
  return c;
}

function drawTextPanel(ctx, title) {
  ctx.fillStyle = '#0a1a28';
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);

  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(title, 30, 52);

  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 64);
  ctx.lineTo(PANEL_W - 30, 64);
  ctx.stroke();

  const lines = [
    'Lorem ipsum dolor sit amet consectetur',
    'adipiscing elit sed do eiusmod tempor.',
    'Incididunt ut labore et dolore magna.',
    'Aliqua enim ad minim veniam quis.',
    'Nostrud exercitation ullamco laboris.'
  ];
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#90e0ef';
  lines.forEach((line, i) => ctx.fillText(line, 30, 104 + i * 34));
}

function drawChartPanel(ctx, title) {
  ctx.fillStyle = '#0a1a28';
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);

  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(title, 30, 44);

  const bars = [
    { label: '2020', value: 0.55, color: '#00e5ff' },
    { label: '2021', value: 0.70, color: '#ff006e' },
    { label: '2022', value: 0.85, color: '#9b00ff' },
    { label: '2023', value: 0.65, color: '#00e5ff' },
    { label: '2024', value: 0.95, color: '#ff006e' }
  ];

  const barW = 68;
  const maxH = 220;
  const baseY = 320;
  const startX = 40;

  bars.forEach(({ label, value, color }, i) => {
    const x = startX + i * (barW + 16);
    const h = value * maxH;

    ctx.fillStyle = color;
    ctx.fillRect(x, baseY - h, barW, h);

    ctx.fillStyle = '#90e0ef';
    ctx.font = '18px sans-serif';
    ctx.fillText(label, x + 10, baseY + 22);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(Math.round(value * 100) + '%', x + 8, baseY - h - 8);
  });

  ctx.strokeStyle = 'rgba(144,224,239,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, baseY);
  ctx.lineTo(PANEL_W - 30, baseY);
  ctx.stroke();
}

function drawTimelinePanel(ctx, title) {
  ctx.fillStyle = '#0a1a28';
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);

  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(title, 30, 44);

  const milestones = [
    { year: '2018', label: 'CDN founded at UiB' },
    { year: '2020', label: 'First research cohort' },
    { year: '2022', label: 'Digital storytelling lab' },
    { year: '2024', label: 'Interactive gallery launch' }
  ];

  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  const lineY = 200;
  ctx.beginPath();
  ctx.moveTo(40, lineY);
  ctx.lineTo(PANEL_W - 40, lineY);
  ctx.stroke();

  const spacing = (PANEL_W - 80) / (milestones.length - 1);

  milestones.forEach(({ year, label }, i) => {
    const x = 40 + i * spacing;

    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x, lineY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#90e0ef';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(year, x, lineY - 22);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#90e0ef';
    const descY = i % 2 === 0 ? lineY + 36 : lineY + 72;
    ctx.fillText(label, x, descY);
  });

  ctx.textAlign = 'left';
}

export function createPanels(scene) {
  const panelDefs = [
    // Left wall (x = -3.5, facing right)
    { type: 'text',     title: 'Research Overview',    wall: 'left',  z:  1.2, y: 1.75 },
    { type: 'chart',    title: 'Publications 2020–24', wall: 'left',  z: -0.2, y: 1.75 },
    { type: 'timeline', title: 'CDN Timeline',         wall: 'left',  z: -1.6, y: 1.75 },
    // Right wall (x = +3.5, facing left)
    { type: 'text',     title: 'Digital Narratives',   wall: 'right', z:  1.2, y: 1.75 },
    { type: 'chart',    title: 'Research Areas',       wall: 'right', z: -0.2, y: 1.75 },
    { type: 'timeline', title: 'Project Milestones',   wall: 'right', z: -1.6, y: 1.75 }
  ];

  const panels = [];

  panelDefs.forEach((def, idx) => {
    const canvas = makeCanvas();
    const ctx = canvas.getContext('2d');

    if (def.type === 'text')     drawTextPanel(ctx, def.title);
    if (def.type === 'chart')    drawChartPanel(ctx, def.title);
    if (def.type === 'timeline') drawTimelinePanel(ctx, def.title);

    const texture = new THREE.CanvasTexture(canvas);
    const mat     = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const plane   = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.05), mat);

    if (def.wall === 'left') {
      plane.position.set(-3.48, def.y, def.z);
      plane.rotation.y = Math.PI / 2;
    } else {
      plane.position.set(3.48, def.y, def.z);
      plane.rotation.y = -Math.PI / 2;
    }

    plane.userData = {
      clickable: true,
      action: 'openPanel',
      panelId: idx,
      panelTitle: def.title,
      hotspot: def.wall === 'left' ? 'wall-left' : 'wall-right'
    };

    scene.add(plane);
    panels.push(plane);
  });

  return panels;
}
