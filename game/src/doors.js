// The three doors in the gate wall: which one is safe, and the per-door
// animation state each tell reads from. A door is pure data; the renderer
// draws it through the raycaster, the world steps it.
import { DOOR_XS } from './config.js';
import { pickIndex } from './random.js';

// Build the three doors for a room. Each door sits in the door wall (row 0)
// at its grid column; gx is its map column, gz is 0.
export function buildDoors(rng) {
  const safeIndex = pickIndex(rng, DOOR_XS.length);
  return DOOR_XS.map((gx, i) => ({
    index: i,
    gx,
    gz: 0,
    safe: i === safeIndex,
    open: 0, // 0 closed … 1 fully open (slides down as it opens)
    opened: false,
    // Tell animation state.
    lidLift: 0,
    rattleX: 0,
    rattleTimer: 1.5 + i * 0.8,
    rattling: false,
    rattleUntil: 0,
    bleedLength: 0,
    wispPhase: i * 2.1,
    glint: 0,
    moths: [],
  }));
}

export function safeDoor(doors) {
  return doors.find((door) => door.safe) || null;
}

export function wrongDoors(doors) {
  return doors.filter((door) => !door.safe);
}

// The face of a door toward the player (the south face, y = gz + 1).
export function doorFace(door) {
  return { x0: door.gx, x1: door.gx + 1, y: door.gz + 1 };
}
