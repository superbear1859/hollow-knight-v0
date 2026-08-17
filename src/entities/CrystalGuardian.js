import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class CrystalGuardian extends Enemy {
  constructor(x, y) {
    super(x, y, 52, 60, 260, 250); // 260 HP
    this.speed = 180;
    this.state = 'RESTING'; // RESTING, AWAKEN, IDLE, JUMP, LASER_AIM, LASER_FIRE, CEILING_LASER_AIM, CEILING_LASER_FIRE, CRYSTAL_SPIKES
    this.stateTimer = 1.0;
    this.facing = -1;
    this.isBoss = true;
    this.bossName = 'CRYSTAL GUARDIAN';

    this.laserBeam = null;
    this.ceilingLasers = [];
    this.crystalSpikes = []; // [{ x, y, width, height, life }]
    this.animTimer = 0;
    this.enraged = false;
  }

  takeDamage(damage, sourceX, soundManager, particles, player) {
    if (this.invulnerable || this.isDead) return false;

    // Immediately awaken and engage in battle
    if (this.state === 'RESTING' || this.state === 'AWAKEN') {
      this.awaken(soundManager, particles);
    }

    const defeated = super.takeDamage(damage, sourceX, soundManager, particles, player);
    this.invulnerable = true;
    this.invulnerableTimer = 0.22;

    if (this.hp <= this.maxHp * 0.5 && !this.enraged) {
      this.enraged = true;
      if (particles && particles.spawnShockwave) {
        particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 120, '#ff44aa');
      }
    }
    return defeated;
  }

  awaken(soundManager, particles) {
    if (this.state !== 'RESTING') return;
    this.state = 'AWAKEN';
    this.stateTimer = 0.5;
    this.vy = -350; // Jump up off the bench to engage player
    if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
    if (particles && particles.spawnShockwave) {
      particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 110, '#ff66cc');
      particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 20, '#ffffff');
    }
  }

  update(dt, player, room, soundManager, particles, camera) {
    super.update(dt);
    if (this.isDead) return;

    this.animTimer += dt;
    this.stateTimer -= dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dist = Math.abs(dx);

    if (this.state === 'RESTING') {
      if (dist < 220) {
        this.awaken(soundManager, particles);
      }
      Physics.checkTileCollision(this, room, dt);
      return;
    }

    if (this.state === 'AWAKEN') {
      if (this.stateTimer <= 0 || (this.grounded && this.vy >= 0)) {
        this.state = 'IDLE';
        this.stateTimer = 0.4;
      }
      Physics.checkTileCollision(this, room, dt);
      return;
    }

    if (this.state !== 'LASER_FIRE' && this.state !== 'LASER_AIM' && this.state !== 'CRYSTAL_SPIKES') {
      this.facing = dx > 0 ? 1 : -1;
    }

    // ----------------------------------------------------
    // STATE MACHINE & ATTACK SELECTION
    // ----------------------------------------------------
    if (this.stateTimer <= 0 && this.state === 'IDLE') {
      const rand = Math.random();
      const actionSpeed = this.enraged ? 0.75 : 1.0;

      if (rand < 0.32) {
        // 1. AIMED HORIZONTAL LASER BEAM
        this.state = 'LASER_AIM';
        this.facing = dx > 0 ? 1 : -1;
        this.stateTimer = 0.55 * actionSpeed;
        this.vx = 0;
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
        if (particles && particles.spawnHitSparks) {
          particles.spawnHitSparks(this.x + (this.facing > 0 ? this.width : 0), this.y + 24, 8, '#ff66cc');
        }
      } else if (rand < 0.60) {
        // 2. CEILING CRYSTAL LASER BARRAGE
        this.state = 'CEILING_LASER_AIM';
        this.stateTimer = 0.75 * actionSpeed;
        this.vx = 0;
        this.ceilingLasers = [];
        const laserCount = this.enraged ? 4 : 3;
        for (let i = 0; i < laserCount; i++) {
          const targetX = player.x + (i - Math.floor(laserCount / 2)) * 140 + (Math.random() - 0.5) * 60;
          this.ceilingLasers.push({
            x: Math.max(80, Math.min(room.width - 120, targetX)),
            width: 28,
            timer: 0.75 * actionSpeed,
            active: false
          });
        }
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
      } else if (rand < 0.82) {
        // 3. CRYSTAL SPIKE ERUPTION
        this.state = 'CRYSTAL_SPIKES';
        this.stateTimer = 1.1 * actionSpeed;
        this.vx = 0;
        this.crystalSpikes = [];
        for (let i = -2; i <= 2; i++) {
          this.crystalSpikes.push({
            x: this.x + this.width / 2 + i * 44,
            y: this.y + this.height - 32,
            width: 26,
            height: 38,
            life: 1.1
          });
        }
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (camera && camera.shake) camera.shake(5, 0.25);
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 120, '#ff44aa');
        }
      } else {
        // 4. JUMP & REPOSITION SLAM
        this.state = 'JUMP';
        this.vy = -560;
        this.vx = (dx > 0 ? 1 : -1) * (200 + Math.random() * 80);
        this.stateTimer = 1.5; // safety timeout
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      }
    }

    // ----------------------------------------------------
    // STATE ACTIONS
    // ----------------------------------------------------
    if (this.state === 'IDLE') {
      // Active stalk/pacing toward player
      this.vx = this.facing * (this.speed * 0.75);
    } else if (this.state === 'LASER_AIM') {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = 'LASER_FIRE';
        this.stateTimer = 0.45;
        const laserW = 750;
        const lx = this.facing > 0 ? (this.x + this.width) : (this.x - laserW);
        this.laserBeam = {
          x: lx,
          y: this.y + 18,
          width: laserW,
          height: 24,
          timer: 0.45
        };
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (camera && camera.shake) camera.shake(4, 0.2);
      }
    } else if (this.state === 'LASER_FIRE') {
      this.vx = 0;
      if (this.laserBeam) {
        this.laserBeam.timer -= dt;
        if (Physics.rectIntersect(this.laserBeam, player.getBounds())) {
          player.takeDamage(1, this.x + this.width / 2, soundManager, particles, camera);
        }
        if (particles && Math.random() < 0.5) {
          particles.spawnHitSparks(this.laserBeam.x + Math.random() * this.laserBeam.width, this.laserBeam.y + 12, 2, '#ffffff');
        }
        if (this.laserBeam.timer <= 0) {
          this.laserBeam = null;
          this.state = 'IDLE';
          this.stateTimer = this.enraged ? 0.35 : 0.55;
        }
      }
    } else if (this.state === 'CEILING_LASER_AIM') {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = 'CEILING_LASER_FIRE';
        this.stateTimer = 0.45;
        for (const cl of this.ceilingLasers) {
          cl.active = true;
        }
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (camera && camera.shake) camera.shake(5, 0.25);
      }
    } else if (this.state === 'CEILING_LASER_FIRE') {
      this.vx = 0;
      for (const cl of this.ceilingLasers) {
        if (cl.active) {
          const laserRect = { x: cl.x - cl.width / 2, y: 0, width: cl.width, height: room.height };
          if (Physics.rectIntersect(laserRect, player.getBounds())) {
            player.takeDamage(1, cl.x, soundManager, particles, camera);
          }
          if (particles && Math.random() < 0.4) {
            particles.spawnHitSparks(cl.x, room.height - 180 + Math.random() * 40, 3, '#ff66cc');
          }
        }
      }
      if (this.stateTimer <= 0) {
        this.ceilingLasers = [];
        this.state = 'IDLE';
        this.stateTimer = this.enraged ? 0.35 : 0.6;
      }
    } else if (this.state === 'CRYSTAL_SPIKES') {
      this.vx = 0;
      for (let i = this.crystalSpikes.length - 1; i >= 0; i--) {
        const spike = this.crystalSpikes[i];
        spike.life -= dt;
        if (Physics.rectIntersect(spike, player.getBounds())) {
          player.takeDamage(1, spike.x, soundManager, particles, camera);
        }
        if (spike.life <= 0) {
          this.crystalSpikes.splice(i, 1);
        }
      }
      if (this.stateTimer <= 0) {
        this.state = 'IDLE';
        this.stateTimer = this.enraged ? 0.3 : 0.5;
      }
    } else if (this.state === 'JUMP') {
      if ((this.grounded && this.vy >= 0) || this.stateTimer <= 0) {
        this.state = 'IDLE';
        this.vx = 0;
        this.stateTimer = this.enraged ? 0.3 : 0.5;
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 80, '#ff66cc');
        }
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

    // 1. Draw Ceiling Laser Telegraphs / Active Beams
    if (this.ceilingLasers && this.ceilingLasers.length > 0) {
      for (const cl of this.ceilingLasers) {
        const cx = cl.x - view.x;
        if (cl.active) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - cl.width / 2, 0, cl.width, 1000);
          ctx.fillStyle = 'rgba(255, 68, 170, 0.75)';
          ctx.fillRect(cx - cl.width / 2 - 4, 0, cl.width + 8, 1000);
        } else {
          ctx.strokeStyle = 'rgba(255, 100, 200, 0.5)';
          ctx.lineWidth = 2;
          if (typeof ctx.setLineDash === 'function') ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(cx, 0);
          ctx.lineTo(cx, 1000);
          ctx.stroke();
          if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
        }
      }
    }

    // 2. Draw Crystal Spikes
    for (const spike of this.crystalSpikes) {
      const sx = spike.x - view.x;
      const sy = spike.y - view.y;
      ctx.fillStyle = '#ff44aa';
      ctx.beginPath();
      ctx.moveTo(sx, sy + spike.height);
      ctx.lineTo(sx + spike.width / 2, sy);
      ctx.lineTo(sx + spike.width, sy + spike.height);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Draw Horizontal Laser Beam
    if (this.laserBeam) {
      const lx = this.laserBeam.x - view.x;
      const ly = this.laserBeam.y - view.y;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(lx, ly, this.laserBeam.width, this.laserBeam.height);
      ctx.fillStyle = 'rgba(255, 68, 170, 0.7)';
      ctx.fillRect(lx, ly - 3, this.laserBeam.width, this.laserBeam.height + 6);
    } else if (this.state === 'LASER_AIM') {
      const lx = (this.facing > 0 ? this.x + this.width : this.x) - view.x;
      const ly = (this.y + 24) - view.y;
      ctx.strokeStyle = 'rgba(255, 100, 200, 0.6)';
      ctx.lineWidth = 2;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + this.facing * 750, ly);
      ctx.stroke();
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
    }

    // 4. Draw Crystal Guardian Body
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    if (this.facing < 0) ctx.scale(-1, 1);

    ctx.shadowColor = '#ff44aa';
    ctx.shadowBlur = this.enraged ? 18 : 10;

    // Heavy Crystalline Husk Body
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#2a1a2e';
    ctx.fillRect(-22, -26, 44, 52);

    // Crystal Shards on Head & Back
    ctx.fillStyle = '#ff66cc';
    ctx.beginPath();
    ctx.moveTo(-16, -26);
    ctx.lineTo(-4, -46);
    ctx.lineTo(8, -26);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff3399';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(16, -42);
    ctx.lineTo(24, -26);
    ctx.closePath();
    ctx.fill();

    // Chest Crystal Plate
    ctx.fillStyle = '#ff88dd';
    ctx.fillRect(-12, -10, 24, 20);

    // Eye Laser Slit
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, -18, 10, 5);

    // Legs
    ctx.fillStyle = '#1e1220';
    ctx.fillRect(-18, 22, 14, 10);
    ctx.fillRect(4, 22, 14, 10);

    ctx.restore();
  }
}
