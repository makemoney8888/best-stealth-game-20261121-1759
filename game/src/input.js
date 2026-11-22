// Lantern's Shadow — keyboard and mouse input.
// WASD / arrow keys move; clicking the canvas sets a click-to-move target.
// Enter / Space confirms on menus; P or Escape pauses; M mutes.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.clickTarget = null; // {x, y} in canvas pixels, or null
    this.onConfirm = null; // called on Enter / Space
    this.onPause = null; // called on P / Escape
    this.onMute = null; // called on M
    this.onAnyKey = null; // called on any keydown (wakes audio)
    this._canvas = canvas;
    this._onKeyDown = (e) => this._keyDown(e);
    this._onKeyUp = (e) => this._keyUp(e);
    this._onMouseDown = (e) => this._mouseDown(e);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousedown', this._onMouseDown);
  }

  _keyDown(e) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (this.onAnyKey) this.onAnyKey();
    if (k === 'enter' || k === ' ') {
      if (this.onConfirm) this.onConfirm();
      return;
    }
    if (k === 'p' || k === 'escape') {
      if (this.onPause) this.onPause();
      return;
    }
    if (k === 'm') {
      if (this.onMute) this.onMute();
      return;
    }
    this.keys.add(k);
    // Any movement key cancels a click-to-move target.
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      this.clickTarget = null;
    }
  }

  _keyUp(e) {
    this.keys.delete(e.key.toLowerCase());
  }

  _mouseDown(e) {
    const rect = this._canvas.getBoundingClientRect();
    const scaleX = this._canvas.width / rect.width;
    const scaleY = this._canvas.height / rect.height;
    this.clickTarget = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
    if (this.onAnyKey) this.onAnyKey();
  }

  /** Normalised movement vector from held keys, or null when none are held. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x === 0 && y === 0) return null;
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  clear() {
    this.keys.clear();
    this.clickTarget = null;
  }
}
