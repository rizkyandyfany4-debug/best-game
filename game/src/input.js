// Keyboard and mouse state for LUMENFALL. The game reads this, never the DOM
// events directly, so the autopilot in shots.js can drive the same inputs.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.canvas = canvas;
    this.pressed = new Set();
    this.clicked = false;
    this.clickX = 0;
    this.clickY = 0;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
      this.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      const rect = canvas.getBoundingClientRect();
      this.clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
      this.clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
      this.clicked = true;
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(code) { return this.keys.has(code); }

  // True only on the frame the key went down; main.js clears it each step.
  wasPressed(code) { return this.pressed.has(code); }

  // True only on the frame the mouse was clicked; main.js clears it each step.
  wasClicked() { return this.clicked; }

  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}
