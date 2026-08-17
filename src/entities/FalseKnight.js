import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class FalseKnight extends Enemy {
  constructor(x, y) {
    super(x, y, 70, 90, 220, 200); // 220 HP
    this.speed = 95;
    this.state = 'IDLE'; // IDLE, MOVE, SLAM, SHOCKWAVE_SLAM, RAGE_TANTRUM, JUMP_SLAM
    this.stateTimer = 1.0;
    this.facing = -1;
    this.isBoss = true;
    this.bossName = 'FALSE KNIGHT';

    this.shockwaves = []; // [{ x, y, vx, radius, life }]
    this.fallingRocks = []; // [{ x, y, vy, size }]
    this.animTimer = 0;
  }

  update(dt, player, tilemap, soundManager, particles, camera) {
    super.update(dt);
    if (this.isDead) return;

    this.animTimer += dt;
    this.stateTimer -= dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dist = Math.abs(dx);

    if (this.state !== 'SLAM' && this.state !== 'SHOCKWAVE_SLAM' && this.state !== 'RAGE_TANTRUM') {
      this.facing = dx > 0 ? 1 : -1;
    }

    // ----------------------------------------------------
    // STATE MACHINE & ATTACK SELECTION
    // ----------------------------------------------------
    if (this.stateTimer <= 0) {
      const rand = Math.random();

      if (rand < 0.28) {
        // 1. SHOCKWAVE SLAM (Mace ground impact with travelling shockwave!)
        this.state = 'SHOCKWAVE_SLAM';
        this.stateTimer = 1.4;
        this.vx = 0;
        this.facing = dx > 0 ? 1 : -1;
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
      } else if (rand < 0.55) {
        // 2. JUMP SLAM (High leaping arc smash)
        this.state = 'JUMP_SLAM';
        this.vy = -620;
        this.vx = (dx > 0 ? 1 : -1) * (140 + Math.random() * 80);
        this.stateTimer = 1.5;
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      } else if (rand < 0.75 && this.hp < 150) {
        // 3. RAGE TANTRUM (Flailing mace causing falling ceiling boulders!)
        this.state = 'RAGE_TANTRUM';
        this.stateTimer = 2.4;
        this.vx = 0;
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
      } else {
        // 4. ADVANCING STOMP
        this.state = 'MOVE';
        this.stateTimer = 1.2;
        this.vx = this.facing * this.speed;
      }
    }

    // ----------------------------------------------------
    // STATE ACTIONS
    // ----------------------------------------------------
    if (this.state === 'SHOCKWAVE_SLAM') {
      if (this.stateTimer < 0.7 && this.shockwaves.length === 0) {
        // Spawn travelling shockwave
        const swX = this.x + (this.facing > 0 ? this.width + 10 : -10);
        this.shockwaves.push({
          x: swX,
          y: this.y + this.height - 24,
          vx: this.facing * 360,
          width: 32,
          height: 36,
          life: 1.6
        });
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (camera && camera.shake) camera.shake(5, 0.25);
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(swX, this.y + this.height, 100, '#ff9944');
        }
      }
    } else if (this.state === 'JUMP_SLAM') {
      if (this.grounded && this.vy >= 0) {
        this.state = 'IDLE';
        this.vx = 0;
        this.stateTimer = 0.5;
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (camera && camera.shake) camera.shake(6, 0.25);
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 120, '#ffffff');
          particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height, 16, '#ff9944');
        }
      }
    } else if (this.state === 'RAGE_TANTRUM') {
      if (Math.random() < 0.25) {
        // Spawn falling boulder
        this.fallingRocks.push({
          x: player.x + (Math.random() - 0.5) * 280,
          y: 60,
          vy: 420 + Math.random() * 150,
          size: 16 + Math.random() * 12,
          life: 2.0
        });
        if (particles && particles.spawnHitSparks) {
          particles.spawnHitSparks(this.x + this.width / 2, this.y, 4, '#ff9933');
        }
      }
    }

    // Update travelling ground shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.x += sw.vx * dt;
      sw.life -= dt;
      if (Physics.rectIntersect(sw, player.getBounds())) {
        player.takeDamage(1, sw.x, soundManager, particles, camera);
      }
      if (particles && Math.random() < 0.4) {
        particles.spawnDust(sw.x, sw.y + sw.height, 3);
      }
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update falling rocks
    for (let i = this.fallingRocks.length - 1; i >= 0; i--) {
      const rock = this.fallingRocks[i];
      rock.y += rock.vy * dt;
      const rockRect = { x: rock.x - rock.size / 2, y: rock.y - rock.size / 2, width: rock.size, height: rock.size };
      if (Physics.rectIntersect(rockRect, player.getBounds())) {
        player.takeDamage(1, rock.x, soundManager, particles, camera);
        rock.y = 9999;
      }
      if (rock.y >= this.y + this.height - 10) {
        if (particles && particles.spawnDust) {
          particles.spawnDust(rock.x, rock.y, 6);
        }
        this.fallingRocks.splice(i, 1);
      }
    }

    Physics.checkTileCollision(this, tilemap, dt);
  }

  draw(ctx, camera) {
    if (!this.active || this.isDead) return;

    const view = camera.getView ? camera.getView() : camera;
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();

    // 1. Draw Shockwaves
    for (const sw of this.shockwaves) {
      const sx = sw.x - view.x;
      const sy = sw.y - view.y;
      ctx.fillStyle = '#ff9944';
      ctx.beginPath();
      ctx.moveTo(sx, sy + sw.height);
      ctx.lineTo(sx + sw.width / 2, sy);
      ctx.lineTo(sx + sw.width, sy + sw.height);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Draw Falling Rocks
    for (const rock of this.fallingRocks) {
      const rx = rock.x - view.x;
      const ry = rock.y - view.y;
      ctx.fillStyle = '#607088';
      ctx.beginPath();
      ctx.arc(rx, ry, rock.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Draw Armor Body
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    if (this.facing < 0) ctx.scale(-1, 1);

    const t = this.animTimer || 0;
    const isMoving = this.state === 'MOVE' || this.state === 'RAGE_TANTRUM';
    const stompLeft = isMoving ? Math.sin(t * 10) * 8 : 0;
    const stompRight = isMoving ? -Math.sin(t * 10) * 8 : 0;
    const breathY = Math.sin(t * 4) * 2;

    ctx.fillStyle = '#10141e';
    ctx.fillRect(-24 + stompLeft, 26, 14, 16);
    ctx.fillRect(10 + stompRight, 26, 14, 16);

    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : (this.state === 'RAGE_TANTRUM' ? '#4a151b' : '#181d28');

    // Massive Dome Armor Body
    ctx.beginPath();
    ctx.ellipse(0, -10 + breathY, 36, 42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Steel Horns & Crown
    ctx.fillStyle = '#607088';
    ctx.fillRect(-28, -50, 56, 16);
    ctx.beginPath();
    ctx.moveTo(-20, -50);
    ctx.lineTo(-34, -75);
    ctx.lineTo(-10, -50);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, -50);
    ctx.lineTo(34, -75);
    ctx.lineTo(10, -50);
    ctx.fill();

    // Glowing Eyes
    ctx.fillStyle = this.state === 'RAGE_TANTRUM' ? '#ff2200' : '#ffcf40';
    ctx.beginPath();
    ctx.arc(14, -22, 6, 0, Math.PI * 2);
    ctx.fill();

    // Heavy Mace Weapon
    ctx.fillStyle = '#404c5e';
    ctx.fillRect(20, -10, 48, 12);
    ctx.fillStyle = '#222935';
    ctx.beginPath();
    ctx.arc(68, -4, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
