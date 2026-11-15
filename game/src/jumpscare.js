// The jumpscare: a procedurally drawn distorted pale face that LUNGES at
// the viewer, cuts to black, then slams back in even closer and louder.
// No borrowed image — every line of the face is drawn from numbers, so it
// is original art. The face is deliberately wrong: one eye higher and much
// bigger than the other, a mouth stretched far too wide, blood-red tear
// streaks, cracks running through the skin.
//
// Timing (seconds into the scare, total SCARE.duration = 0.85):
//   0.00–0.30  hit 1: face slams in instantly and lunges to full size
//   0.30–0.38  black cut: the screen goes near-black for a split second
//   0.38–0.85  hit 2: face slams back in even bigger and closer, then the
//              red vignette swallows it.
import { SCARE } from './config.js';

const HIT1_END = 0.30; // hit 1 ends, the black cut starts
const CUT_END = 0.38; // the cut ends, hit 2 slams in
const HOLD_END = 0.75; // hit 2 holds, then the red swallows the face

// Which hit is on screen: 1, 2, or 0 while the screen is cut to black.
export function scareHit(scareTime) {
  if (scareTime < HIT1_END) return 1;
  if (scareTime < CUT_END) return 0;
  return 2;
}

// True only during the split-second black cut between the two hits.
export function scareBlackout(scareTime) {
  return scareTime >= HIT1_END && scareTime < CUT_END;
}

// Visibility envelope (0..1): how much of the face is there. It appears
// instantly (a ~40 ms slam, not a fade), holds, vanishes for the cut,
// slams back, holds, then the red swallows it.
export function scareProgress(scareTime) {
  if (scareTime < 0.04) return Math.max(0, scareTime / 0.04);
  if (scareTime < HIT1_END) return 1;
  if (scareTime < CUT_END) return 0;
  if (scareTime < CUT_END + 0.04) return (scareTime - CUT_END) / 0.04;
  if (scareTime < HOLD_END) return 1;
  if (scareTime < SCARE.duration) {
    return Math.max(0, 1 - (scareTime - HOLD_END) / (SCARE.duration - HOLD_END));
  }
  return 0;
}

// Lunge: how much bigger than its base size the face is drawn. Hit 1 slams
// from half size to full in ~100 ms; hit 2 slams from full to half as big
// again in ~80 ms, then creeps closer as the red closes in.
export function scareLunge(scareTime) {
  if (scareTime < 0.10) return 0.45 + 0.55 * (scareTime / 0.10);
  if (scareTime < CUT_END) return 1.0;
  if (scareTime < CUT_END + 0.08) return 1.0 + 0.45 * ((scareTime - CUT_END) / 0.08);
  return 1.45 + 0.10 * Math.min(1, (scareTime - CUT_END - 0.08) / 0.4);
}

// Screen shake during the scare: violent, with a second spike on hit 2.
// The renderer translates by sin/cos * shake * 0.6, so 54 is about ±32 px.
export function scareShake(scareTime) {
  if (scareTime < HIT1_END) return 46 - 26 * (scareTime / HIT1_END); // 46 -> 20
  if (scareTime < CUT_END) return 6; // the cut: almost still, the silence before hit 2
  if (scareTime < CUT_END + 0.12) return 54; // hit 2 spike
  return Math.max(10, 54 - 44 * ((scareTime - CUT_END - 0.12) / 0.35)); // 54 -> 10
}

// Draw the face at (cx, cy) with the given scale and progress. The face is
// built from ellipses and bezier curves: a pale oval, hollow near-black
// eyes with tiny wrong-way pupils, blood-red tear streaks, a mouth
// stretched far too wide, thin cracks. Heavy asymmetry on purpose —
// nothing on this face lines up.
export function drawFace(ctx, cx, cy, scale, progress, time) {
  if (progress <= 0) return;
  const wobble = Math.sin(time * 61) * 5 * progress;
  const wobbleY = Math.cos(time * 53) * 4 * progress;
  const s = scale;
  ctx.save();
  ctx.translate(cx + wobble, cy + wobbleY);
  ctx.rotate(Math.sin(time * 43) * 0.05 * progress);
  ctx.scale(s, s * 1.18);

  // Pale head, with a dark outline so it pops out of the corridor.
  ctx.fillStyle = '#cfc8b8';
  ctx.beginPath();
  ctx.ellipse(0, 0, 150, 185, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30, 8, 8, 0.9)';
  ctx.lineWidth = 4;
  ctx.stroke();
  // Sickly bruised shading around the edges.
  ctx.fillStyle = 'rgba(52, 44, 38, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 150, 185, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cfc8b8';
  ctx.beginPath();
  ctx.ellipse(-6, -8, 128, 160, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bruised sockets: dark red-black halos behind the huge eyes.
  ctx.fillStyle = 'rgba(40, 4, 4, 0.75)';
  ctx.beginPath();
  ctx.ellipse(-56, -56, 64, 76, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(60, -34, 58, 70, -0.12, 0, Math.PI * 2);
  ctx.fill();

  // HUGE hollow eyes — near-black pits that take up most of the face,
  // one much bigger and higher than the other.
  ctx.fillStyle = '#030101';
  ctx.beginPath();
  ctx.ellipse(-56, -58, 56, 68, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(60, -34, 50, 62, -0.14, 0, Math.PI * 2);
  ctx.fill();
  // Tiny glowing pupils: pale green-white pinpricks, staring the wrong
  // way (toward the nose). A soft halo makes them glow in the dark.
  const pupilGlow = (x, y, r) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, 'rgba(190, 255, 180, 0.85)');
    g.addColorStop(0.4, 'rgba(150, 240, 140, 0.25)');
    g.addColorStop(1, 'rgba(150, 240, 140, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dcffd2';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  pupilGlow(-44, -52, 2.5);
  pupilGlow(52, -40, 2);

  // Blood-red tear streaks running down from the eyes.
  ctx.strokeStyle = 'rgba(96, 6, 6, 0.92)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-64, 12);
  ctx.quadraticCurveTo(-70, 40, -58, 62);
  ctx.moveTo(-44, 14);
  ctx.quadraticCurveTo(-40, 42, -48, 66);
  ctx.moveTo(54, 30);
  ctx.quadraticCurveTo(60, 52, 50, 74);
  ctx.stroke();
  // A streak from the mouth corner.
  ctx.beginPath();
  ctx.moveTo(-102, 96);
  ctx.quadraticCurveTo(-110, 122, -100, 146);
  ctx.stroke();

  // Nose: two dark slits, longer than they should be.
  ctx.strokeStyle = '#1a1512';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-8, 14);
  ctx.lineTo(-18, 42);
  ctx.moveTo(10, 16);
  ctx.lineTo(20, 42);
  ctx.stroke();

  // Mouth: an ENORMOUS grin spanning almost the whole face, black, with
  // a dark-red rim glowing behind it, packed with sharp jagged teeth.
  ctx.fillStyle = 'rgba(90, 4, 4, 0.85)';
  ctx.beginPath();
  ctx.moveTo(-118, 72);
  ctx.quadraticCurveTo(0, 44, 120, 76);
  ctx.quadraticCurveTo(88, 156, 0, 166);
  ctx.quadraticCurveTo(-88, 154, -118, 72);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(-112, 78);
  ctx.quadraticCurveTo(0, 52, 114, 82);
  ctx.quadraticCurveTo(82, 146, 0, 156);
  ctx.quadraticCurveTo(-82, 144, -112, 78);
  ctx.fill();
  // Jagged teeth: pointed triangles, uneven and overlapping — the top
  // row hangs down from the upper lip, the bottom row juts up.
  ctx.fillStyle = '#ddd6c2';
  for (let i = -5; i <= 5; i += 1) {
    const x = i * 19 + (i % 2 === 0 ? 4 : -3);
    const len = 12 + (Math.abs(i * 7 + 3) % 5) * 4;
    const yTop = 66 + Math.abs(i) * 2.2;
    ctx.beginPath();
    ctx.moveTo(x - 7, yTop);
    ctx.lineTo(x + 7, yTop);
    ctx.lineTo(x + 1, yTop + len);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = -4; i <= 4; i += 1) {
    const x = i * 22 + (i % 2 === 0 ? -4 : 3);
    const len = 10 + (Math.abs(i * 5 + 2) % 4) * 4;
    const yBot = 156 - Math.abs(i) * 11;
    ctx.beginPath();
    ctx.moveTo(x - 6, yBot);
    ctx.lineTo(x + 6, yBot);
    ctx.lineTo(x - 1, yBot - len);
    ctx.closePath();
    ctx.fill();
  }

  // Cracks across the face — forehead, through the left eye, chin.
  ctx.strokeStyle = 'rgba(20, 12, 12, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-120, -120);
  ctx.lineTo(-70, -60);
  ctx.lineTo(-96, -10);
  ctx.lineTo(-50, 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(120, -100);
  ctx.lineTo(80, -40);
  ctx.lineTo(104, 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(30, 150);
  ctx.lineTo(10, 178);
  ctx.lineTo(34, 190);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-130, -140);
  ctx.lineTo(-60, -128);
  ctx.lineTo(-20, -148);
  ctx.lineTo(40, -132);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-40, 168);
  ctx.lineTo(-10, 186);
  ctx.lineTo(-30, 196);
  ctx.stroke();

  ctx.restore();
}
