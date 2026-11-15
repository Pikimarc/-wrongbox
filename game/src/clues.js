// The tells: the observable clue that marks the safe box (or marks the
// wrong ones). Every room shows one clue line in the HUD; the player has to
// watch the boxes and find it. The tells get subtler as the rooms climb —
// strength() fades from 1.0 in room 1 to about 0.35 in room 10.
export const TELLS = {
  breathe: {
    id: 'breathe',
    // The SAFE box breathes: its lid rises and falls, faintly.
    clue: 'CLUE — One box breathes. Watch the lids.',
    hint: 'The safe lid rises and falls.',
  },
  whisper: {
    id: 'whisper',
    // The WRONG boxes whisper: faint wisps curl out of them. The safe one
    // is silent.
    clue: 'CLUE — Only one box is silent. Listen.',
    hint: 'The wrong boxes whisper. The safe one is quiet.',
  },
  warm: {
    id: 'warm',
    // The SAFE box sits in a faint warm glow.
    clue: 'CLUE — Follow the warm light.',
    hint: 'A faint warm glow pools under the safe box.',
  },
  bleed: {
    id: 'bleed',
    // The WRONG boxes bleed: dark drips run from under them.
    clue: 'CLUE — The safe box does not bleed.',
    hint: 'Dark drips run from under the wrong boxes.',
  },
  rattle: {
    id: 'rattle',
    // The WRONG boxes rattle in short bursts.
    clue: 'CLUE — The safe box is still. The others rattle.',
    hint: 'The wrong boxes shudder in bursts.',
  },
  moths: {
    id: 'moths',
    // Pale moths circle the SAFE box, drawn to its warmth.
    clue: 'CLUE — The moths know. Follow them.',
    hint: 'Pale moths circle the safe box.',
  },
};

export const TELL_IDS = ['breathe', 'whisper', 'warm', 'bleed', 'rattle', 'moths'];

// How strong a tell reads in a room: 1.0 early, fading to ~0.35 by room 10.
export function tellStrength(room) {
  return Math.max(0.35, 1 - (room - 1) * 0.072);
}

export function tellForRoom(rng, room, previousTellId) {
  // Pick a tell that is not the previous room's, so no two rooms in a row
  // test the same sense.
  const pool = TELL_IDS.filter((id) => id !== previousTellId);
  const id = pool[Math.floor(rng() * pool.length)];
  return { ...TELLS[id], strength: tellStrength(room) };
}
