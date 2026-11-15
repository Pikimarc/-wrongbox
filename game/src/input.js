// Input: WASD to move, mouse to look (pointer lock, with click-drag and
// arrow keys as fallbacks so the game works headless too), E or click to
// open the faced door, R restart, P pause, M mute. Produces one fresh
// input object per frame; edge flags (open, selectDelta) are consumed by
// the world and cleared by main.js after each step.
import { MOVE } from './config.js';

export function createInput(canvas) {
  const input = {
    forward: false,
    back: false,
    strafeLeft: false,
    strafeRight: false,
    turnLeft: false,
    turnRight: false,
    turn: 0, // radians accumulated this frame (mouse / drag)
    open: false, // edge: open the faced door
    openIndex: -1, // door index a click landed on, -1 = use facing
    hoverIndex: -1, // door index under the mouse, -1 = none
    mouseX: 0,
    mouseY: 0,
    restart: false, // edge
    pauseToggle: false, // edge
    muteToggle: false, // edge
    start: false, // edge: click/Enter on the title screen
    locked: false, // pointer lock held
    dragging: false,
    lastDragX: 0,
  };

  const keys = {};
  // The browser fires one synthetic mousemove when pointer lock engages
  // (a recenter jump, not a real turn). Ignore it, and clamp any single
  // event's delta so a stray jump can never spin the camera.
  let ignoreNextMove = false;

  function keyDown(e) {
    if (e.repeat) return;
    keys[e.code] = true;
    syncKeys();
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
      if (e.code === 'Enter') input.start = true;
      else input.open = true;
      e.preventDefault();
    }
    if (e.code === 'KeyR') input.restart = true;
    if (e.code === 'KeyP') input.pauseToggle = true;
    if (e.code === 'KeyM') input.muteToggle = true;
  }

  function keyUp(e) {
    keys[e.code] = false;
    syncKeys();
  }

  function syncKeys() {
    input.forward = !!(keys.KeyW || keys.ArrowUp);
    input.back = !!keys.KeyS || !!keys.ArrowDown;
    input.strafeLeft = !!keys.KeyA;
    input.strafeRight = !!keys.KeyD;
    input.turnLeft = !!keys.ArrowLeft;
    input.turnRight = !!keys.ArrowRight;
  }

  function onMouseMove(e) {
    input.mouseX = e.clientX;
    input.mouseY = e.clientY;
    if (ignoreNextMove) {
      ignoreNextMove = false;
      return;
    }
    const dx = Math.max(-100, Math.min(100, e.movementX || 0));
    if (document.pointerLockElement === canvas) {
      input.turn += dx * MOVE.mouseSens;
    } else if (input.dragging) {
      input.turn += (e.clientX - input.lastDragX) * MOVE.dragSens;
      input.lastDragX = e.clientX;
    }
  }

  function onMouseDown(e) {
    input.mouseX = e.clientX;
    input.mouseY = e.clientY;
    // First click on the title screen starts the game (and asks for
    // pointer lock); in play it is a door click.
    if (document.pointerLockElement !== canvas) {
      try { canvas.requestPointerLock(); } catch { /* headless: no lock */ }
    }
    input.dragging = true;
    input.lastDragX = e.clientX;
    input.start = true;
  }

  function onMouseUp(e) {
    input.dragging = false;
    // A quick click (not a drag) opens the faced door.
    if (Math.abs(e.clientX - input.lastDragX) < 6) {
      input.open = true;
    }
  }

  function onLockChange() {
    const locked = document.pointerLockElement === canvas;
    if (locked && !input.locked) ignoreNextMove = true;
    input.locked = locked;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  document.addEventListener('pointerlockchange', onLockChange);

  // Which door index is under the mouse (screen-space), set by the
  // renderer each frame from the raycast hit map.
  input.setHoverFromScreen = (x, doorIndex) => {
    input.mouseX = x;
    input.hoverIndex = doorIndex;
  };

  // Clear the edge flags after the world consumed them.
  input.clearEdges = () => {
    input.open = false;
    input.openIndex = -1;
    input.restart = false;
    input.pauseToggle = false;
    input.muteToggle = false;
    input.start = false;
    input.turn = 0;
  };

  return input;
}
