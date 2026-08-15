import { Enemy } from './Enemy.js';

export class Vengefly extends Enemy {
  constructor(x, y) {
    super(x, y, 26, 26, 3, { min: 4, max: 6 });
    this.gravity = 0; // Flying
    this.startX = x;
    this.startY = y;
    this.hoverTimer = Math.random() * Math.PI * 2;
    this.aggroRange = 220;
    this.speed = 110;
  }

  update(dt, player) {
    super.update(dt);
    if (this.isDead) return;

    this.hoverTimer += dt * 3;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
    const dist = Math.hypot(dx, dy);

    if (dist < this.aggroRange) {
      this.facing = dx > 0 ? 1 : -1;
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
    } else {
      // Hover near origin
      const targetY = this.startY + Math.sin(this.hoverTimer) * 15;
      this.vx = (this.startX - this.x) * 1.5;
      this.vy = (targetY - this.y) * 1.5;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx, camera) {
    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    if (this.facing < 0) ctx.scale(-1, 1);

    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#281c20';

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red Eyes
    ctx.fillStyle = '#ff3344';
    ctx.beginPath();
    ctx.arc(6, -2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Flapping Wings
    const wingY = Math.sin(this.hoverTimer * 8) * 8;
    ctx.fillStyle = 'rgba(220, 235, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(-2, -10 + wingY, 8, 4, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
