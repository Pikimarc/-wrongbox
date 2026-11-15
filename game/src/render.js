// First-person renderer: a Wolfenstein-style raycaster in pure canvas 2D.
// No library, no WebGL — one ray per 2 screen pixels, textured wall slices,
// distance fog, a flashlight vignette, and the tell overlays projected onto
// the doors. Deterministic: shake comes from sines of world time, never
// from Math.random, so staged screenshots are reproducible.
import { VIEW, RAYS, FOV, PLANE, TEX, MAX_DEPTH, SCARE, PHASE_TITLE, PHASE_PLAY, PHASE_SCARE, PHASE_WIN, PHASE_OVER } from './config.js';
import { drawFace, scareProgress, scareLunge, scareHit, scareBlackout } from './jumpscare.js';
import { drawHUD, drawTitle, drawWin, drawOver, drawPaused } from './hud.js';

const STRIP = VIEW.width / RAYS;

export function createRenderer(canvas, textures) {
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  const ctx = canvas.getContext('2d');
  const zbuffer = new Float32Array(RAYS);
  const hitDoor = new Int16Array(RAYS);

  // Camera basis for projecting world points to the screen.
  function project(world, wx, wy, height) {
    const p = world.player;
    const dirX = Math.cos(p.angle);
    const dirY = Math.sin(p.angle);
    const planeX = -dirY * PLANE;
    const planeY = dirX * PLANE;
    const relX = wx - p.x;
    const relY = wy - p.y;
    const invDet = 1 / (planeX * dirY - dirX * planeY);
    const tx = invDet * (dirY * relX - dirX * relY);
    const ty = invDet * (-planeY * relX + planeX * relY);
    if (ty <= 0.12) return null;
    const sx = (VIEW.width / 2) * (1 + tx / ty);
    const lineH = VIEW.height / ty;
    const sy = VIEW.height / 2 + lineH / 2 - height * lineH;
    return { sx, sy, depth: ty, lineH };
  }

  function castRays(world) {
    const p = world.player;
    const dirX = Math.cos(p.angle);
    const dirY = Math.sin(p.angle);
    const planeX = -dirY * PLANE;
    const planeY = dirX * PLANE;
    const map = world.room.map;
    const doors = world.room.doors;
    for (let col = 0; col < RAYS; col += 1) {
      const cameraX = (2 * col) / RAYS - 1;
      const rayX = dirX + planeX * cameraX;
      const rayY = dirY + planeY * cameraX;
      let mapX = Math.floor(p.x);
      let mapY = Math.floor(p.y);
      const deltaX = rayX === 0 ? 1e30 : Math.abs(1 / rayX);
      const deltaY = rayY === 0 ? 1e30 : Math.abs(1 / rayY);
      let stepX;
      let stepY;
      let sideX;
      let sideY;
      if (rayX < 0) { stepX = -1; sideX = (p.x - mapX) * deltaX; } else { stepX = 1; sideX = (mapX + 1 - p.x) * deltaX; }
      if (rayY < 0) { stepY = -1; sideY = (p.y - mapY) * deltaY; } else { stepY = 1; sideY = (mapY + 1 - p.y) * deltaY; }
      let side = 0;
      let hit = false;
      let guard = 0;
      while (!hit && guard < 64) {
        guard += 1;
        if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; }
        else { sideY += deltaY; mapY += stepY; side = 1; }
        const cell = (mapY >= 0 && mapY < map.length && mapX >= 0 && mapX < map[mapY].length)
          ? map[mapY][mapX] : '#';
        if (cell !== '.') hit = true;
      }
      let dist;
      let wallX;
      let cell = '#';
      if (side === 0) {
        dist = sideX - deltaX;
        wallX = p.y + dist * rayY;
        cell = (mapY >= 0 && mapY < map.length && mapX >= 0 && mapX < map[mapY].length) ? map[mapY][mapX] : '#';
      } else {
        dist = sideY - deltaY;
        wallX = p.x + dist * rayX;
        cell = (mapY >= 0 && mapY < map.length && mapX >= 0 && mapX < map[mapY].length) ? map[mapY][mapX] : '#';
      }
      if (dist < 0.05) dist = 0.05;
      zbuffer[col] = dist;
      const isDoor = cell === 'D';
      const door = isDoor ? doors.find((d) => d.gx === mapX && d.gz === mapY) : null;
      hitDoor[col] = door ? door.index : -1;

      wallX -= Math.floor(wallX);
      let texX = Math.floor(wallX * TEX);
      if (side === 0 && rayX > 0) texX = TEX - texX - 1;
      if (side === 1 && rayY < 0) texX = TEX - texX - 1;
      const lineH = VIEW.height / dist;
      const drawStart = VIEW.height / 2 - lineH / 2;
      const sx = col * STRIP;
      const tex = isDoor ? textures.door : textures.wall;
      if (isDoor && door && door.open > 0) {
        // The door slides down into the floor: black gap above it.
        ctx.fillStyle = '#020203';
        ctx.fillRect(sx, drawStart, STRIP + 0.5, lineH);
        const remain = 1 - door.open;
        if (remain > 0.02) {
          ctx.drawImage(tex, texX, 0, 1, TEX * remain, sx, drawStart + door.open * lineH, STRIP + 0.5, lineH * remain);
        }
      } else {
        // Rattle: the wrong doors shiver vertically by a couple of pixels.
        let yOff = 0;
        if (isDoor && door && door.rattling) {
          yOff = door.rattleX * (lineH / 300);
        }
        ctx.drawImage(tex, texX, 0, 1, TEX, sx, drawStart + yOff, STRIP + 0.5, lineH);
      }
      // Distance fog + side shading.
      const fog = Math.min(0.88, (dist / MAX_DEPTH) * 0.9 + world.room.darkness * 0.25);
      const sideShade = side === 1 ? 0.22 : 0;
      const alpha = Math.min(0.95, fog + sideShade);
      if (alpha > 0.01) {
        ctx.fillStyle = `rgba(2, 2, 4, ${alpha.toFixed(3)})`;
        ctx.fillRect(sx, drawStart, STRIP + 0.5, lineH);
      }
      // Breathe: the safe door's face gently brightens and dims.
      if (isDoor && door && door.safe && world.room.tell.id === 'breathe') {
        const glow = 0.05 + (door.lidLift / 4) * 0.09;
        ctx.fillStyle = `rgba(255, 190, 110, ${glow.toFixed(3)})`;
        ctx.fillRect(sx, drawStart, STRIP + 0.5, lineH);
      }
    }
  }

  function drawTellOverlays(world) {
    const room = world.room;
    const tell = room.tell;
    const strength = tell.strength;
    for (const door of room.doors) {
      const left = project(world, door.gx, 1, 0);
      const right = project(world, door.gx + 1, 1, 0);
      if (!left || !right) continue;
      const cx = (left.sx + right.sx) / 2;
      const col = Math.max(0, Math.min(RAYS - 1, Math.floor(cx / STRIP)));
      if (zbuffer[col] < left.depth - 0.4) continue; // occluded
      const lineH = left.lineH;
      const top = VIEW.height / 2 - lineH / 2;
      const bottom = VIEW.height / 2 + lineH / 2;
      const width = Math.abs(right.sx - left.sx);

      // Door frames: a wide dark post at each side of the door, with a
      // lighter centre line, so the three doors read as three doors and not
      // one wooden wall. A slight tint per door keeps the panels distinct.
      const tint = ['rgba(0, 0, 0, 0.14)', 'rgba(0, 0, 0, 0)', 'rgba(255, 220, 160, 0.07)'][door.index];
      if (tint !== 'rgba(0, 0, 0, 0)') {
        ctx.fillStyle = tint;
        ctx.fillRect(left.sx, top, width, lineH);
      }
      ctx.fillStyle = 'rgba(8, 6, 5, 0.9)';
      ctx.fillRect(left.sx - 6, top, 12, lineH);
      ctx.fillRect(right.sx - 6, top, 12, lineH);
      ctx.fillStyle = 'rgba(96, 78, 52, 0.9)';
      ctx.fillRect(left.sx - 1, top, 2, lineH);
      ctx.fillRect(right.sx - 1, top, 2, lineH);

      if (tell.id === 'warm' && door.safe) {
        const a = 0.5 * strength;
        const g = ctx.createRadialGradient(cx, bottom, 2, cx, bottom, Math.max(20, lineH * 0.55));
        g.addColorStop(0, `rgba(255, 150, 40, ${a.toFixed(3)})`);
        g.addColorStop(1, 'rgba(255, 150, 40, 0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.fillRect(cx - lineH * 0.6, bottom - lineH * 0.55, lineH * 1.2, lineH * 0.6);
        ctx.restore();
      }

      if (tell.id === 'bleed' && !door.safe) {
        const len = door.bleedLength * (lineH / 300);
        ctx.fillStyle = 'rgba(20, 2, 2, 0.9)';
        for (let i = 0; i < 3; i += 1) {
          const dx = cx - width * 0.28 + i * width * 0.28;
          const h = len * (0.6 + i * 0.25);
          ctx.fillRect(dx - 2, bottom, 4, h);
          ctx.beginPath();
          ctx.arc(dx, bottom + h, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (tell.id === 'whisper' && !door.safe) {
        // Faint wisps curling out of the wrong doors.
        for (let i = 0; i < 2; i += 1) {
          const ph = door.wispPhase + i * 2.4;
          const wx = cx + Math.sin(ph) * width * 0.22;
          const wy = top + lineH * (0.35 + 0.3 * Math.sin(ph * 0.7));
          const r = 5 + 4 * Math.sin(ph * 1.3);
          ctx.strokeStyle = `rgba(170, 180, 200, ${(0.28 * strength).toFixed(3)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(wx, wy, Math.max(2, r), ph, ph + 2.2);
          ctx.stroke();
        }
      }

      if (tell.id === 'moths' && door.safe) {
        for (const moth of door.moths) {
          const mx = door.gx + 0.5 + Math.cos(moth.angle) * moth.radius;
          const my = 1.6 + Math.sin(moth.angle) * 0.4;
          const h = 0.45 + moth.height * 0.4;
          const pt = project(world, mx, my, h);
          if (!pt) continue;
          const pcol = Math.max(0, Math.min(RAYS - 1, Math.floor(pt.sx / STRIP)));
          if (zbuffer[pcol] < pt.depth - 0.3) continue;
          const s = Math.max(1.5, moth.size * (140 / pt.depth));
          ctx.fillStyle = 'rgba(235, 225, 200, 0.9)';
          ctx.beginPath();
          ctx.ellipse(pt.sx, pt.sy, s, s * 0.6, Math.sin(moth.angle * 3) * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      void top;
    }
  }

  function drawSprites(world) {
    // Candle sconce on the left wall, halfway down the corridor.
    const flame = project(world, 0.12, 10, 0.62);
    if (flame) {
      const col = Math.max(0, Math.min(RAYS - 1, Math.floor(flame.sx / STRIP)));
      if (zbuffer[col] > flame.depth - 0.3) {
        const flick = 0.75 + world.candle * 0.25;
        const r = Math.max(6, 260 / flame.depth);
        const g = ctx.createRadialGradient(flame.sx, flame.sy, 1, flame.sx, flame.sy, r);
        g.addColorStop(0, `rgba(255, 180, 70, ${(0.85 * flick).toFixed(3)})`);
        g.addColorStop(1, 'rgba(255, 140, 30, 0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.fillRect(flame.sx - r, flame.sy - r, r * 2, r * 2);
        ctx.restore();
        ctx.fillStyle = '#ffcf7a';
        ctx.beginPath();
        ctx.ellipse(flame.sx, flame.sy, 2.5, 5 + world.candle * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Dust motes drifting in the corridor.
    for (const mote of world.dust) {
      const pt = project(world, mote.x, mote.y, mote.h);
      if (!pt) continue;
      const col = Math.max(0, Math.min(RAYS - 1, Math.floor(pt.sx / STRIP)));
      if (zbuffer[col] < pt.depth - 0.3) continue;
      const a = Math.max(0.05, Math.min(0.4, 10 / pt.depth));
      ctx.fillStyle = `rgba(200, 205, 220, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, Math.max(0.7, mote.r * (6 / pt.depth)), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFlashlight(world) {
    const dark = 0.5 + world.room.darkness * 0.38;
    const g = ctx.createRadialGradient(
      VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.22,
      VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.85,
    );
    g.addColorStop(0, 'rgba(2, 2, 5, 0)');
    g.addColorStop(1, `rgba(2, 2, 5, ${dark.toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    // Heartbeat pulse: the edges close in red as the heart thumps.
    if (world.pulse > 0.05) {
      const pg = ctx.createRadialGradient(
        VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.3,
        VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.8,
      );
      pg.addColorStop(0, 'rgba(120, 0, 0, 0)');
      pg.addColorStop(1, `rgba(120, 0, 0, ${(world.pulse * 0.3).toFixed(3)})`);
      ctx.fillStyle = pg;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    // Sanity below 30: the dark creeps in at the edges, always.
    if (world.sanity < 30 && world.phase === PHASE_PLAY) {
      const a = (30 - world.sanity) / 30;
      const sg = ctx.createRadialGradient(
        VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.28,
        VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.8,
      );
      sg.addColorStop(0, 'rgba(5, 0, 0, 0)');
      sg.addColorStop(1, `rgba(5, 0, 0, ${(a * 0.45).toFixed(3)})`);
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  function render(world, screen) {
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    ctx.save();
    // Deterministic shake (sines of world time, never Math.random).
    if (world.shake > 0.2) {
      const s = world.shake;
      ctx.translate(
        Math.sin(world.time * 127.3) * s * 0.6,
        Math.cos(world.time * 149.7) * s * 0.6,
      );
    }
    // Ceiling and floor.
    const ceil = ctx.createLinearGradient(0, 0, 0, VIEW.height / 2);
    ceil.addColorStop(0, '#07080d');
    ceil.addColorStop(1, '#0d0f16');
    ctx.fillStyle = ceil;
    ctx.fillRect(-40, -40, VIEW.width + 80, VIEW.height / 2 + 40);
    const floor = ctx.createLinearGradient(0, VIEW.height / 2, 0, VIEW.height);
    floor.addColorStop(0, '#191411');
    floor.addColorStop(1, '#050404');
    ctx.fillStyle = floor;
    ctx.fillRect(-40, VIEW.height / 2, VIEW.width + 80, VIEW.height / 2 + 40);

    if (world.phase === PHASE_SCARE) {
      // The scare plays over the corridor: the face lunges in, the screen
      // cuts to black, the face slams back in even closer, red pulses.
      castRays(world);
      drawSprites(world);
      drawFlashlight(world);
      const st = world.scareTime;
      const progress = scareProgress(st);
      const blackout = scareBlackout(st);
      if (!blackout) {
        const lunge = scareLunge(st);
        const faceScale = (VIEW.width / 300) * SCARE.faceScale * lunge;
        drawFace(ctx, VIEW.width / 2, VIEW.height / 2, faceScale, progress, world.time);
        // Red vignette: pulses, and bites harder on the second hit.
        const hit = scareHit(st);
        const pulse = 0.5 + 0.5 * Math.sin(world.time * 26);
        const redA = Math.min(
          0.85,
          (hit === 2 ? 0.62 : 0.45) * progress * (0.72 + 0.28 * pulse),
        );
        const red = ctx.createRadialGradient(
          VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.2,
          VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.85,
        );
        red.addColorStop(0, 'rgba(120, 0, 0, 0)');
        red.addColorStop(1, `rgba(120, 0, 0, ${redA.toFixed(3)})`);
        ctx.fillStyle = red;
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      }
      ctx.restore();
      if (blackout) {
        // The cut: near-total black for a split second between the hits.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.97)';
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        return;
      }
      drawHUD(ctx, world, screen);
      return;
    }

    castRays(world);
    drawTellOverlays(world);
    drawSprites(world);
    drawFlashlight(world);
    ctx.restore();

    if (world.phase === PHASE_TITLE) drawTitle(ctx, world);
    else if (world.phase === PHASE_WIN) drawWin(ctx, world);
    else if (world.phase === PHASE_OVER) drawOver(ctx, world);
    else {
      drawHUD(ctx, world, screen);
      if (world.paused) drawPaused(ctx, world);
    }
  }

  return { render, project };
}
