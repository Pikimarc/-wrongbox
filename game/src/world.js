// THE WRONG BOX — the world, first-person version: one state object, one
// step function. The player walks a grid corridor (raycast by the renderer)
// toward a wall with 3 doors. The renderer only reads this; input only
// writes the input flags. Fixed-step: main.js calls step() at 60 Hz.
import { STEP, RUN, SCARE, MOVE, PLAYER_START, MAP_W, MAP_H, PHASE_TITLE, PHASE_PLAY, PHASE_SCARE, PHASE_WIN, PHASE_OVER, EVENT_NONE, EVENT_PICK_RIGHT, EVENT_PICK_WRONG, EVENT_SCARE_END, EVENT_WIN, EVENT_OVER, EVENT_ROOM, EVENT_DOOR_OPEN } from './config.js';
import { buildRoom, isSolid, cellAt } from './rooms.js';
import { safeDoor, wrongDoors } from './doors.js';
import { scareShake } from './jumpscare.js';

export { PHASE_TITLE, PHASE_PLAY, PHASE_SCARE, PHASE_WIN, PHASE_OVER };

export function createWorld(seed) {
  const world = {
    seed,
    time: 0,
    phase: PHASE_TITLE,
    paused: false,
    muted: false,
    room: null,
    previousTellId: null,
    sanity: RUN.sanityStart,
    score: 0,
    elapsed: 0,
    roomsCleared: 0,
    player: { x: PLAYER_START.x, y: PLAYER_START.y, angle: PLAYER_START.angle },
    facingDoor: -1, // door index the crosshair is on, -1 = none
    facingDist: Infinity,
    scareTime: 0,
    revealTimer: 0,
    revealDoor: null,
    throughTimer: 0, // fade after walking through the open door
    locked: false,
    shake: 0,
    pulse: 0,
    heartbeatTimer: 1.0,
    heartbeatBeat: false, // set for one step when a beat fires (sound reads it)
    best: 0,
    stats: { picks: 0, right: 0, wrong: 0 },
    dust: [],
    candle: 0,
  };
  resetWorld(world, seed);
  return world;
}

export function resetWorld(world, seed) {
  world.seed = seed;
  world.time = 0;
  world.phase = PHASE_TITLE;
  world.paused = false;
  world.sanity = RUN.sanityStart;
  world.score = 0;
  world.elapsed = 0;
  world.roomsCleared = 0;
  world.player.x = PLAYER_START.x;
  world.player.y = PLAYER_START.y;
  world.player.angle = PLAYER_START.angle;
  world.facingDoor = -1;
  world.facingDist = Infinity;
  world.scareTime = 0;
  world.revealTimer = 0;
  world.revealDoor = null;
  world.throughTimer = 0;
  world.locked = false;
  world.shake = 0;
  world.pulse = 0;
  world.heartbeatTimer = 1.0;
  world.heartbeatBeat = false;
  world.previousTellId = null;
  world.stats = { picks: 0, right: 0, wrong: 0 };
  world.room = buildRoom(seed, 1, null);
  world.dust = [];
  let s = seed * 31 + 7;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 42; i += 1) {
    world.dust.push({
      x: 1 + rnd() * (MAP_W - 2),
      y: 1 + rnd() * (MAP_H - 2),
      h: 0.15 + rnd() * 0.6,
      r: 0.6 + rnd() * 1.8,
      speed: 0.05 + rnd() * 0.12,
      phase: rnd() * Math.PI * 2,
    });
  }
}

export function startGame(world) {
  resetWorld(world, world.seed);
  world.phase = PHASE_PLAY;
}

// Rebuild the current room with a fresh tell and safe door (after a wrong
// pick, the same gate comes back changed). The player stays where they are.
function reshuffleRoom(world) {
  const number = world.room.number;
  world.room = buildRoom(world.seed, number, world.previousTellId);
  world.previousTellId = world.room.tell.id;
}

function advanceRoom(world) {
  world.roomsCleared += 1;
  if (world.room.number >= RUN.roomsToEscape) {
    const timeBonus = Math.max(0, RUN.scoreWinBase - Math.floor(world.elapsed));
    world.score += timeBonus;
    world.phase = PHASE_WIN;
    if (world.score > world.best) world.best = world.score;
    return EVENT_WIN;
  }
  world.previousTellId = world.room.tell.id;
  world.room = buildRoom(world.seed, world.room.number + 1, world.previousTellId);
  world.previousTellId = world.room.tell.id;
  world.player.x = PLAYER_START.x;
  world.player.y = PLAYER_START.y;
  world.player.angle = PLAYER_START.angle;
  world.facingDoor = -1;
  return EVENT_ROOM;
}

// Open the door the player faces. Safe: it swings open and the player walks
// through. Wrong: jumpscare.
export function openDoor(world, index) {
  if (world.phase !== PHASE_PLAY || world.locked || world.paused) return EVENT_NONE;
  const door = world.room.doors[index];
  if (!door || door.opened) return EVENT_NONE;
  world.stats.picks += 1;
  if (door.safe) {
    world.stats.right += 1;
    door.opened = true;
    world.revealDoor = door;
    world.revealTimer = 0.55;
    world.locked = true;
    world.score += RUN.scoreRoom;
    world.sanity = Math.min(RUN.sanityStart, world.sanity + RUN.sanityRight);
    return EVENT_PICK_RIGHT;
  }
  world.stats.wrong += 1;
  world.sanity -= RUN.sanityWrong;
  world.phase = PHASE_SCARE;
  world.scareTime = 0;
  world.shake = 26;
  return EVENT_PICK_WRONG;
}

function heartbeatInterval(sanity) {
  // 1.15 s at full sanity, 0.45 s when it is nearly gone.
  return 0.45 + (sanity / RUN.sanityStart) * 0.7;
}

// Which door (if any) the centre of the view is on, and how far away.
export function updateFacing(world) {
  const p = world.player;
  const dx = Math.cos(p.angle);
  const dy = Math.sin(p.angle);
  let best = -1;
  let bestD = Infinity;
  for (const door of world.room.doors) {
    // The door face is the segment x in [gx, gx+1] at y = 1, facing south.
    const cx = door.gx + 0.5;
    const cy = 1;
    const rx = cx - p.x;
    const ry = cy - p.y;
    const along = rx * dx + ry * dy;
    if (along <= 0.2) continue;
    const perp = Math.abs(rx * dy - ry * dx);
    // Half-width of the door as seen from this distance.
    const half = 0.5 / along;
    if (perp / along > half + 0.05) continue;
    if (along < bestD) {
      bestD = along;
      best = door.index;
    }
  }
  world.facingDoor = best;
  world.facingDist = bestD;
  return best;
}

function tryMove(world, nx, ny) {
  const r = MOVE.radius;
  const map = world.room.map;
  const doors = world.room.doors;
  // X axis first: test the leading edge against both y corners.
  const xDir = Math.sign(nx - world.player.x) || 1;
  const xEdge = nx + xDir * r;
  if (!isSolid(map, Math.floor(xEdge), Math.floor(world.player.y - r), doors)
    && !isSolid(map, Math.floor(xEdge), Math.floor(world.player.y + r), doors)) {
    world.player.x = nx;
  }
  // Then Y axis, with the (possibly new) x.
  const yDir = Math.sign(ny - world.player.y) || 1;
  const yEdge = ny + yDir * r;
  if (!isSolid(map, Math.floor(world.player.x - r), Math.floor(yEdge), doors)
    && !isSolid(map, Math.floor(world.player.x + r), Math.floor(yEdge), doors)) {
    world.player.y = ny;
  }
}

export function step(world, input) {
  let events = EVENT_NONE;
  world.time += STEP;
  world.candle = Math.sin(world.time * 7.3) * 0.5 + Math.sin(world.time * 13.7) * 0.3;
  world.heartbeatBeat = false;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - STEP * 40);
  if (world.pulse > 0) world.pulse = Math.max(0, world.pulse - STEP * 2.2);

  // Dust always drifts, even on the title screen.
  for (const mote of world.dust) {
    mote.y -= mote.speed * STEP;
    mote.x += Math.sin(world.time * 0.5 + mote.phase) * 0.05 * STEP;
    if (mote.y < 0.6) mote.y = MAP_H - 1.2;
  }

  if (world.phase === PHASE_TITLE) {
    animateTells(world);
    return events;
  }

  if (world.phase === PHASE_SCARE) {
    world.scareTime += STEP;
    // Violent shake follows the scare's own beat: hard on hit 1, almost
    // still during the black cut, spiking again on hit 2.
    world.shake = scareShake(world.scareTime);
    if (world.scareTime >= SCARE.duration) {
      events |= EVENT_SCARE_END;
      if (world.sanity <= 0) {
        world.phase = PHASE_OVER;
        if (world.score > world.best) world.best = world.score;
        events |= EVENT_OVER;
      } else {
        reshuffleRoom(world);
        world.phase = PHASE_PLAY;
      }
    }
    return events;
  }

  if (world.phase === PHASE_WIN || world.phase === PHASE_OVER) {
    return events;
  }

  // PHASE_PLAY from here.
  if (!world.paused) world.elapsed += STEP;
  animateTells(world);

  // Heartbeat quickens as sanity falls.
  if (!world.paused) {
    world.heartbeatTimer -= STEP;
    if (world.heartbeatTimer <= 0) {
      world.heartbeatTimer = heartbeatInterval(world.sanity);
      world.pulse = 1;
      world.heartbeatBeat = true;
    }
  }

  // Reveal: the safe door swings open, then the player walks through it.
  if (world.revealDoor) {
    world.revealTimer -= STEP;
    world.revealDoor.open = Math.min(1, world.revealDoor.open + STEP / 0.55);
    if (world.revealTimer <= 0) {
      world.revealDoor = null;
      world.locked = false;
      events |= EVENT_DOOR_OPEN;
    }
    return events;
  }

  // Walked through the open door into the next corridor.
  if (world.player.y < 0.9) {
    events |= advanceRoom(world);
    return events;
  }

  if (world.paused) return events;

  // Look: arrow keys turn, mouse/drag deltas turn (input.turn is radians
  // accumulated this step).
  if (input.turn !== 0) world.player.angle += input.turn;
  if (input.turnLeft) world.player.angle -= MOVE.turnSpeed * STEP;
  if (input.turnRight) world.player.angle += MOVE.turnSpeed * STEP;

  // Move: WASD, relative to where the player faces.
  const fwdX = Math.cos(world.player.angle);
  const fwdY = Math.sin(world.player.angle);
  const rightX = -fwdY;
  const rightY = fwdX;
  let mx = 0;
  let my = 0;
  if (input.forward) { mx += fwdX * MOVE.walkSpeed * STEP; my += fwdY * MOVE.walkSpeed * STEP; }
  if (input.back) { mx -= fwdX * MOVE.walkSpeed * STEP; my -= fwdY * MOVE.walkSpeed * STEP; }
  if (input.strafeLeft) { mx -= rightX * MOVE.strafeSpeed * STEP; my -= rightY * MOVE.strafeSpeed * STEP; }
  if (input.strafeRight) { mx += rightX * MOVE.strafeSpeed * STEP; my += rightY * MOVE.strafeSpeed * STEP; }
  if (mx !== 0 || my !== 0) {
    tryMove(world, world.player.x + mx, world.player.y + my);
  }

  updateFacing(world);

  // Open the faced door (E or click).
  if (input.open) {
    const target = input.openIndex >= 0 ? input.openIndex : world.facingDoor;
    if (target >= 0 && world.facingDist <= MOVE.interactDist) {
      events |= openDoor(world, target);
    }
  }
  return events;
}

// Drive every tell's animation from the world clock.
function animateTells(world) {
  const room = world.room;
  if (!room) return;
  const tell = room.tell;
  const strength = tell.strength;
  const safe = safeDoor(room.doors);
  const wrongs = wrongDoors(room.doors);
  if (tell.id === 'breathe' && safe) {
    safe.lidLift = (Math.sin(world.time * 1.4) * 0.5 + 0.5) * 4 * strength;
  }
  if (tell.id === 'whisper') {
    for (const door of wrongs) door.wispPhase = world.time * 1.1 + door.index * 2.1;
  }
  if (tell.id === 'rattle') {
    for (const door of wrongs) {
      door.rattleTimer -= STEP;
      if (door.rattleTimer <= 0) {
        door.rattling = true;
        door.rattleTimer = 2.0 + (door.index % 2) * 0.9;
        door.rattleUntil = world.time + 0.35;
      }
      if (door.rattling) {
        if (world.time >= door.rattleUntil) {
          door.rattling = false;
          door.rattleX = 0;
        } else {
          door.rattleX = Math.sin(world.time * 55) * 1.6 * strength;
        }
      }
    }
  }
  if (tell.id === 'bleed') {
    for (const door of wrongs) {
      door.bleedLength = Math.min(26 * strength, door.bleedLength + STEP * 3);
    }
  }
  if (tell.id === 'moths' && safe) {
    for (const moth of safe.moths) moth.angle += moth.speed * STEP;
  }
}

// The cell the centre ray hits (for the renderer's crosshair check).
export function centreHit(world) {
  return { door: world.facingDoor, dist: world.facingDist };
}

export { cellAt };
