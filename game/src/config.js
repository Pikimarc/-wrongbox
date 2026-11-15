// THE WRONG BOX — shared constants. First-person raycasting version: you
// walk a dark corridor (a grid map) toward a wall with 3 doors. One door is
// safe; the other two are wrong.
export const STEP = 1 / 60; // fixed simulation step, seconds
export const VIEW = { width: 1280, height: 720 };

// Raycasting.
export const RAYS = 640; // one ray per 2 screen pixels
export const FOV = (66 * Math.PI) / 180; // horizontal field of view
export const PLANE = Math.tan(FOV / 2); // camera plane half-width
export const TEX = 64; // wall/door texture size (px)
export const MAX_DEPTH = 32;

// The corridor map: 7 cells wide, 20 cells long. The door wall is row 0;
// the player starts at the far end, facing the doors (north, -y).
export const MAP_W = 7;
export const MAP_H = 20;
export const DOOR_XS = [2, 3, 4]; // door columns in the door wall (row 0)
export const PLAYER_START = { x: 3.5, y: 17.5, angle: -Math.PI / 2 };

// Movement.
export const MOVE = {
  walkSpeed: 3.4, // cells per second
  strafeSpeed: 2.6,
  turnSpeed: 2.6, // rad/s (arrow keys)
  mouseSens: 0.0026, // rad per mouse pixel (pointer lock)
  dragSens: 0.005, // rad per pixel (click-drag fallback)
  radius: 0.22, // player collision radius (cells)
  interactDist: 2.6, // how close a door must be to open it
};

// The run: how many gates to escape, and the sanity economy.
export const RUN = {
  roomsToEscape: 10,
  sanityStart: 100,
  sanityWrong: 34, // three wrong picks ends the run
  sanityRight: 5, // correct pick restores a little
  scoreRoom: 250,
  scoreWinBase: 900, // win bonus shrinks as the clock grows
};

// Jumpscare timing: short and sudden — about 0.85 s total, two hits with
// a black cut between them. Hit 1 slams in, the screen cuts to black for a
// split second, hit 2 slams back in even closer, then the red swallows it.
export const SCARE = { duration: 0.85, faceScale: 1.0 };

// Phases the world can be in.
export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_SCARE = 'scare';
export const PHASE_WIN = 'win';
export const PHASE_OVER = 'over';

// Events the step function reports (bit flags).
export const EVENT_NONE = 0;
export const EVENT_PICK_RIGHT = 1;
export const EVENT_PICK_WRONG = 2;
export const EVENT_SCARE_END = 4;
export const EVENT_WIN = 8;
export const EVENT_OVER = 16;
export const EVENT_ROOM = 32;
export const EVENT_DOOR_OPEN = 64;
