import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class Hornet extends Enemy {
  constructor(x, y) {
    super(x, y, 32, 48, 50, 150);
    this.speed = 220;
    this.state = 'IDLE'; // IDLE, JUMP, LUNGE, AERIAL_DASH, NEEDLE_THROW, SPHERE
    this.stateTimer = 0.5;
    this.facing = -1;
    this.isBoss = true;
    this.bossName = 'HORNET - PROTECTOR';

    // Boomerang Needle Spear Attributes
    this.needleActive = false;
    this.needleOffset = 0;
    this.needleMaxDistance = 360;
    this.needlePhase = 'IDLE'; // IDLE, OUTBOUND, RETURNING
    this.needleRotation = 0;
    this.needleAirY = 0;

    // Aerial Action Coordination
    this.airActionChosen = false;
    this.trailTimer = 0;
  }

  update(dt, player, room, soundManager, particles, camera) {
    super.update(dt);
    if (this.isDead) return;

    this.stateTimer -= dt;
    this.trailTimer += dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
    const dist = Math.abs(dx);

    // Dynamic Facing (Track player when not actively mid-lunge or mid-dive)
    if (this.state !== 'LUNGE' && this.state !== 'AERIAL_DASH' && this.needlePhase === 'IDLE') {
      this.facing = dx > 0 ? 1 : -1;
    }

    // ----------------------------------------------------
    // STATE MACHINE & ATTACK SELECTION
    // ----------------------------------------------------
    if (this.stateTimer <= 0 && this.needlePhase === 'IDLE') {
      if (this.grounded) {
        this.facing = dx > 0 ? 1 : -1;
        const rand = Math.random();

        if (rand < 0.35) {
          // 1. FAST GROUND LUNGE DASH (560px/s)
          this.state = 'LUNGE';
          this.vx = this.facing * 560;
          this.vy = -60;
          this.stateTimer = 0.55;
          if (soundManager && soundManager.playDash) soundManager.playDash();
          if (particles && particles.spawnDust) particles.spawnDust(this.x + this.width / 2, this.y + this.height, 8);
          if (particles && particles.spawnHitSparks) particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 8, '#ff4466');
        } else if (rand < 0.65) {
          // 2. ACROBATIC HIGH JUMP INTO AIR COMBO
          this.state = 'JUMP';
          this.airActionChosen = false;
          const jumpDir = dist < 120 ? -this.facing : this.facing; // Jump towards or backflip away
          this.vx = jumpDir * (dist < 120 ? 200 : 260);
          this.vy = -560; // High aerial leap
          this.stateTimer = 0.8;
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
          if (particles && particles.spawnDust) particles.spawnDust(this.x + this.width / 2, this.y + this.height, 6);
        } else if (rand < 0.85) {
          // 3. GROUND NEEDLE THROW
          this.state = 'NEEDLE_THROW';
          this.vx = 0;
          this.needleActive = true;
          this.needlePhase = 'OUTBOUND';
          this.needleOffset = 0;
          this.needleAirY = 0;
          this.stateTimer = 1.4;
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        } else {
          // 4. JUMP INTO GOSSAMER SPHERE STORM
          this.state = 'SPHERE';
          this.vx = this.facing * 120;
          this.vy = -420;
          this.stateTimer = 0.9;
          if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
          if (particles && particles.spawnShockwave) particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 70, '#ff4466');
        }
      } else {
        // Recovery after landing or air move
        this.state = 'IDLE';
        this.stateTimer = 0.2 + Math.random() * 0.25; // Snappy recovery
      }
    }

    // ----------------------------------------------------
    // MIDAIR AERIAL ATTACK BRANCHING DURING JUMP
    // ----------------------------------------------------
    if (this.state === 'JUMP' && !this.grounded && !this.airActionChosen) {
      // At or near jump apex (vy > -200)
      if (this.vy > -200) {
        this.airActionChosen = true;
        this.facing = dx > 0 ? 1 : -1;
        const airRand = Math.random();

        if (airRand < 0.45) {
          // MIDAIR DIAGONAL DIVE DASH
          this.state = 'AERIAL_DASH';
          this.vx = this.facing * 520;
          this.vy = 380; // High speed diagonal downward strike!
          this.stateTimer = 0.65;
          if (soundManager && soundManager.playDash) soundManager.playDash();
          if (particles && particles.spawnHitSparks) {
            particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 10, '#ffffff');
          }
        } else if (airRand < 0.75) {
          // MIDAIR NEEDLE THROW (Floats at apex while casting)
          this.state = 'NEEDLE_THROW';
          this.vx = this.facing * 80;
          this.vy = -30; // Brief aerial float
          this.needleActive = true;
          this.needlePhase = 'OUTBOUND';
          this.needleOffset = 0;
          this.needleAirY = 0;
          this.stateTimer = 1.3;
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        } else {
          // MIDAIR GOSSAMER SILK SPHERE
          this.state = 'SPHERE';
          this.vx = 0;
          this.vy = -50; // Suspend in mid-air
          this.stateTimer = 0.85;
          if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
          if (particles && particles.spawnShockwave) {
            particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 80, '#ff66cc');
          }
        }
      }
    }

    // ----------------------------------------------------
    // STATE ACTIONS & DYNAMICS
    // ----------------------------------------------------
    if (this.state === 'LUNGE') {
      // Spawn rapid crimson dash phantom sparks
      if (particles && Math.random() < 0.7) {
        particles.spawnHitSparks(this.x + (this.facing > 0 ? 0 : this.width), this.y + this.height * 0.5, 2, '#ff3355');
      }
      if (this.grounded && this.stateTimer < 0.2) {
        this.vx *= 0.85;
      }
    } else if (this.state === 'AERIAL_DASH') {
      // Diagonal aerial dive dash
      if (particles && Math.random() < 0.8) {
        particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 3, '#ffffff');
      }
      if (this.grounded) {
        // Impact ground after aerial dive!
        this.state = 'IDLE';
        this.vx = 0;
        this.stateTimer = 0.3;
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (particles && particles.spawnShockwave) particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 60, '#ff4466');
        if (camera && camera.shake) camera.shake(3, 0.15);
      }
    } else if (this.state === 'SPHERE') {
      // Suspend and float slightly during silk sphere storm
      if (this.vy > 40) this.vy = 40;
      this.vx *= 0.92;

      if (particles && Math.random() < 0.5) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 25 + Math.random() * 35;
        particles.spawnHitSparks(this.x + this.width / 2 + Math.cos(ang) * rad, this.y + this.height / 2 + Math.sin(ang) * rad, 1, '#ffffff');
      }

      // Sphere AOE Damage against Player (65px radius)
      if (player && !player.invulnerable) {
        const hcx = this.x + this.width / 2;
        const hcy = this.y + this.height / 2;
        const pcx = player.x + player.width / 2;
        const pcy = player.y + player.height / 2;
        const sphereDist = Math.hypot(pcx - hcx, pcy - hcy);
        if (sphereDist < 65) {
          player.takeDamage(1, hcx, soundManager, particles, camera);
        }
      }

      if (this.stateTimer <= 0) {
        this.state = 'IDLE';
        this.stateTimer = 0.3;
      }
    } else if (this.state === 'NEEDLE_THROW' || this.needleActive) {
      if (!this.grounded) {
        this.vy = Math.min(this.vy, 60); // Gentle aerial float while throwing needle
      } else {
        this.vx *= 0.88;
      }
    } else if (this.state === 'IDLE') {
      this.vx *= 0.85;
    }

    // ----------------------------------------------------
    // BOOMERANG NEEDLE PHYSICS & FLIGHT CYCLE
    // ----------------------------------------------------
    if (this.state === 'NEEDLE_THROW' || this.needleActive) {
      this.needleRotation += dt * 32;

      const hornetCenterX = this.x + this.width / 2;
      const hornetCenterY = this.y + this.height / 2 - 5;
      const needleX = hornetCenterX + this.facing * this.needleOffset;
      const needleY = hornetCenterY;

      if (this.needlePhase === 'OUTBOUND') {
        this.needleOffset += 560 * dt; // Fast needle throw
        if (particles && Math.random() < 0.45) {
          particles.spawnHitSparks(needleX, needleY, 2, '#ffffff');
        }
        if (this.needleOffset >= this.needleMaxDistance) {
          this.needlePhase = 'RETURNING';
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        }
      } else if (this.needlePhase === 'RETURNING') {
        this.needleOffset -= 620 * dt; // Rapid snap return
        if (particles && Math.random() < 0.45) {
          particles.spawnHitSparks(needleX, needleY, 2, '#ff88aa');
        }
        if (this.needleOffset <= 0) {
          this.needleOffset = 0;
          this.needlePhase = 'IDLE';
          this.needleActive = false;
          this.state = 'IDLE';
          this.stateTimer = 0.25;
        }
      }

      // Boomerang Needle vs Player Collision Damage
      if (this.needleActive && player && !player.invulnerable) {
        const needleBounds = {
          x: needleX - 24,
          y: needleY - 14,
          width: 48,
          height: 28
        };
        if (Physics.rectIntersect(needleBounds, player.getBounds())) {
          player.takeDamage(1, needleX, soundManager, particles, camera);
        }
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

    // Dynamic Body Tilt for Dashing & Jumping Poses
    let bodyTilt = 0;
    if (this.state === 'LUNGE') {
      bodyTilt = 0.35; // Forward aerodynamic tilt
    } else if (this.state === 'AERIAL_DASH') {
      bodyTilt = 0.65; // Diagonal dive pose
    } else if (this.state === 'JUMP') {
      bodyTilt = this.vy < 0 ? -0.18 : 0.18;
    }
    ctx.rotate(bodyTilt);

    // Crimson Speed Phantom Trail during Fast Dashes
    if (this.state === 'LUNGE' || this.state === 'AERIAL_DASH') {
      ctx.fillStyle = 'rgba(200, 30, 58, 0.35)';
      ctx.fillRect(-22, -8, 20, 26);
    }

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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
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
      // Held Needle Sword (Aimed diagonally forward or downward during dive)
      ctx.strokeStyle = '#e0ecfc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (this.state === 'AERIAL_DASH') {
        ctx.moveTo(6, 4);
        ctx.lineTo(44, 20); // Aim needle diagonally downward during aerial dive!
      } else {
        ctx.moveTo(6, 4);
        ctx.lineTo(40, -10);
      }
      ctx.stroke();
    }

    // Silk Thread Gossamer Sphere AOE Attack Effect (Swirling web of razor threads)
    if (this.state === 'SPHERE') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + (this.trailTimer * 8);
        const radius = 55 + Math.sin(this.trailTimer * 20 + i) * 8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 100, 150, 0.15)';
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
