// src/scene/face-primitives.js
// Pure pixel-art face drawing primitives, no side effects at module load.
// Used by the in-scene radio (radio.js) and the AI-room loading screen (loading-ai.js).

const FACE_INK_DIM = 'rgba(94, 224, 255, 0.55)';

function drawPixel(ctx, gx, gy, w = 1, h = 1, color, face) {
  ctx.fillStyle = color ?? face.ink;
  ctx.fillRect(
    Math.round(face.cx + gx * face.px - (w * face.px) / 2),
    Math.round(face.cy + gy * face.px - (h * face.px) / 2),
    w * face.px,
    h * face.px
  );
}

export function drawEyes(ctx, kind, face) {
  const lx = -5;
  const rx = 5;
  const ey = -2;
  if (kind === 'open') {
    drawPixel(ctx, lx, ey, 2, 3, undefined, face);
    drawPixel(ctx, rx, ey, 2, 3, undefined, face);
  } else if (kind === 'closed') {
    drawPixel(ctx, lx, ey, 3, 1, undefined, face);
    drawPixel(ctx, rx, ey, 3, 1, undefined, face);
  } else if (kind === 'wide') {
    drawPixel(ctx, lx, ey, 4, 4, undefined, face);
    drawPixel(ctx, rx, ey, 4, 4, undefined, face);
    drawPixel(ctx, lx, ey, 2, 2, '#0a1419', face);
    drawPixel(ctx, rx, ey, 2, 2, '#0a1419', face);
  } else if (kind === 'wink') {
    drawPixel(ctx, lx, ey, 3, 1, undefined, face);
    drawPixel(ctx, rx, ey, 2, 3, undefined, face);
  }
}

export function drawMouth(ctx, kind, face) {
  const my = 3;
  if (kind === 'smile') {
    drawPixel(ctx, -4, my,     1, 1, undefined, face);
    drawPixel(ctx, -3, my + 1, 1, 1, undefined, face);
    drawPixel(ctx, -2, my + 2, 1, 1, undefined, face);
    drawPixel(ctx, -1, my + 2, 1, 1, undefined, face);
    drawPixel(ctx,  0, my + 2, 1, 1, undefined, face);
    drawPixel(ctx,  1, my + 2, 1, 1, undefined, face);
    drawPixel(ctx,  2, my + 2, 1, 1, undefined, face);
    drawPixel(ctx,  3, my + 1, 1, 1, undefined, face);
    drawPixel(ctx,  4, my,     1, 1, undefined, face);
  } else if (kind === 'flat') {
    drawPixel(ctx, 0, my + 1, 5, 1, undefined, face);
  } else if (kind === 'oh') {
    drawPixel(ctx, -1, my,     3, 1, undefined, face);
    drawPixel(ctx, -2, my + 1, 1, 1, undefined, face);
    drawPixel(ctx,  2, my + 1, 1, 1, undefined, face);
    drawPixel(ctx, -1, my + 2, 3, 1, undefined, face);
  } else if (kind === 'smirk') {
    drawPixel(ctx, -3, my,     1, 1, undefined, face);
    drawPixel(ctx, -2, my + 1, 1, 1, undefined, face);
    drawPixel(ctx, -1, my + 2, 1, 1, undefined, face);
    drawPixel(ctx,  0, my + 2, 1, 1, undefined, face);
    drawPixel(ctx,  1, my + 2, 1, 1, undefined, face);
    drawPixel(ctx,  2, my + 2, 1, 1, undefined, face);
    drawPixel(ctx,  3, my + 2, 1, 1, undefined, face);
  }
}

export function drawRadioFace(ctx, { eyes, mouth, cx, cy, px = 6, ink = '#5ee0ff' }) {
  const face = { px, cx, cy, ink, inkDim: FACE_INK_DIM };
  if (eyes) drawEyes(ctx, eyes, face);
  if (mouth) drawMouth(ctx, mouth, face);
}
