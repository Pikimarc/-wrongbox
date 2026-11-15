// Deterministic screenshot scenes. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, so the frame is what a
// short game really looks like and the same seed always gives the same
// frame. The camera is first-person: the play shot stands the player where
// all three doors read at a glance.
import { STEP } from './config.js';
import { startGame, resetWorld, step, openDoor, updateFacing, PHASE_TITLE, PHASE_PLAY, PHASE_OVER, PHASE_WIN } from './world.js';
import { buildRoom } from './rooms.js';
import { TELLS } from './clues.js';

const START_SECONDS = 4;
const PLAY_IDLE_SECONDS = 3;
// Freeze the scare shot early in hit 1's lunge (scareTime ~0.07 s): the
// face is already fully in and huge, and at this size the huge black eyes
// AND the jagged grin are both in frame. Later (hit 2) the face lunges so
// close that the grin falls below the frame.
const SCARE_HOLD_SECONDS = 0.06;

function blankInput() {
  return {
    forward: false, back: false, strafeLeft: false, strafeRight: false,
    turnLeft: false, turnRight: false, turn: 0,
    open: false, openIndex: -1, hoverIndex: -1,
    restart: false, pauseToggle: false, muteToggle: false, start: false,
  };
}

// Stand the player at (x, y) facing north, toward the doors.
function faceDoors(world, x, y) {
  world.player.x = x;
  world.player.y = y;
  world.player.angle = -Math.PI / 2;
  updateFacing(world);
}

/**
 * Stage the named scene (start, play, scare, end; any other name is start)
 * and return the screen the renderer should draw over the staged world.
 */
export function stageShot(name, world) {
  resetWorld(world, world.seed);
  if (name !== 'play' && name !== 'end' && name !== 'scare') {
    // Title over a living corridor: dust drifts, the candle flickers, the
    // tells breathe — the title screen sits on top of it.
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      step(world, blankInput());
    }
    world.phase = PHASE_TITLE;
    return { screen: PHASE_TITLE, best: 0 };
  }

  if (name === 'scare') {
    // A wrong pick, frozen mid-flash: the face fully in, the shake at its
    // worst. The player stands in front of the leftmost wrong door.
    startGame(world);
    const wrong = world.room.doors.find((d) => !d.safe);
    faceDoors(world, wrong.gx + 0.5, 2.5);
    openDoor(world, wrong.index);
    for (let i = 0; i < SCARE_HOLD_SECONDS / STEP; i += 1) {
      step(world, blankInput());
    }
    return { screen: 'scare', best: world.score };
  }

  if (name === 'end') {
    // The escape: jump to gate 10, open its safe door, walk through.
    startGame(world);
    world.room = buildRoom(world.seed, 10, world.previousTellId);
    const safe = world.room.doors.find((d) => d.safe);
    faceDoors(world, safe.gx + 0.5, 2.5);
    openDoor(world, safe.index);
    // Step forward: the reveal (0.55 s, locked) finishes first, then the
    // player walks through the open door and the win screen lands.
    const walk = blankInput();
    walk.forward = true;
    for (let i = 0; i < 4 / STEP; i += 1) {
      step(world, walk);
      if (world.phase === PHASE_WIN) break;
    }
    return { screen: PHASE_WIN, best: world.score };
  }

  // play: a real first gate, the player stood where all three doors read.
  // Force the warm tell at full strength so the safe door's glow is
  // unmistakable in the frame — the clue line names it, the glow shows it.
  startGame(world);
  world.room.tell = { ...TELLS.warm, strength: 1.0 };
  faceDoors(world, 3.5, 3.5);
  for (let i = 0; i < PLAY_IDLE_SECONDS / STEP; i += 1) {
    step(world, blankInput());
  }
  updateFacing(world);
  if (world.phase === PHASE_OVER) return { screen: PHASE_OVER, best: world.score };
  return { screen: PHASE_PLAY, best: world.score };
}
