import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class SoulMaster extends Enemy {
  constructor(x, y) {
    super(x, y, 48, 64, 300, 300); // 300 HP
    this.speed = 200;
    this.state = 'IDLE'; // IDLE, SLAM, FAKEOUT_SLAM, SPIRAL_DASH, ORB_ATTACK
    this.stateTimer = 0.8;
    this.facing = -1;
    this.isBoss = true;
    this.bossName = 'SOUL MASTER';

    this.orbs = [];
    this.homingBolts = []; // Active projectile homing bolts
    this.fakeoutTriggered = false;
    this.animTimer = 0;
    this.hoverY = y;
  }

  update(dt, player, room, soundManager, particles, camera) {
    super.update(dt);
    if (this.isDead) return;

    this.animTimer += dt;
    this.stateTimer -= dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dist = Math.abs(dx);

    if (this.state !== 'SLAM' && this.state !== 'FAKEOUT_SLAM' && this.state !== 'SPIRAL_DASH') {
      this.facing = dx > 0 ? 1 : -1;
    }

    // ----------------------------------------------------
    // STATE MACHINE & ATTACK SELECTION
    // ----------------------------------------------------
    if (this.stateTimer <= 0 && this.state === 'IDLE') {
      const rand = Math.random();

      if (rand < 0.28) {
        // 1. TELEPORT SLAM
        this.state = 'SLAM';
        this.x = player.x + (Math.random() - 0.5) * 40;
        this.y = 120;
        this.vx = 0;
        this.vy = 800;
        this.stateTimer = 1.4;
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y, 80, '#88d6ff');
        }
      } else if (rand < 0.52) {
        // 2. FAKEOUT SLAM (Bait dive, mid-air teleport trick, double crash!)
        this.state = 'FAKEOUT_SLAM';
        this.x = player.x + (Math.random() - 0.5) * 30;
        this.y = 140;
        this.vx = 0;
        this.vy = 420;
        this.fakeoutTriggered = false;
        this.stateTimer = 1.8;
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
      } else if (rand < 0.74) {
        // 3. SPIRAL ORB DASH (Surrounded by 4 orbs and dashes across arena)
        this.state = 'SPIRAL_DASH';
        this.x = dx > 0 ? 140 : room.width - 200;
        this.y = 570;
        this.facing = dx > 0 ? 1 : -1;
        this.vx = this.facing * 520;
        this.vy = 0;
        this.stateTimer = 1.6;

        this.orbs = [];
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          this.orbs.push({ angle, dist: 55, speed: 5.5 });
        }
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
        if (particles && particles.spawnHitSparks) {
          particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 16, '#88d6ff');
        }
      } else {
        // 4. HOMING SOUL ORB VOLLEY
        this.state = 'ORB_ATTACK';
        this.x = player.x + (this.facing > 0 ? -240 : 240);
        this.y = 380;
        this.hoverY = 380;
        this.vx = 0;
        this.vy = 0;
        this.stateTimer = 1.8;

        // Launch 3 homing spirit bolts toward player
        for (let i = 0; i < 3; i++) {
          const angle = (this.facing > 0 ? 0 : Math.PI) + (i - 1) * 0.4;
          this.homingBolts.push({
            x: this.x + this.width / 2,
            y: this.y + 20,
            vx: Math.cos(angle) * 280,
            vy: Math.sin(angle) * 280,
            life: 2.5
          });
        }
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      }
    }

    // ----------------------------------------------------
    // STATE ACTIONS
    // ----------------------------------------------------
    if (this.state === 'IDLE') {
      this.hoverY = 440;
      this.y = this.hoverY + Math.sin(this.animTimer * 3) * 16;
      this.vx = this.facing * 45;
      this.x += this.vx * dt;
    } else if (this.state === 'SLAM') {
      this.y += this.vy * dt;
      if (this.y >= 580 || this.stateTimer <= 0) {
        this.y = 580;
        this.state = 'IDLE';
        this.stateTimer = 0.5;
        this.vy = 0;
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 140, '#ffffff');
          particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height, 20, '#88d6ff');
        }
        if (camera && camera.shake) camera.shake(5, 0.25);

        const slamRect = { x: this.x - 70, y: this.y + this.height - 30, width: this.width + 140, height: 35 };
        if (Physics.rectIntersect(slamRect, player.getBounds())) {
          player.takeDamage(1, this.x + this.width / 2, soundManager, particles, camera);
        }
      }
    } else if (this.state === 'FAKEOUT_SLAM') {
      this.y += this.vy * dt;
      if (!this.fakeoutTriggered && this.y >= 380) {
        this.fakeoutTriggered = true;
        this.y = 160; // Fakeout mid-air teleport trick!
        this.vy = 950;
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, 380, 80, '#88d6ff');
        }
      } else if (this.fakeoutTriggered) {
        if (this.y >= 580 || this.stateTimer <= 0) {
          this.y = 580;
          this.state = 'IDLE';
          this.stateTimer = 0.6;
          this.vy = 0;
          if (soundManager && soundManager.playHit) soundManager.playHit();
          if (particles && particles.spawnShockwave) {
            particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 180, '#88d6ff');
            particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height, 24, '#ffffff');
          }
          if (camera && camera.shake) camera.shake(6, 0.3);

          const wideSlamRect = { x: this.x - 110, y: this.y + this.height - 30, width: this.width + 220, height: 35 };
          if (Physics.rectIntersect(wideSlamRect, player.getBounds())) {
            player.takeDamage(1, this.x + this.width / 2, soundManager, particles, camera);
          }
        }
      }
    } else if (this.state === 'SPIRAL_DASH') {
      this.x += this.vx * dt;
      for (const orb of this.orbs) {
        orb.angle += dt * orb.speed;
        const ox = this.x + this.width / 2 + Math.cos(orb.angle) * orb.dist;
        const oy = this.y + this.height / 2 + Math.sin(orb.angle) * orb.dist;
        const orbRect = { x: ox - 14, y: oy - 14, width: 28, height: 28 };
        if (Physics.rectIntersect(orbRect, player.getBounds())) {
          player.takeDamage(1, ox, soundManager, particles, camera);
        }
      }
      if (this.stateTimer <= 0 || (this.facing > 0 && this.x > room.width - 150) || (this.facing < 0 && this.x < 150)) {
        this.state = 'IDLE';
        this.stateTimer = 0.5;
        this.orbs = [];
        this.vx = 0;
      }
    } else if (this.state === 'ORB_ATTACK') {
      this.y = this.hoverY + Math.sin(this.animTimer * 4) * 8;
      if (this.stateTimer <= 0) {
        this.state = 'IDLE';
        this.stateTimer = 0.5;
      }
    }

    // Update active homing spirit bolts
    for (let i = this.homingBolts.length - 1; i >= 0; i--) {
      const bolt = this.homingBolts[i];
      bolt.life -= dt;

      // Gentle homing curve toward player
      const bdx = (player.x + player.width / 2) - bolt.x;
      const bdy = (player.y + player.height / 2) - bolt.y;
      const bDist = Math.hypot(bdx, bdy) || 1;
      bolt.vx += (bdx / bDist) * 320 * dt;
      bolt.vy += (bdy / bDist) * 320 * dt;

      // Speed clamp
      const spd = Math.hypot(bolt.vx, bolt.vy);
      if (spd > 340) {
        bolt.vx = (bolt.vx / spd) * 340;
        bolt.vy = (bolt.vy / spd) * 340;
      }

      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;

      const boltRect = { x: bolt.x - 12, y: bolt.y - 12, width: 24, height: 24 };
      if (Physics.rectIntersect(boltRect, player.getBounds())) {
        player.takeDamage(1, bolt.x, soundManager, particles, camera);
        if (particles && particles.spawnHitSparks) {
          particles.spawnHitSparks(bolt.x, bolt.y, 8, '#88d6ff');
        }
        this.homingBolts.splice(i, 1);
        continue;
      }

      if (bolt.life <= 0) {
        if (particles && particles.spawnHitSparks) {
          particles.spawnHitSparks(bolt.x, bolt.y, 6, '#88d6ff');
        }
        this.homingBolts.splice(i, 1);
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

    // 1. Draw Orbiting Shield Orbs
    for (const orb of this.orbs) {
      const ox = this.x + this.width / 2 + Math.cos(orb.angle) * orb.dist - view.x;
      const oy = this.y + this.height / 2 + Math.sin(orb.angle) * orb.dist - view.y;

      ctx.save();
      ctx.shadowColor = '#88d6ff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ox, oy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw Homing Soul Bolts
    for (const bolt of this.homingBolts) {
      const bx = bolt.x - view.x;
      const by = bolt.y - view.y;

      ctx.save();
      ctx.shadowColor = '#88d6ff';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#88d6ff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw Soul Master Body
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    if (this.facing < 0) ctx.scale(-1, 1);

    ctx.shadowColor = '#88d6ff';
    ctx.shadowBlur = 14;

    // Flowing Robe
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#1e1428';
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(24, 30);
    ctx.lineTo(-24, 30);
    ctx.closePath();
    ctx.fill();

    // Soul Mask & Glowing Crown
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -18, 16, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ff66aa';
    ctx.fillRect(2, -22, 6, 6);

    ctx.restore();
  }
}
