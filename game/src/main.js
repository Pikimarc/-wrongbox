// THE WRONG BOX — boot and main loop. Fixed-step simulation (60 Hz)
// separate from rendering; the renderer's raycast reads the world each
// frame. Shot mode (?shot=start|play|scare|end&seed=N) stages a scene,
// renders it twice, freezes, and sets window.__shotReady for the capture
// tool. The game exposes window.__wrongbox for play-testing.
import { STEP, VIEW, PHASE_TITLE, PHASE_PLAY, PHASE_SCARE, PHASE_WIN, PHASE_OVER, EVENT_PICK_WRONG, EVENT_DOOR_OPEN } from './config.js';
import { createWorld, startGame, step } from './world.js';
import { createInput } from './input.js';
import { createSound } from './sound.js';
import { createRenderer } from './render.js';
import { makeTextures } from './textures.js';
import { stageShot } from './shots.js';

window.__errors = [];
window.addEventListener('error', (event) => {
  window.__errors.push(String(event.message || event.error || 'error'));
});

const canvas = document.getElementById('game');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 7) >>> 0;

const world = createWorld(seed);
const input = createInput(canvas);
const sound = createSound();
const textures = makeTextures();
const renderer = createRenderer(canvas, textures);

window.__wrongbox = { world, input, sound, renderer, textures };

function screenName() {
  if (world.phase === PHASE_TITLE) return 'title';
  if (world.phase === PHASE_WIN) return 'win';
  if (world.phase === PHASE_OVER) return 'over';
  if (world.phase === PHASE_SCARE) return 'scare';
  return 'play';
}

function handleEvents(events) {
  if (events & EVENT_PICK_WRONG) sound.sting();
  if (events & EVENT_DOOR_OPEN) sound.creak();
  if (world.heartbeatBeat) {
    const strength = 0.45 + (1 - world.sanity / 100) * 0.55;
    sound.heartbeat(strength);
  }
  // Whisper bed leans away from the safe door: the wrong side whispers.
  if (world.room) {
    const safe = world.room.doors.find((d) => d.safe);
    const pan = safe ? (3.5 - (safe.gx + 0.5)) * 0.25 : 0;
    sound.setWhisper(world.room.whisperGain * 0.1, pan);
  }
}

if (shotName) {
  // Deterministic screenshot mode: stage, render twice, freeze.
  const staged = stageShot(shotName, world);
  renderer.render(world, staged.screen);
  renderer.render(world, staged.screen);
  window.__shotReady = true;
} else {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += dt;
    // Title screen: any click or Enter starts (and unlocks audio).
    if (world.phase === PHASE_TITLE && input.start) {
      sound.unlock();
      startGame(world);
    }
    if (input.restart && (world.phase === PHASE_PLAY || world.phase === PHASE_WIN || world.phase === PHASE_OVER)) {
      startGame(world);
    }
    if (input.pauseToggle && world.phase === PHASE_PLAY) {
      world.paused = !world.paused;
    }
    if (input.muteToggle) {
      world.muted = !world.muted;
      sound.setMuted(world.muted);
    }
    let guard = 0;
    while (acc >= STEP && guard < 8) {
      const events = step(world, input);
      handleEvents(events);
      input.clearEdges();
      acc -= STEP;
      guard += 1;
    }
    if (guard >= 8) acc = 0;
    // Hover: which door is under the mouse (screen-space, from the raycast
    // centre is the crosshair; a click opens the faced door).
    renderer.render(world, screenName());
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
