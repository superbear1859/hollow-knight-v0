import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class DungDefender extends Enemy {
  constructor(x, y) {
    super(x, y, 48, 54, 300, 250); // 300 HP
    this.speed = 180;
    this.state = 'IDLE'; // IDLE, MOVE, BURROW, ERUPT, ROLL_BALL, DIVE, GEYSER_BURST, CURL_ROLL
    this.stateTimer = 0.8;
    this.facing = -1;
    this.isBoss = true;
    this.bossName = 'DUNG DEFENDER';

    this.balls = []; // Bouncing spherical projectiles
    this.animTimer = 0;
  }

  update(dt, player, room, soundManager, particles, camera) {
    super.update(dt);
    if (this.isDead) return;

    this.animTimer += dt;
    this.stateTimer -= dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dist = Math.abs(dx);

    if (this.state !== 'BURROW' && this.state !== 'CURL_ROLL') {
      this.facing = dx > 0 ? 1 : -1;
    }

    // ----------------------------------------------------
    // STATE MACHINE & ATTACKS
    // ----------------------------------------------------
    if (this.stateTimer <= 0) {
      if (this.state === 'IDLE') {
        const rand = Math.random();

        if (rand < 0.28) {
          // 1. BURROW UNDERGROUND & ERUPT ("DOMA DOMA!")
          this.state = 'BURROW';
          this.facing = dx > 0 ? 1 : -1;
          this.vx = this.facing * 340; // Burrows fast across the arena floor
          this.vy = 0;
          this.stateTimer = 1.4;
          if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
          if (particles && particles.spawnHitSparks) {
            particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height, 14, '#8d6e63');
          }
        } else if (rand < 0.52) {
          // 2. CURL ROLL & BOUNCE ACROSS THE ARENA
          this.state = 'CURL_ROLL';
          this.facing = dx > 0 ? 1 : -1;
          this.vx = this.facing * 380;
          this.vy = -260;
          this.stateTimer = 2.2;
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        } else if (rand < 0.72) {
          // 3. TOSS BOUNCING DUNG SPHERES
          this.state = 'ROLL_BALL';
          this.vx = this.facing * 120;
          this.vy = -220;
          this.stateTimer = 1.4;

          this.balls.push(
            { x: this.x + this.width / 2, y: this.y + 10, vx: (dx > 0 ? 1 : -1) * 320, vy: -280, radius: 15, life: 4.0 },
            { x: this.x + this.width / 2, y: this.y + 10, vx: (dx > 0 ? -1 : 1) * 220, vy: -340, radius: 15, life: 4.0 }
          );
          if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
        } else if (rand < 0.88) {
          // 4. VOLCANIC DUNG GEYSER BURST
          this.state = 'GEYSER_BURST';
          this.vy = -620;
          this.vx = this.facing * 180;
          this.stateTimer = 1.8;

          for (let i = -2; i <= 2; i++) {
            if (i === 0) continue;
            this.balls.push({
              x: this.x + this.width / 2,
              y: this.y,
              vx: i * 160 + (dx > 0 ? 60 : -60),
              vy: -440 + Math.random() * 80,
              radius: 13,
              life: 3.5
            });
          }
          if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
          if (camera && camera.shake) camera.shake(5, 0.25);
        } else {
          // 5. HIGH LEAP DIVE SMASH
          this.state = 'DIVE';
          this.vx = this.facing * 300;
          this.vy = -600;
          this.stateTimer = 1.6;
          if (soundManager && soundManager.playSlash) soundManager.playSlash();
        }
      } else {
        // Return to active patrol / stalk
        this.state = 'IDLE';
        this.stateTimer = 0.6;
        this.vx = this.facing * this.speed;
      }
    }

    // ----------------------------------------------------
    // STATE ACTIONS
    // ----------------------------------------------------
    if (this.state === 'IDLE') {
      // Actively roam towards player
      this.vx = this.facing * (this.speed * 0.85);
    } else if (this.state === 'BURROW') {
      this.vx = this.facing * 340;
      if (particles && Math.random() < 0.6) {
        particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height - 4, 3, '#8d6e63');
        particles.spawnDust(this.x + this.width / 2, this.y + this.height, 2);
      }
      // Erupt near player or when timer is low
      if (this.stateTimer < 0.3 || dist < 80) {
        this.state = 'ERUPT';
        this.vy = -660;
        this.vx = this.facing * 140;
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 140, '#d7ccc8');
          particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height, 20, '#8d6e63');
        }
        if (camera && camera.shake) camera.shake(5, 0.25);
      }
    } else if (this.state === 'CURL_ROLL') {
      if (this.grounded) {
        this.vy = -200; // Continuous bouncy rolling
        if (particles && Math.random() < 0.4) {
          particles.spawnDust(this.x + this.width / 2, this.y + this.height, 3);
        }
      }
      // Bounce off room walls
      if ((this.facing > 0 && this.x > room.width - 150) || (this.facing < 0 && this.x < 150)) {
        this.facing = -this.facing;
        this.vx = this.facing * 380;
      }
    } else if (this.state === 'ERUPT' || this.state === 'DIVE' || this.state === 'GEYSER_BURST') {
      if (this.grounded && this.vy >= 0) {
        this.state = 'IDLE';
        this.stateTimer = 0.5;
        this.vx = 0;
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 110, '#8d6e63');
        }
      }
    }

    // Update Bouncing Dung Balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.vy += 850 * dt; // Gravity
      ball.life -= dt;

      // Floor & wall bounce
      if (ball.y >= room.height - 180) {
        ball.y = room.height - 180;
        ball.vy = -ball.vy * 0.78;
        if (particles && Math.random() < 0.5) {
          particles.spawnDust(ball.x, ball.y, 4);
        }
      }
      if (ball.x <= 80 || ball.x >= room.width - 80) {
        ball.vx = -ball.vx * 0.85;
      }

      const ballRect = { x: ball.x - ball.radius, y: ball.y - ball.radius, width: ball.radius * 2, height: ball.radius * 2 };
      if (Physics.rectIntersect(ballRect, player.getBounds())) {
        player.takeDamage(1, ball.x, soundManager, particles, camera);
      }

      if (ball.life <= 0) {
        this.balls.splice(i, 1);
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

    // 1. Draw Bouncing Dung Spheres
    for (const ball of this.balls) {
      const bx = ball.x - view.x;
      const by = ball.y - view.y;

      ctx.fillStyle = '#6d4c41';
      ctx.beginPath();
      ctx.arc(bx, by, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Texture highlight
      ctx.fillStyle = '#8d6e63';
      ctx.beginPath();
      ctx.arc(bx - 3, by - 3, ball.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw Dung Defender Body
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    if (this.facing < 0) ctx.scale(-1, 1);

    if (this.state === 'BURROW') {
      // Burrowed lump moving through soil
      ctx.fillStyle = '#5d4037';
      ctx.beginPath();
      ctx.arc(0, 18, 20, 0, Math.PI, true);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (this.state === 'CURL_ROLL') {
      // Rolling ball mode
      ctx.rotate((this.animTimer || 0) * (this.facing * 12));
      ctx.fillStyle = '#5d4037';
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8d6e63';
      ctx.beginPath();
      ctx.arc(0, -6, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Round Heavy Beetle Armor
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#5d4037';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    // Chest Plate
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(-12, -8, 24, 18);

    // Defender Horn & Eyes
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.moveTo(8, -16);
    ctx.lineTo(24, -32);
    ctx.lineTo(16, -12);
    ctx.closePath();
    ctx.fill();

    // Glowing Eyes
    ctx.fillStyle = '#ffb74d';
    ctx.fillRect(8, -8, 6, 5);

    ctx.restore();
  }
}
