import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class HuskSentinel extends Enemy {
  constructor(x, y) {
    super(x, y, 30, 42, 6, { min: 45, max: 55 });
    this.speed = 60;
    this.attackTimer = 0;
    this.attackCooldown = 2.0;
    this.isAttacking = false;
    this.facing = -1;
  }

  update(dt, player, tilemap) {
    super.update(dt);
    if (this.isDead) return;

    if (this.attackTimer > 0) this.attackTimer -= dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dist = Math.abs(dx);

    if (dist < 180 && !this.isAttacking) {
      this.facing = dx > 0 ? 1 : -1;

      if (dist > 50) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx = 0;
        if (this.attackTimer <= 0) {
          this.isAttacking = true;
          this.attackTimer = this.attackCooldown;
          setTimeout(() => { this.isAttacking = false; }, 400);
        }
      }
    } else {
      this.vx = 0;
    }

    Physics.checkTileCollision(this, tilemap, dt);
  }

  draw(ctx, camera) {
    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    if (this.facing < 0) ctx.scale(-1, 1);

    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#1e2430';

    // Body Armor
    ctx.fillRect(-12, -18, 24, 36);

    // Horned Helmet
    ctx.fillStyle = '#3a4456';
    ctx.beginPath();
    ctx.arc(0, -18, 12, Math.PI, 0);
    ctx.fill();

    // Shield
    ctx.fillStyle = '#506078';
    ctx.fillRect(4, -12, 10, 24);

    // Spear / Nail Slash
    if (this.isAttacking) {
      ctx.strokeStyle = '#e0ecfc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(34, 0);
      ctx.stroke();
    }

    ctx.restore();
  }
}
