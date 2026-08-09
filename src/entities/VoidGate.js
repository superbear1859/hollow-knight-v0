import { Entity } from './Entity.js';

export class VoidGate extends Entity {
  constructor(x, y, width = 32, height = 192) {
    super(x, y, width, height);
    this.solid = true;
    this.active = true;
    this.pulseTimer = 0;
  }

  isPassableBy(player) {
    if (!player) return false;
    return player.isDashing && (player.abilities?.shadowDash || player.isShadowDash);
  }

  update(dt, particles) {
    super.update(dt);
    this.pulseTimer += dt * 3;

    if (particles && Math.random() < 0.4) {
      particles.add({
        x: this.x + Math.random() * this.width,
        y: this.y + Math.random() * this.height,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 50 - 10,
        size: Math.random() * 4 + 1.5,
        color: '#101525',
        life: 0.6,
        shape: 'spore',
        fade: true
      });
    }
  }

  draw(ctx, camera) {
    if (!this.active) return;

    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();
    // Dark Void Barrier Visuals
    const opacity = 0.88 + Math.sin(this.pulseTimer) * 0.08;
    ctx.fillStyle = `rgba(5, 7, 14, ${opacity})`;
    ctx.fillRect(screenX, screenY, this.width, this.height);

    ctx.strokeStyle = 'rgba(40, 60, 100, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(screenX, screenY, this.width, this.height);

    // Inner Void Tendrils / Core Energy Gradient
    const grad = ctx.createLinearGradient(screenX, screenY, screenX + this.width, screenY);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
    grad.addColorStop(0.5, 'rgba(25, 35, 65, 0.8)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(screenX + 2, screenY, this.width - 4, this.height);

    // Tall Pulsing Shadow Glyphs / Rune Symbols
    ctx.fillStyle = '#607090';
    ctx.font = '700 12px Cinzel Decorative, serif';
    ctx.textAlign = 'center';

    const segments = Math.floor(this.height / 60);
    for (let i = 0; i < segments; i++) {
      const glyphY = screenY + 35 + i * 55;
      ctx.fillText('VOID', screenX + this.width / 2, glyphY);
      ctx.fillText('✦', screenX + this.width / 2, glyphY + 16);
    }

    ctx.restore();
  }
}
