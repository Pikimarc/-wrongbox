// Rooms: one corridor per gate, built from a seed. The map is a grid:
// '#' wall, '.' floor, 'D' door. The door wall is row 0 with three doors;
// the player starts at the far end and walks north toward them. Each room
// picks a safe door, a tell, and the mood (how dark, how thick the fog, how
// loud the whispers). Difficulty is the tell fading and the dark closing
// in — never a passive sanity drain, so the loop stays clean.
import { MAP_W, MAP_H, DOOR_XS } from './config.js';
import { mulberry32 } from './random.js';
import { buildDoors } from './doors.js';
import { tellForRoom } from './clues.js';

export function roomSeed(baseSeed, room) {
  return (baseSeed + room * 7919) >>> 0;
}

// The grid for a room: side walls, a far wall, and the door wall at row 0.
export function buildMap() {
  const map = [];
  for (let y = 0; y < MAP_H; y += 1) {
    let row = '';
    for (let x = 0; x < MAP_W; x += 1) {
      if (y === 0) {
        row += DOOR_XS.includes(x) ? 'D' : '#';
      } else if (y === MAP_H - 1 || x === 0 || x === MAP_W - 1) {
        row += '#';
      } else {
        row += '.';
      }
    }
    map.push(row);
  }
  return map;
}

export function cellAt(map, x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return '#';
  return map[y][x];
}

export function isSolid(map, x, y, doors) {
  const cell = cellAt(map, x, y);
  if (cell === '#') return true;
  if (cell === 'D') {
    const door = doors.find((d) => d.gx === x && d.gz === y);
    // An open door is passable.
    return !(door && door.open >= 1);
  }
  return false;
}

// Build room `room` (1-based). Returns the room object the world holds.
export function buildRoom(baseSeed, room, previousTellId) {
  const rng = mulberry32(roomSeed(baseSeed, room));
  const map = buildMap();
  const doors = buildDoors(rng);
  const tell = tellForRoom(rng, room, previousTellId);
  const safe = doors.find((d) => d.safe);
  if (tell.id === 'moths' && safe) {
    for (let i = 0; i < 3; i += 1) {
      safe.moths.push({
        angle: rng() * Math.PI * 2,
        radius: 0.5 + rng() * 0.5,
        speed: 0.7 + rng() * 0.6,
        size: 2.5 + rng() * 2,
        height: 0.35 + rng() * 0.4,
      });
    }
  }
  return {
    number: room,
    map,
    doors,
    tell,
    // Mood: darkness 0..1 (vignette + fog), whisper gain 0..1.
    darkness: Math.min(0.85, 0.35 + (room - 1) * 0.055),
    fog: Math.min(0.8, 0.25 + (room - 1) * 0.06),
    whisperGain: room >= 6 ? Math.min(1, 0.5 + (room - 6) * 0.12) : 0.35,
    candlePhase: rng() * Math.PI * 2,
  };
}
