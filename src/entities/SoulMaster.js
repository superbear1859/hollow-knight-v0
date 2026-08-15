import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class SoulMaster extends Enemy {
  constructor(x, y) {
    super(x, y, 48, 64, 60, 300);
    this.speed = 180;
    this.state = 'IDLE'; // IDLE, TELEPORT, SLAM, ORB_ATTACK, HOVER
    this.stateTimer = 1.0;
    this.facing = -1;
    this.isBoss = true;
    this.bossName = 'SOUL MASTER';

    // Spell & Teleport Attributes
    this.teleportTimer = 0;
    this.orbs = []; // Rotating soul projectiles
    this.slamImpactActive = false;
    this.animTimer = 0;
  }

  update(dt, player, room, soundManager, particles, camera) {
    super.update(dt);
    if (this.isDead) return;

    this.animTimer += dt;
    this.stateTimer -= dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dy = (player.y + player.height / 2) - (this.y + this.height / 2);

    if (this.state !== 'SLAM') {
      this.facing = dx > 0 ? 1 : -1;
    }

    // ----------------------------------------------------
    // STATE MACHINE & ATTACK SELECTION
    // ----------------------------------------------------
    if (this.stateTimer <= 0) {
      const rand = Math.random();

      if (rand < 0.35) {
        // 1. TELEPORT SLAM (Teleport high above player, then slam straight down!)
        this.state = 'SLAM';
        this.x = player.x + (Math.random() - 0.5) * 40;
        this.y = 120; // High ceiling
        this.vx = 0;
        this.vy = 850; // Super fast slam velocity!
        this.stateTimer = 1.2;
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
        if (particles && particles.spawnHitSparks) {
          particles.spawnHitSparks(this.x + this.width / 2, this.y, 12, '#ffffff');
        }
      } else if (rand < 0.70) {
        // 2. SOUL ORB ATTACK (Hover and fire 4 tracking soul spheres)
        this.state = 'ORB_ATTACK';
        this.x = player.x + (this.facing > 0 ? -240 : 240);
        this.y = 280; // Floating mid-height
        this.vx = 0;
        this.vy = 0;
        this.stateTimer = 1.8;

        // Spawn rotating soul orbs
        this.orbs = [];
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          this.orbs.push({ angle, dist: 50, speed: 4 });
        }
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      } else {
        // 3. HOVER & TELEPORT REPOSITION
        this.state = 'HOVER';
        const targetX = player.x + (Math.random() > 0.5 ? 200 : -200);
        this.x = Math.max(80, Math.min(room.width - 120, targetX));
        this.y = 350;
        this.vx = (player.x - this.x) * 0.4;
        this.vy = 0;
        this.stateTimer = 0.8;
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 70, '#ffffff');
        }
      }
    }

    // ----------------------------------------------------
    // STATE ACTIONS
    // ----------------------------------------------------
    if (this.state === 'SLAM') {
      // Impact Ground
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

        // Ground shockwave damage against player
        const distToPlayer = Math.abs((player.x + player.width / 2) - (this.x + this.width / 2));
        if (distToPlayer < 120 && Math.abs(player.y - this.y) < 40 && !player.invulnerable) {
          player.takeDamage(1, this.x + this.width / 2, soundManager, particles, camera);
        }
      }
    } else if (this.state === 'ORB_ATTACK') {
      this.vy = Math.sin(this.animTimer * 4) * 20; // Gentle float
      // Update rotating soul orbs
      for (const orb of this.orbs) {
        orb.angle += dt * orb.speed;
        const ox = this.x + this.width / 2 + Math.cos(orb.angle) * orb.dist;
        const oy = this.y + this.height / 2 + Math.sin(orb.angle) * orb.dist;

        if (particles && Math.random() < 0.3) {
          particles.spawnHitSparks(ox, oy, 1, '#ffffff');
        }

        // Orb vs Player Collision
        const pDist = Math.hypot((player.x + player.width / 2) - ox, (player.y + player.height / 2) - oy);
        if (pDist < 20 && !player.invulnerable) {
          player.takeDamage(1, ox, soundManager, particles, camera);
        }
      }
    } else if (this.state === 'HOVER') {
      this.vy = Math.sin(this.animTimer * 3) * 30;
      this.vx *= 0.95;
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

    const hoverOffset = Math.sin(this.animTimer * 3) * 3;

    // Glowing White Soul Aura
    ctx.fillStyle = 'rgba(240, 248, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(0, hoverOffset, 36, 0, Math.PI * 2);
    ctx.fill();

    // Large Ornate Scholar Robes
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#1c2438';
    ctx.beginPath();
    ctx.moveTo(-22, -10 + hoverOffset);
    ctx.lineTo(22, -10 + hoverOffset);
    ctx.lineTo(26, 32 + hoverOffset);
    ctx.lineTo(-26, 32 + hoverOffset);
    ctx.closePath();
    ctx.fill();

    // Golden Robe Trimmings
    ctx.strokeStyle = '#c89e3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, -8 + hoverOffset);
    ctx.lineTo(20, -8 + hoverOffset);
    ctx.lineTo(24, 30 + hoverOffset);
    ctx.lineTo(-24, 30 + hoverOffset);
    ctx.closePath();
    ctx.stroke();

    // White Porcelain Mask
    ctx.fillStyle = '#f5f8fc';
    ctx.beginPath();
    ctx.ellipse(0, -20 + hoverOffset, 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mask Ornate Horn Crest
    ctx.fillStyle = '#f5f8fc';
    ctx.beginPath();
    ctx.moveTo(-10, -36 + hoverOffset);
    ctx.lineTo(0, -48 + hoverOffset);
    ctx.lineTo(10, -36 + hoverOffset);
    ctx.closePath();
    ctx.fill();

    // Slanted Soul Scholar Eye Sockets
    ctx.fillStyle = '#0a0d18';
    ctx.beginPath();
    ctx.ellipse(6, -20 + hoverOffset, 3.5, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Draw Rotating Soul Orbs
    if (this.state === 'ORB_ATTACK') {
      for (const orb of this.orbs) {
        const ox = Math.cos(orb.angle) * orb.dist;
        const oy = Math.sin(orb.angle) * orb.dist + hoverOffset;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#88d6ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ox, oy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
