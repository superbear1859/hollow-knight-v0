import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class Hornet extends Enemy {
  constructor(x, y) {
    super(x, y, 32, 48, 50, 150);
    this.speed = 170;
    this.state = 'IDLE'; // IDLE, LUNGE, NEEDLE_THROW, SPHERE
    this.stateTimer = 1.0;
    this.facing = -1;
    this.needleX = 0;
    this.needleActive = false;
    this.isBoss = true;
    this.bossName = 'HORNET - PROTECTOR';
  }

  update(dt, player, tilemap, soundManager, particles, camera) {
    super.update(dt);
    if (this.isDead) return;

    this.stateTimer -= dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dist = Math.abs(dx);

    if (this.stateTimer <= 0) {
      this.facing = dx > 0 ? 1 : -1;
      const rand = Math.random();

      if (rand < 0.35) {
        this.state = 'LUNGE';
        this.vx = this.facing * 340;
        this.vy = -180;
        this.stateTimer = 0.8;
        soundManager.playDash();
        particles.spawnDust(this.x, this.y + this.height, 6);
      } else if (rand < 0.7) {
        this.state = 'NEEDLE_THROW';
        this.vx = 0;
        this.needleActive = true;
        this.needleX = this.x;
        this.stateTimer = 1.2;
        soundManager.playSlash();
      } else {
        this.state = 'SPHERE';
        this.vx = 0;
        this.vy = -280;
        this.stateTimer = 1.0;
        soundManager.playBossRoar();
        particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 60, '#ff4466');
      }
    }

    if (this.state === 'LUNGE') {
      // Keep momentum
    } else {
      this.vx *= 0.9;
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

    // Crimson Red Cloak
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#c81e3a';
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.lineTo(16, -6);
    ctx.lineTo(20, 22);
    ctx.lineTo(-18, 22);
    ctx.closePath();
    ctx.fill();

    // White Horned Mask
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath();
    ctx.ellipse(0, -16, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mask Horns
    ctx.beginPath();
    ctx.moveTo(-8, -26);
    ctx.lineTo(-20, -42);
    ctx.lineTo(-4, -28);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -26);
    ctx.lineTo(20, -42);
    ctx.lineTo(4, -28);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#05060a';
    ctx.beginPath();
    ctx.ellipse(4, -16, 3, 5, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Needle Sword
    ctx.strokeStyle = '#e0ecfc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, 4);
    ctx.lineTo(38, -12);
    ctx.stroke();

    // Silk Thread Attack Effect
    if (this.state === 'SPHERE') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 45, Math.sin(angle) * 45);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
