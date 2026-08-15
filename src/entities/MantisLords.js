import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class MantisLords extends Enemy {
  constructor(x, y) {
    super(x, y, 36, 56, 50, 250);
    this.speed = 240;
    this.state = 'GROUND_STANCE'; // GROUND_STANCE, DASH_ATTACK, WALL_CLING, DIVE_PLUNGE
    this.stateTimer = 1.6; // Stays grounded on entry
    this.facing = -1;
    this.isBoss = true;
    this.bossName = 'MANTIS LORDS';

    this.discActive = false;
    this.discX = 0;
    this.discY = 0;
    this.discVx = 0;
    this.discVy = 0;
    this.discTimer = 0;
    this.animTimer = 0;
  }

  update(dt, player, room, soundManager, particles, camera) {
    super.update(dt);
    if (this.isDead) return;

    this.animTimer += dt;
    this.stateTimer -= dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);

    if (this.state === 'GROUND_STANCE' || this.state === 'IDLE') {
      this.facing = dx > 0 ? 1 : -1;
      // Light ground pacing/stalking
      this.vx = this.facing * 35;
    }

    // ----------------------------------------------------
    // STATE MACHINE & ATTACK SELECTION
    // ----------------------------------------------------
    if (this.stateTimer <= 0) {
      if (this.state === 'DASH_ATTACK' || this.state === 'DIVE_PLUNGE' || this.state === 'WALL_CLING') {
        // Always return to Ground Stance for prolonged ground presence (1.4 - 1.8s)
        this.state = 'GROUND_STANCE';
        this.stateTimer = 1.5;
        this.vx = 0;
      } else {
        // Select next attack from Ground Stance
        const rand = Math.random();

        if (rand < 0.50) {
          // 1. DASH THRUST (Ground Lunge across the arena)
          this.state = 'DASH_ATTACK';
          this.facing = dx > 0 ? 1 : -1;
          this.vx = this.facing * 520;
          this.vy = 0;
          this.stateTimer = 0.75;
          if (soundManager && soundManager.playDash) soundManager.playDash();
          if (particles && particles.spawnHitSparks) {
            particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height - 10, 10, '#ffffff');
          }
        } else if (rand < 0.75) {
          // 2. WALL CLING & BOOMERANG DISC THROW (Brief wall cling, then drops back to ground!)
          this.state = 'WALL_CLING';
          this.x = dx > 0 ? 80 : room.width - 120;
          this.y = 220; // High on wall
          this.vx = 0;
          this.vy = 0;
          this.stateTimer = 1.0;

          // Launch spinning mantis boomerang blade
          this.discActive = true;
          this.discX = this.x + this.width / 2;
          this.discY = this.y + 20;
          this.discVx = (dx > 0 ? 1 : -1) * 380;
          this.discVy = 40;
          this.discTimer = 1.6;
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        } else {
          // 3. AERIAL DIVE PLUNGE (Plunges from above directly into ground)
          this.state = 'DIVE_PLUNGE';
          this.x = player.x + (Math.random() - 0.5) * 60;
          this.y = 100;
          this.vx = 0;
          this.vy = 680;
          this.stateTimer = 1.0;
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        }
      }
    }

    // ----------------------------------------------------
    // STATE ACTIONS
    // ----------------------------------------------------
    if (this.state === 'DASH_ATTACK') {
      this.vx *= 0.97;
    } else if (this.state === 'WALL_CLING') {
      this.vy = 0;
    } else if (this.state === 'DIVE_PLUNGE') {
      if (this.grounded || this.y >= room.height - 180) {
        // Land grounded in Ground Stance for prolonged vulnerability & sword stance (1.5s)
        this.state = 'GROUND_STANCE';
        this.stateTimer = 1.5;
        this.vy = 0;
        this.vx = 0;
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 110, '#aaffcc');
        }
        if (camera && camera.shake) camera.shake(4, 0.15);
      }
    }

    // Update Boomerang Scythe Disc
    if (this.discActive) {
      this.discTimer -= dt;
      this.discX += this.discVx * dt;
      this.discY += this.discVy * dt;

      // Boomerang curve back towards mantis
      if (this.discTimer < 0.9) {
        const backDx = (this.x + this.width / 2) - this.discX;
        const backDy = (this.y + 20) - this.discY;
        this.discVx += backDx * 3.5 * dt;
        this.discVy += backDy * 3.5 * dt;
      }

      if (particles && Math.random() < 0.4) {
        particles.spawnHitSparks(this.discX, this.discY, 1, '#88ffaa');
      }

      // Disc vs Player
      const pDist = Math.hypot((player.x + player.width / 2) - this.discX, (player.y + player.height / 2) - this.discY);
      if (pDist < 24 && !player.invulnerable) {
        player.takeDamage(1, this.discX, soundManager, particles, camera);
      }

      if (this.discTimer <= 0) {
        this.discActive = false;
      }
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

    const groundBreathing = this.state === 'GROUND_STANCE' ? Math.sin(this.animTimer * 5) * 2 : 0;

    // Slender Mantis Body
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#283c2e';
    ctx.beginPath();
    ctx.ellipse(0, 4 + groundBreathing, 10, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mantis Long Antennae / Crest Horns
    ctx.strokeStyle = '#8bc34a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(2, -18 + groundBreathing);
    ctx.lineTo(14, -36 + groundBreathing);
    ctx.moveTo(-2, -18 + groundBreathing);
    ctx.lineTo(-8, -34 + groundBreathing);
    ctx.stroke();

    // Mantis Lord White Mask
    ctx.fillStyle = '#f0f5ee';
    ctx.beginPath();
    ctx.moveTo(0, -26 + groundBreathing);
    ctx.lineTo(8, -14 + groundBreathing);
    ctx.lineTo(0, -6 + groundBreathing);
    ctx.lineTo(-8, -14 + groundBreathing);
    ctx.closePath();
    ctx.fill();

    // Glowing Green Eye
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(3, -14 + groundBreathing, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Sharp Mantis Scythe Blades (Poised in combat stance)
    ctx.fillStyle = '#b2dfdb';
    ctx.strokeStyle = '#e0f2f1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (this.state === 'GROUND_STANCE') {
      // Poised forward sword stance
      ctx.moveTo(8, -4 + groundBreathing);
      ctx.quadraticCurveTo(28, 4, 30, 24);
      ctx.lineTo(20, 20);
      ctx.quadraticCurveTo(18, 2, 8, -4 + groundBreathing);
    } else {
      ctx.moveTo(8, -4);
      ctx.quadraticCurveTo(24, 6, 22, 28);
      ctx.lineTo(14, 20);
      ctx.quadraticCurveTo(16, 4, 8, -4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw Boomerang Scythe Disc
    if (this.discActive) {
      const discScreenX = Math.round(this.discX - view.x);
      const discScreenY = Math.round(this.discY - view.y);

      ctx.restore();
      ctx.save();
      ctx.translate(discScreenX, discScreenY);
      ctx.rotate(this.animTimer * 16);

      ctx.fillStyle = '#e8f5e9';
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Blade vanes
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(14, -4);
        ctx.lineTo(12, 6);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
