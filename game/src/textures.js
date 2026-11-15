// Procedural textures, drawn once onto offscreen canvases: a cold stone
// wall and a wooden door with iron bands. No image files, no network —
// everything is numbers, so the art is original.
import { TEX } from './config.js';

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

// Deterministic speckle from a seed, so the texture is the same every run.
function speckle(ctx, size, seed, count, alpha) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < count; i += 1) {
    const v = Math.floor(rnd() * 60);
    ctx.fillStyle = `rgba(${v}, ${v + 6}, ${v + 14}, ${alpha})`;
    ctx.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2));
  }
}

export function makeWallTexture() {
  const c = makeCanvas(TEX);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#232833';
  ctx.fillRect(0, 0, TEX, TEX);
  // Stone courses: three rows of blocks with dark mortar lines.
  const rows = 4;
  const rh = TEX / rows;
  for (let r = 0; r < rows; r += 1) {
    const offset = (r % 2) * TEX * 0.25;
    for (let x = -1; x < 3; x += 1) {
      const bx = x * (TEX / 2) + offset;
      const shade = 30 + ((r * 7 + x * 13) % 14);
      ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 12})`;
      ctx.fillRect(bx + 1, r * rh + 1, TEX / 2 - 2, rh - 2);
    }
    ctx.fillStyle = '#10131a';
    ctx.fillRect(0, r * rh, TEX, 2);
  }
  ctx.fillStyle = '#10131a';
  for (let x = 0; x < 3; x += 1) ctx.fillRect(x * (TEX / 2) + (x % 2) * TEX * 0.25, 0, 2, TEX);
  speckle(ctx, TEX, 1234, 260, 0.35);
  // Damp stains creeping up from the bottom.
  const grad = ctx.createLinearGradient(0, TEX * 0.6, 0, TEX);
  grad.addColorStop(0, 'rgba(8, 8, 10, 0)');
  grad.addColorStop(1, 'rgba(8, 8, 10, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, TEX * 0.6, TEX, TEX * 0.4);
  return c;
}

export function makeDoorTexture() {
  const c = makeCanvas(TEX);
  const ctx = c.getContext('2d');
  // Wooden planks, vertical, with grain.
  ctx.fillStyle = '#4a3421';
  ctx.fillRect(0, 0, TEX, TEX);
  const planks = 4;
  const pw = TEX / planks;
  for (let p = 0; p < planks; p += 1) {
    const shade = 66 + ((p * 17) % 18);
    ctx.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.72)}, ${Math.floor(shade * 0.45)})`;
    ctx.fillRect(p * pw + 1, 0, pw - 2, TEX);
    // Grain lines.
    ctx.strokeStyle = 'rgba(30, 18, 8, 0.6)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 3; g += 1) {
      const gx = p * pw + 3 + g * 4;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.bezierCurveTo(gx + 2, TEX * 0.3, gx - 2, TEX * 0.6, gx + 1, TEX);
      ctx.stroke();
    }
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(p * pw, 0, 1, TEX);
  }
  // Iron bands, top and bottom, with rivets.
  for (const y of [8, TEX - 12]) {
    ctx.fillStyle = '#1c1f26';
    ctx.fillRect(0, y, TEX, 7);
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(0, y, TEX, 1);
    for (let r = 0; r < 4; r += 1) {
      ctx.fillStyle = '#4a4f5c';
      ctx.beginPath();
      ctx.arc(8 + r * 16, y + 3.5, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // A dark keyhole.
  ctx.fillStyle = '#0a0806';
  ctx.beginPath();
  ctx.arc(TEX / 2, TEX * 0.58, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(TEX / 2 - 2, TEX * 0.58, 4, 8);
  speckle(ctx, TEX, 777, 140, 0.25);
  return c;
}

export function makeTextures() {
  return { wall: makeWallTexture(), door: makeDoorTexture() };
}
