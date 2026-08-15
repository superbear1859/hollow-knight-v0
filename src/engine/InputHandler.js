export class InputHandler {
  constructor() {
    this.keys = {};
    this.justPressedKeys = {};
    this.mouseClicked = false;
    this.mousePos = { x: 0, y: 0 };
    this.secretBuffer = '';
    this.secretTarget = 'superbear185941';
    this.cheatCodeTriggered = false;

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) || e.key === ' ') {
        e.preventDefault();
      }

      if (e.repeat) return; // Prevent OS key-repeat from triggering repeated justPressed events when holding a key

      if (e.key && e.key.length === 1) {
        this.secretBuffer = (this.secretBuffer + e.key.toLowerCase()).slice(-this.secretTarget.length);
        if (this.secretBuffer === this.secretTarget) {
          this.cheatCodeTriggered = true;
          this.secretBuffer = '';
        }
      }

      const keysToSet = [e.code, e.key, e.key?.toLowerCase(), e.key?.toUpperCase()].filter(Boolean);

      keysToSet.forEach(k => {
        if (!this.keys[k]) {
          this.justPressedKeys[k] = true;
        }
        this.keys[k] = true;
      });
    });

    window.addEventListener('keyup', (e) => {
      const keysToClear = [e.code, e.key, e.key?.toLowerCase(), e.key?.toUpperCase()].filter(Boolean);

      keysToClear.forEach(k => {
        this.keys[k] = false;
        this.justPressedKeys[k] = false;
      });
    });

    window.addEventListener('mousedown', (e) => {
      this.mouseClicked = true;
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        this.mousePos = {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY
        };
      } else {
        this.mousePos = { x: e.clientX, y: e.clientY };
      }
    });
  }

  isDown(action) {
    const codes = this.getCodesForAction(action);
    return codes.some(code => this.keys[code]);
  }

  isJustPressed(action) {
    const codes = this.getCodesForAction(action);
    return codes.some(code => this.justPressedKeys[code]);
  }

  getCodesForAction(action) {
    switch (action) {
      case 'left': return ['ArrowLeft', 'KeyA', 'a', 'A'];
      case 'right': return ['ArrowRight', 'KeyD', 'd', 'D'];
      case 'up': return ['ArrowUp', 'KeyW', 'w', 'W'];
      case 'down': return ['ArrowDown', 'KeyS', 's', 'S'];
      // Jump is Space, Z, J, Enter (Up Arrow / W are strictly for aiming/moving UP, NOT jumping)
      case 'jump': return ['Space', ' ', 'KeyZ', 'z', 'Z', 'KeyJ', 'j', 'J', 'Enter'];
      case 'attack': return ['KeyX', 'x', 'X', 'KeyK', 'k', 'K'];
      case 'dash': return ['KeyC', 'c', 'C', 'KeyL', 'l', 'L', 'ShiftLeft', 'ShiftRight', 'Shift'];
      case 'superDash': return ['KeyF', 'f', 'F'];
      case 'spell': return ['KeyQ', 'q', 'Q', 'KeyA', 'a', 'A', 'KeyB', 'b', 'B', 'Digit2', '2'];
      case 'focus': return ['KeyH', 'h', 'H', 'KeyV', 'v', 'V', 'KeyR', 'r', 'R', 'Digit1', '1'];
      case 'inventory': return ['KeyI', 'i', 'I', 'Tab', 'KeyU', 'u', 'U'];
      case 'map': return ['KeyM', 'm', 'M'];
      case 'interact': return ['KeyE', 'e', 'E', 'ArrowDown', 'KeyS', 's', 'S'];
      case 'pause': return ['Escape', 'KeyP', 'p', 'P', 'Backspace'];
      case 'exit': return ['Escape', 'KeyP', 'p', 'P', 'Backspace'];
      default: return [];
    }
  }

  update() {
    this.justPressedKeys = {};
    this.mouseClicked = false;
  }
}
