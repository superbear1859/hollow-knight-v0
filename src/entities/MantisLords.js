import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class MantisLords extends Enemy {
  constructor(x, y) {
    super(x, y, 36, 56, 280, 250); // 280 HP
    this.speed = 240;
    this.state = 'GROUND_STANCE'; // GROUND_STANCE, DASH_ATTACK, WALL_CLING, DIVE_PLUNGE, TWIN_SLASH, DOUBLE_DISC
    this.stateTimer = 1.4;
    this.facing = -1;
    this.isBoss = true;
    this.bossName = 'MANTIS LORDS';

    this.discs = []; // [{ x, y, vx, vy, timer }]
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
      this.vx = this.facing * 35;
    }

    // ----------------------------------------------------
    // STATE MACHINE & ATTACK SELECTION
    // ----------------------------------------------------
    if (this.stateTimer <= 0) {
      if (this.state === 'DASH_ATTACK' || this.state === 'DIVE_PLUNGE' || this.state === 'WALL_CLING' || this.state === 'TWIN_SLASH' || this.state === 'DOUBLE_DISC') {
        this.state = 'GROUND_STANCE';
        this.stateTimer = 1.3;
        this.vx = 0;
      } else {
        const rand = Math.random();

        if (rand < 0.28) {
          // 1. DASH THRUST
          this.state = 'DASH_ATTACK';
          this.facing = dx > 0 ? 1 : -1;
          this.vx = this.facing * 550;
          this.vy = 0;
          this.stateTimer = 0.75;
          if (soundManager && soundManager.playDash) soundManager.playDash();
        } else if (rand < 0.50) {
          // 2. WALL CLING BOOMERANG DISC
          this.state = 'WALL_CLING';
          this.x = dx > 0 ? 80 : room.width - 120;
          this.y = 220;
          this.vx = 0;
          this.vy = 0;
          this.stateTimer = 1.1;

          this.discs.push({
            x: this.x + this.width / 2,
            y: this.y + 20,
            vx: (dx > 0 ? 1 : -1) * 400,
            vy: 40,
            timer: 1.6
          });
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        } else if (rand < 0.72) {
          // 3. AERIAL DIVE PLUNGE
          this.state = 'DIVE_PLUNGE';
          this.x = player.x + (Math.random() - 0.5) * 60;
          this.y = 100;
          this.vx = 0;
          this.vy = 720;
          this.stateTimer = 1.0;
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        } else if (rand < 0.88) {
          // 4. TWIN SLASH COMBO
          this.state = 'TWIN_SLASH';
          this.facing = dx > 0 ? 1 : -1;
          this.vx = this.facing * 480;
          this.vy = 0;
          this.stateTimer = 0.9;
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        } else {
          // 5. DOUBLE BOOMERANG DISCS
          this.state = 'DOUBLE_DISC';
          this.x = dx > 0 ? 90 : room.width - 130;
          this.y = 200;
          this.vx = 0;
          this.vy = 0;
          this.stateTimer = 1.2;

          this.discs.push(
            { x: this.x, y: this.y + 10, vx: (dx > 0 ? 1 : -1) * 380, vy: 30, timer: 1.8 },
            { x: this.x, y: this.y + 40, vx: (dx > 0 ? 1 : -1) * 320, vy: -20, timer: 1.8 }
          );
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        }
      }
    }

    // ----------------------------------------------------
    // STATE ACTIONS
    // ----------------------------------------------------
    if (this.state === 'DASH_ATTACK' || this.state === 'TWIN_SLASH') {
      this.vx *= 0.97;
    } else if (this.state === 'WALL_CLING' || this.state === 'DOUBLE_DISC') {
      this.vy = 0;
    } else if (this.state === 'DIVE_PLUNGE') {
      if (this.grounded || this.y >= room.height - 180) {
        this.state = 'GROUND_STANCE';
        this.stateTimer = 1.0;
        this.vx = 0;
        this.vy = 0;
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 100, '#88ffaa');
        }
      }
    }

    // Update Mantis Discs
    for (let i = this.discs.length - 1; i >= 0; i--) {
      const disc = this.discs[i];
      disc.x += disc.vx * dt;
      disc.y += disc.vy * dt;
      disc.timer -= dt;

      // Curving trajectory back toward player
      if (disc.timer < 0.9) {
        disc.vx = -disc.vx * 0.98;
      }

      const discRect = { x: disc.x - 14, y: disc.y - 14, width: 28, height: 28 };
      if (Physics.rectIntersect(discRect, player.getBounds())) {
        player.takeDamage(1, disc.x, soundManager, particles, camera);
      }

      if (disc.timer <= 0) {
        this.discs.splice(i, 1);
      }
    }
  }

  draw(ctx, camera) {
    if (!this.active || this.isDead) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.save();

    // 1. Draw Spinning Boomerang Discs
    for (const disc of this.discs) {
      const dx = disc.x - camera.x;
      const dy = disc.y - camera.y;

      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate((this.animTimer || 0) * 16);
      ctx.fillStyle = '#88ffaa';
      ctx.shadowColor = '#88ffaa';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Blade edges
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Mantis Lord Body
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    if (this.facing < 0) ctx.scale(-1, 1);

    ctx.shadowColor = '#88ffaa';
    ctx.shadowBlur = 8;

    // Slender Body
    ctx.fillStyle = '#223326';
    ctx.fillRect(-8, -20, 16, 40);

    // Mantis Head & Antennae
    ctx.fillStyle = '#18241b';
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(8, -16);
    ctx.lineTo(-8, -16);
    ctx.closePath();
    ctx.fill();

    // Glowing Eyes
    ctx.fillStyle = '#88ffaa';
    ctx.fillRect(2, -22, 5, 4);

    // Long Mantis Lance Weapon
    ctx.strokeStyle = '#aaffcc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(36, 12);
    ctx.stroke();

    ctx.restore();
  }
}
