import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class Hornet extends Enemy {
  constructor(x, y) {
    super(x, y, 32, 48, 50, 150);
    this.speed = 170;
    this.state = 'IDLE'; // IDLE, LUNGE, NEEDLE_THROW, SPHERE
    this.stateTimer = 1.0;
    this.facing = -1;
    this.isBoss = true;
    this.bossName = 'HORNET - PROTECTOR';

    // Boomerang Needle Spear Attributes
    this.needleActive = false;
    this.needleOffset = 0;
    this.needleMaxDistance = 320;
    this.needlePhase = 'IDLE'; // IDLE, OUTBOUND, RETURNING
    this.needleRotation = 0;
  }

  update(dt, player, room, soundManager, particles, camera) {
    super.update(dt);
    if (this.isDead) return;

    this.stateTimer -= dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dist = Math.abs(dx);

    if (this.stateTimer <= 0 && this.needlePhase === 'IDLE') {
      this.facing = dx > 0 ? 1 : -1;
      const rand = Math.random();

      if (rand < 0.35) {
        this.state = 'LUNGE';
        this.vx = this.facing * 340;
        this.vy = -180;
        this.stateTimer = 0.8;
        if (soundManager && soundManager.playDash) soundManager.playDash();
        if (particles && particles.spawnDust) particles.spawnDust(this.x, this.y + this.height, 6);
      } else if (rand < 0.75) {
        this.state = 'NEEDLE_THROW';
        this.vx = 0;
        this.needleActive = true;
        this.needlePhase = 'OUTBOUND';
        this.needleOffset = 0;
        this.stateTimer = 1.8;
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      } else {
        this.state = 'SPHERE';
        this.vx = 0;
        this.vy = -280;
        this.stateTimer = 1.0;
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
        if (particles && particles.spawnShockwave) particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 60, '#ff4466');
      }
    }

    // Handle Boomerang Needle Physics & Flight Cycle
    if (this.state === 'NEEDLE_THROW' || this.needleActive) {
      this.needleRotation += dt * 25;

      const hornetCenterX = this.x + this.width / 2;
      const hornetCenterY = this.y + this.height / 2 - 5;
      const needleX = hornetCenterX + this.facing * this.needleOffset;
      const needleY = hornetCenterY;

      if (this.needlePhase === 'OUTBOUND') {
        this.needleOffset += 480 * dt;
        if (particles && Math.random() < 0.4) {
          particles.spawnHitSparks(needleX, needleY, 1, '#ffffff');
        }
        if (this.needleOffset >= this.needleMaxDistance) {
          this.needlePhase = 'RETURNING';
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        }
      } else if (this.needlePhase === 'RETURNING') {
        this.needleOffset -= 480 * dt;
        if (particles && Math.random() < 0.4) {
          particles.spawnHitSparks(needleX, needleY, 1, '#ff88aa');
        }
        if (this.needleOffset <= 0) {
          this.needleOffset = 0;
          this.needlePhase = 'IDLE';
          this.needleActive = false;
          this.state = 'IDLE';
        }
      }

      // Boomerang Needle vs Player Collision Damage
      if (this.needleActive && player && !player.invulnerable) {
        const needleBounds = {
          x: needleX - 22,
          y: needleY - 12,
          width: 44,
          height: 24
        };
        if (Physics.rectIntersect(needleBounds, player.getBounds())) {
          player.takeDamage(1, needleX, soundManager, particles, camera);
        }
      }
    }

    if (this.state === 'LUNGE') {
      // Keep momentum
    } else {
      this.vx *= 0.9;
    }

    Physics.checkTileCollision(this, room, dt);
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

    // Black Eye Sockets
    ctx.fillStyle = '#05060a';
    ctx.beginPath();
    ctx.ellipse(4, -16, 3, 5, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Silk Thread & Boomerang Needle Throw Graphic
    if (this.needleActive && this.needlePhase !== 'IDLE') {
      const targetX = this.needleOffset;
      const targetY = -5;

      // Silver Silk Thread
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(6, 4);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      // Spinning Boomerang Needle Spear
      ctx.save();
      ctx.translate(targetX, targetY);
      ctx.rotate(this.needleRotation);

      // Silver Razor Blade
      ctx.fillStyle = '#f0f4fc';
      ctx.strokeStyle = '#a8b8d0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(0, -4);
      ctx.lineTo(24, 0);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crimson Handle Wrap
      ctx.fillStyle = '#c81e3a';
      ctx.fillRect(-4, -3, 8, 6);

      ctx.restore();
    } else {
      // Held Needle Sword
      ctx.strokeStyle = '#e0ecfc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(6, 4);
      ctx.lineTo(38, -12);
      ctx.stroke();
    }

    // Silk Thread Sphere AOE Attack Effect
    if (this.state === 'SPHERE') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 55, Math.sin(angle) * 55);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
