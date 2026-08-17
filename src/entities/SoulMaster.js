import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class SoulMaster extends Enemy {
  constructor(x, y) {
    super(x, y, 48, 64, 300, 300); // 300 HP
    this.speed = 180;
    this.state = 'IDLE'; // IDLE, TELEPORT, SLAM, FAKEOUT_SLAM, SPIRAL_DASH, ORB_ATTACK, HOVER
    this.stateTimer = 1.0;
    this.facing = -1;
    this.isBoss = true;
    this.bossName = 'SOUL MASTER';

    this.orbs = [];
    this.fakeoutTriggered = false;
    this.animTimer = 0;
  }

  update(dt, player, room, soundManager, particles, camera) {
    super.update(dt);
    if (this.isDead) return;

    this.animTimer += dt;
    this.stateTimer -= dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);

    if (this.state !== 'SLAM' && this.state !== 'FAKEOUT_SLAM' && this.state !== 'SPIRAL_DASH') {
      this.facing = dx > 0 ? 1 : -1;
    }

    // ----------------------------------------------------
    // STATE MACHINE & ATTACK SELECTION
    // ----------------------------------------------------
    if (this.stateTimer <= 0) {
      const rand = Math.random();

      if (rand < 0.28) {
        // 1. TELEPORT SLAM
        this.state = 'SLAM';
        this.x = player.x + (Math.random() - 0.5) * 40;
        this.y = 100;
        this.vx = 0;
        this.vy = 850;
        this.stateTimer = 1.2;
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
      } else if (rand < 0.52) {
        // 2. FAKEOUT SLAM (Pauses in mid-air then double-slams!)
        this.state = 'FAKEOUT_SLAM';
        this.x = player.x + (Math.random() - 0.5) * 30;
        this.y = 120;
        this.vx = 0;
        this.vy = 400;
        this.fakeoutTriggered = false;
        this.stateTimer = 1.5;
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
      } else if (rand < 0.74) {
        // 3. SPIRAL ORB DASH (Surrounded by 4 orbs and dashes across arena)
        this.state = 'SPIRAL_DASH';
        this.x = dx > 0 ? 100 : room.width - 150;
        this.y = player.y - 10;
        this.facing = dx > 0 ? 1 : -1;
        this.vx = this.facing * 480;
        this.vy = 0;
        this.stateTimer = 1.6;

        this.orbs = [];
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          this.orbs.push({ angle, dist: 55, speed: 5 });
        }
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      } else {
        // 4. SOUL ORB VOLLEY
        this.state = 'ORB_ATTACK';
        this.x = player.x + (this.facing > 0 ? -220 : 220);
        this.y = 260;
        this.vx = 0;
        this.vy = 0;
        this.stateTimer = 1.8;

        this.orbs = [];
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2;
          this.orbs.push({ angle, dist: 45, speed: 4 });
        }
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      }
    }

    // ----------------------------------------------------
    // STATE ACTIONS
    // ----------------------------------------------------
    if (this.state === 'SLAM') {
      if (this.grounded || this.y >= room.height - 180) {
        this.state = 'IDLE';
        this.stateTimer = 0.5;
        this.vy = 0;
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 140, '#ffffff');
          particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height, 20, '#88d6ff');
        }
        if (camera && camera.shake) camera.shake(5, 0.25);

        // Ground shockwave
        const slamRect = { x: this.x - 70, y: this.y + this.height - 30, width: this.width + 140, height: 35 };
        if (Physics.rectIntersect(slamRect, player.getBounds())) {
          player.takeDamage(1, this.x + this.width / 2, soundManager, particles, camera);
        }
      }
    } else if (this.state === 'FAKEOUT_SLAM') {
      if (!this.fakeoutTriggered && this.y >= 300) {
        this.fakeoutTriggered = true;
        this.vy = 0;
        this.y = 220; // Teleport pause trick
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
      } else if (this.fakeoutTriggered) {
        this.vy = 900;
        if (this.grounded || this.y >= room.height - 180) {
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
      // Rotating orbs damage check
      for (const orb of this.orbs) {
        orb.angle += dt * orb.speed;
        const ox = this.x + this.width / 2 + Math.cos(orb.angle) * orb.dist;
        const oy = this.y + this.height / 2 + Math.sin(orb.angle) * orb.dist;
        const orbRect = { x: ox - 14, y: oy - 14, width: 28, height: 28 };
        if (Physics.rectIntersect(orbRect, player.getBounds())) {
          player.takeDamage(1, ox, soundManager, particles, camera);
        }
      }
      if (this.stateTimer <= 0) {
        this.state = 'IDLE';
        this.stateTimer = 0.5;
        this.orbs = [];
      }
    } else if (this.state === 'ORB_ATTACK') {
      for (const orb of this.orbs) {
        orb.angle += dt * orb.speed;
        const ox = this.x + this.width / 2 + Math.cos(orb.angle) * orb.dist;
        const oy = this.y + this.height / 2 + Math.sin(orb.angle) * orb.dist;
        const orbRect = { x: ox - 12, y: oy - 12, width: 24, height: 24 };
        if (Physics.rectIntersect(orbRect, player.getBounds())) {
          player.takeDamage(1, ox, soundManager, particles, camera);
        }
      }
      if (this.stateTimer <= 0) {
        this.state = 'IDLE';
        this.stateTimer = 0.5;
        this.orbs = [];
      }
    }
  }

  draw(ctx, camera) {
    if (!this.active || this.isDead) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.save();

    // Draw Orbiting Soul Orbs
    for (const orb of this.orbs) {
      const ox = this.x + this.width / 2 + Math.cos(orb.angle) * orb.dist - camera.x;
      const oy = this.y + this.height / 2 + Math.sin(orb.angle) * orb.dist - camera.y;

      ctx.save();
      ctx.shadowColor = '#88d6ff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ox, oy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Soul Master Body
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    if (this.facing < 0) ctx.scale(-1, 1);

    ctx.shadowColor = '#88d6ff';
    ctx.shadowBlur = 14;

    // Flowing Robe
    ctx.fillStyle = '#1e1428';
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
