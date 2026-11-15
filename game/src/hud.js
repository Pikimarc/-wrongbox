// HUD and screens, drawn in canvas 2D over the raycast view. The HUD is
// the player's feedback: sanity, room, score, time, the clue, and the
// crosshair with its "open the door" prompt.
import { VIEW, RUN, MOVE } from './config.js';

function fmtTime(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

export function drawHUD(ctx, world, screen) {
  const W = VIEW.width;
  const H = VIEW.height;
  // Top bar: sanity on the left, room in the middle, score and time right.
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(3, 3, 5, 0.55)';
  ctx.fillRect(0, 0, W, 64);

  // Sanity bar.
  const bx = 28;
  const by = 20;
  const bw = 260;
  const bh = 16;
  ctx.fillStyle = '#1a1414';
  ctx.fillRect(bx, by, bw, bh);
  const frac = Math.max(0, world.sanity / RUN.sanityStart);
  ctx.fillStyle = world.sanity < 30 ? '#c02727' : '#7a1f1f';
  ctx.fillRect(bx, by, bw * frac, bh);
  ctx.strokeStyle = 'rgba(216, 211, 195, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw, bh);
  ctx.fillStyle = '#d8d3c3';
  ctx.font = '600 13px sans-serif';
  ctx.fillText('SANITY', bx, by + 32);
  ctx.font = '700 15px sans-serif';
  ctx.fillText(`${Math.ceil(world.sanity)}`, bx + bw + 10, by + 13);

  // Room and score.
  ctx.font = '700 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8d3c3';
  ctx.fillText(`ROOM ${Math.min(world.room.number, RUN.roomsToEscape)} / ${RUN.roomsToEscape}`, W / 2, 30);
  ctx.font = '600 14px sans-serif';
  ctx.fillStyle = '#8b8676';
  ctx.fillText(`SCORE ${world.score}`, W / 2, 52);
  ctx.textAlign = 'left';
  ctx.font = '700 18px sans-serif';
  ctx.fillStyle = '#d8d3c3';
  ctx.fillText(fmtTime(world.elapsed), W - 110, 32);
  ctx.font = '600 12px sans-serif';
  ctx.fillStyle = '#8b8676';
  ctx.fillText('TIME', W - 110, 52);

  // Crosshair.
  const cx = W / 2;
  const cy = H / 2;
  ctx.fillStyle = 'rgba(216, 211, 195, 0.9)';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(216, 211, 195, 0.45)';
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.stroke();

  // The clue, bottom centre — the heart of the game.
  ctx.font = '600 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8d3c3';
  ctx.fillText(world.room.tell.clue, W / 2, H - 56);
  ctx.font = '400 13px sans-serif';
  ctx.fillStyle = '#8b8676';
  ctx.fillText(world.room.tell.hint, W / 2, H - 32);
  ctx.textAlign = 'left';

  // "Open the door" prompt when the crosshair is on a door in reach.
  if (world.facingDoor >= 0 && world.facingDist <= MOVE.interactDist && !world.locked) {
    ctx.font = '700 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb347';
    ctx.fillText('E  —  OPEN THE DOOR', W / 2, H / 2 + 64);
    ctx.textAlign = 'left';
  }

  // Controls reminder, faint, bottom left.
  ctx.font = '400 12px sans-serif';
  ctx.fillStyle = 'rgba(139, 134, 118, 0.75)';
  ctx.fillText('WASD move · mouse look · E open · R restart · P pause · M mute', 28, H - 14);
  void screen;
}

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(2, 2, 4, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

export function drawTitle(ctx, world) {
  dimScreen(ctx);
  const W = VIEW.width;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8d3c3';
  ctx.font = '800 84px Georgia, serif';
  ctx.fillText('THE WRONG BOX', W / 2, 250);
  ctx.font = '400 21px Georgia, serif';
  ctx.fillStyle = '#8b8676';
  ctx.fillText('Ten gates stand between you and the morning. One door in each is safe.', W / 2, 300);
  ctx.fillText('The others do not forgive.', W / 2, 330);
  ctx.font = '600 18px sans-serif';
  ctx.fillStyle = '#d8d3c3';
  ctx.fillText('Read the clue. Watch the doors. Pick wrong and it finds you.', W / 2, 400);
  ctx.font = '400 15px sans-serif';
  ctx.fillStyle = '#8b8676';
  ctx.fillText('WASD walk · mouse look · E open the door · R restart', W / 2, 440);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 2.4);
  ctx.font = '700 24px sans-serif';
  ctx.fillStyle = `rgba(255, 179, 71, ${pulse.toFixed(3)})`;
  ctx.fillText('CLICK TO ENTER', W / 2, 520);
  ctx.textAlign = 'left';
  void world;
}

export function drawWin(ctx, world) {
  dimScreen(ctx);
  const W = VIEW.width;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffcf7a';
  ctx.font = '800 76px Georgia, serif';
  ctx.fillText('YOU ESCAPED', W / 2, 280);
  ctx.font = '400 20px Georgia, serif';
  ctx.fillStyle = '#d8d3c3';
  ctx.fillText('Ten gates. Ten right doors. The corridor lets you go.', W / 2, 330);
  ctx.font = '700 26px sans-serif';
  ctx.fillStyle = '#d8d3c3';
  ctx.fillText(`SCORE  ${world.score}`, W / 2, 410);
  ctx.font = '400 17px sans-serif';
  ctx.fillStyle = '#8b8676';
  ctx.fillText(`Time ${fmtTime(world.elapsed)}  ·  Wrong picks ${world.stats.wrong}  ·  Best ${world.best}`, W / 2, 450);
  ctx.font = '700 22px sans-serif';
  ctx.fillStyle = '#ffb347';
  ctx.fillText('Press R to walk it again', W / 2, 520);
  ctx.textAlign = 'left';
}

export function drawOver(ctx, world) {
  dimScreen(ctx);
  const W = VIEW.width;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c02727';
  ctx.font = '800 72px Georgia, serif';
  ctx.fillText('THE DARK TAKES YOU', W / 2, 280);
  ctx.font = '400 20px Georgia, serif';
  ctx.fillStyle = '#d8d3c3';
  ctx.fillText('Your sanity is gone. The corridor keeps the rest of you.', W / 2, 330);
  ctx.font = '700 26px sans-serif';
  ctx.fillText(`SCORE  ${world.score}`, W / 2, 410);
  ctx.font = '400 17px sans-serif';
  ctx.fillStyle = '#8b8676';
  ctx.fillText(`You reached room ${world.roomsCleared + 1} of ${RUN.roomsToEscape}  ·  Best ${world.best}`, W / 2, 450);
  ctx.font = '700 22px sans-serif';
  ctx.fillStyle = '#ffb347';
  ctx.fillText('Press R to try again', W / 2, 520);
  ctx.textAlign = 'left';
}

export function drawPaused(ctx, world) {
  ctx.fillStyle = 'rgba(2, 2, 4, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8d3c3';
  ctx.font = '800 56px Georgia, serif';
  ctx.fillText('PAUSED', VIEW.width / 2, 340);
  ctx.font = '400 17px sans-serif';
  ctx.fillStyle = '#8b8676';
  ctx.fillText('Press P to keep walking', VIEW.width / 2, 380);
  ctx.textAlign = 'left';
  void world;
}
