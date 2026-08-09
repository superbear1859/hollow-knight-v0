import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class Crawlid extends Enemy {
  constructor(x, y) {
    super(x, y, 28, 20, 2, 3);
    this.speed = 40;
    this.facing = Math.random() > 0.5 ? 1 : -1;
  }

  update(dt, player, tilemap) {
    super.update(dt);
    if (this.isDead) return;

    this.vx = this.facing * this.speed;

    this.onLeftWall = false;
    this.onRightWall = false;
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
    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = '#1c2230';
    }

    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    if (this.facing < 0) ctx.scale(-1, 1);

    // Shell
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 10, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Underbelly
    ctx.fillStyle = '#3a4459';
    ctx.fillRect(-10, 0, 20, 6);

    // Antennae
    ctx.strokeStyle = '#a0b0cc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, -6);
    ctx.lineTo(14, -12);
    ctx.stroke();

    ctx.restore();
  }
}
