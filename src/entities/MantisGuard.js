import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class MantisGuard extends Enemy {
  constructor(x, y) {
    super(x, y, 32, 40, 5, { min: 18, max: 24 });
    this.speed = 100;
    this.facing = -1;
    this.attackTimer = 0;
    this.attackCooldown = 1.6;
    this.isAttacking = false;
  }

  update(dt, player, tilemap) {
    super.update(dt);
    if (this.isDead) return;

    if (this.attackTimer > 0) this.attackTimer -= dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
    const dist = Math.hypot(dx, dy);

    if (dist < 220) {
      this.facing = dx > 0 ? 1 : -1;
      if (dist > 45) {
        this.vx = this.facing * this.speed;
        if (dy < -30 && Math.abs(dx) < 100 && this.grounded) {
          this.vy = -300; // Mantis leap towards elevated player
        }
      } else {
        this.vx = 0;
        if (this.attackTimer <= 0) {
          this.isAttacking = true;
          this.attackTimer = this.attackCooldown;
          setTimeout(() => { this.isAttacking = false; }, 350);
        }
      }
    } else {
      // Idle patrol
      this.vx = this.facing * (this.speed * 0.4);
    }

    Physics.checkTileCollision(this, tilemap, dt);

    if (this.onLeftWall || this.onRightWall) {
      this.facing *= -1;
    }
  }

  draw(ctx, camera) {
    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    if (this.facing < 0) ctx.scale(-1, 1);

    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#2d4a22';

    // Mantis Slender Body & Head
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mantis Head & Horns
    ctx.fillStyle = '#416932';
    ctx.beginPath();
    ctx.arc(4, -14, 7, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#a6ff42';
    ctx.beginPath();
    ctx.arc(7, -15, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Mantis Blade Arms
    ctx.strokeStyle = '#82c95f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.lineTo(this.isAttacking ? 28 : 16, this.isAttacking ? 2 : -20);
    ctx.lineTo(this.isAttacking ? 20 : 10, this.isAttacking ? 16 : -8);
    ctx.stroke();

    ctx.restore();
  }
}
