import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class MantisLords extends Enemy {
  constructor(x, y) {
    super(x, y, 36, 56, 280, 250); // 280 HP
    this.speed = 220;
    this.state = 'GROUND_STANCE'; // GROUND_STANCE, DASH_ATTACK, WALL_CLING, DIVE_PLUNGE, TWIN_SLASH, DOUBLE_DISC
    this.stateTimer = 1.0;
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
    const dist = Math.abs(dx);

    if (this.state === 'GROUND_STANCE' || this.state === 'IDLE') {
      this.facing = dx > 0 ? 1 : -1;
      this.vx = this.facing * 90; // Active ground stalking towards player
    }

    // ----------------------------------------------------
    // STATE MACHINE & ATTACK SELECTION
    // ----------------------------------------------------
    if (this.stateTimer <= 0) {
      if (this.state === 'DASH_ATTACK' || this.state === 'TWIN_SLASH') {
        // Return to ground stance
        this.state = 'GROUND_STANCE';
        this.stateTimer = 1.2;
        this.vx = 0;
      } else if (this.state === 'WALL_CLING' || this.state === 'DOUBLE_DISC') {
        // Drop down from wall back to ground!
        this.state = 'GROUND_STANCE';
        this.stateTimer = 1.3;
        this.vy = 400; // Drop down immediately
        this.vx = (dx > 0 ? 1 : -1) * 120;
      } else if (this.state === 'DIVE_PLUNGE') {
        this.state = 'GROUND_STANCE';
        this.stateTimer = 1.2;
        this.vx = 0;
      } else {
        // From Ground Stance, choose next attack
        const rand = Math.random();

        if (rand < 0.30) {
          // 1. GROUND DASH THRUST (Slams across floor)
          this.state = 'DASH_ATTACK';
          this.facing = dx > 0 ? 1 : -1;
          this.vx = this.facing * 560;
          this.stateTimer = 0.8;
          if (soundManager && soundManager.playDash) soundManager.playDash();
          if (particles && particles.spawnHitSparks) {
            particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height - 8, 8, '#88ffaa');
          }
        } else if (rand < 0.52) {
          // 2. TWIN SLASH GROUND COMBO
          this.state = 'TWIN_SLASH';
          this.facing = dx > 0 ? 1 : -1;
          this.vx = this.facing * 460;
          this.stateTimer = 0.9;
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        } else if (rand < 0.72) {
          // 3. AERIAL DIVE PLUNGE (Drops from top straight down to floor)
          this.state = 'DIVE_PLUNGE';
          this.x = player.x + (Math.random() - 0.5) * 50;
          this.y = 120;
          this.vx = 0;
          this.vy = 850;
          this.stateTimer = 1.4;
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        } else if (rand < 0.88) {
          // 4. WALL CLING BOOMERANG DISC
          this.state = 'WALL_CLING';
          this.x = dx > 0 ? 90 : room.width - 130;
          this.y = 260;
          this.vx = 0;
          this.vy = 0;
          this.stateTimer = 0.9;

          this.discs.push({
            x: this.x + this.width / 2,
            y: this.y + 20,
            vx: (dx > 0 ? 1 : -1) * 400,
            vy: 35,
            timer: 1.8
          });
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        } else {
          // 5. DOUBLE BOOMERANG DISCS
          this.state = 'DOUBLE_DISC';
          this.x = dx > 0 ? 90 : room.width - 130;
          this.y = 240;
          this.vx = 0;
          this.vy = 0;
          this.stateTimer = 1.0;

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
      this.vx *= 0.98;
    } else if (this.state === 'WALL_CLING' || this.state === 'DOUBLE_DISC') {
      this.vy = 0; // Hold briefly on wall
    } else if (this.state === 'DIVE_PLUNGE') {
      if (this.grounded || this.y >= room.height - 190) {
        this.state = 'GROUND_STANCE';
        this.stateTimer = 1.0;
        this.vx = 0;
        this.vy = 0;
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 120, '#88ffaa');
          particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height, 16, '#ffffff');
        }
        if (camera && camera.shake) camera.shake(5, 0.25);
      }
    }

    // Update Mantis Discs
    for (let i = this.discs.length - 1; i >= 0; i--) {
      const disc = this.discs[i];
      disc.x += disc.vx * dt;
      disc.y += disc.vy * dt;
      disc.timer -= dt;

      // Curving return trajectory
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

    Physics.checkTileCollision(this, room, dt);
  }

  draw(ctx, camera) {
    if (!this.active || this.isDead) return;

    const view = camera.getView ? camera.getView() : camera;
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();

    // 1. Draw Spinning Boomerang Discs
    for (const disc of this.discs) {
      const dx = disc.x - view.x;
      const dy = disc.y - view.y;

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
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#223326';
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
