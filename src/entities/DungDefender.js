import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class DungDefender extends Enemy {
  constructor(x, y) {
    super(x, y, 48, 54, 300, 250); // 300 HP
    this.speed = 160;
    this.state = 'IDLE'; // IDLE, BURROW, ERUPT, ROLL_BALL, DIVE, GEYSER_BURST, CURL_ROLL
    this.stateTimer = 1.0;
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

    if (this.state !== 'BURROW') {
      this.facing = dx > 0 ? 1 : -1;
    }

    // ----------------------------------------------------
    // STATE MACHINE & ATTACKS
    // ----------------------------------------------------
    if (this.stateTimer <= 0) {
      const rand = Math.random();

      if (rand < 0.25) {
        // 1. BURROW & ERUPT ("DOMA DOMA!")
        this.state = 'BURROW';
        this.vx = (dx > 0 ? 1 : -1) * 230;
        this.vy = 0;
        this.stateTimer = 1.2;
        if (particles && particles.spawnHitSparks) {
          particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height, 12, '#8d6e63');
        }
      } else if (rand < 0.50) {
        // 2. TOSS BOUNCING DUNG BALLS
        this.state = 'ROLL_BALL';
        this.vx = 0;
        this.vy = -180;
        this.stateTimer = 1.5;

        // Spawn 2 bouncing brown spheres
        this.balls.push(
          { x: this.x + this.width / 2, y: this.y + 10, vx: (dx > 0 ? 1 : -1) * 320, vy: -260, radius: 14, life: 3.5 },
          { x: this.x + this.width / 2, y: this.y + 10, vx: (dx > 0 ? -1 : 1) * 240, vy: -320, radius: 14, life: 3.5 }
        );
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
      } else if (rand < 0.72) {
        // 3. GEYSER BURST (Erupts and sends 4 dung volleys skyward)
        this.state = 'GEYSER_BURST';
        this.vy = -500;
        this.vx = (dx > 0 ? 1 : -1) * 120;
        this.stateTimer = 1.6;

        for (let i = -2; i <= 2; i++) {
          if (i === 0) continue;
          this.balls.push({
            x: this.x + this.width / 2,
            y: this.y,
            vx: i * 160,
            vy: -420 + Math.random() * 80,
            radius: 12,
            life: 3.0
          });
        }
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
        if (camera && camera.shake) camera.shake(5, 0.25);
      } else if (rand < 0.88) {
        // 4. CURL ROLL BOUNCE
        this.state = 'CURL_ROLL';
        this.vx = (dx > 0 ? 1 : -1) * 420;
        this.vy = -200;
        this.stateTimer = 1.3;
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      } else {
        // 5. HIGH LEAP DIVE
        this.state = 'DIVE';
        this.vx = (dx > 0 ? 1 : -1) * 260;
        this.vy = -560;
        this.stateTimer = 1.5;
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      }
    }

    // ----------------------------------------------------
    // STATE ACTIONS
    // ----------------------------------------------------
    if (this.state === 'BURROW') {
      if (particles && Math.random() < 0.5) {
        particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height - 4, 3, '#8d6e63');
      }
      if (this.stateTimer < 0.2) {
        this.state = 'ERUPT';
        this.vy = -620;
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 130, '#d7ccc8');
        }
        if (camera && camera.shake) camera.shake(5, 0.2);
      }
    } else if (this.state === 'ERUPT' || this.state === 'DIVE' || this.state === 'GEYSER_BURST') {
      if (this.grounded && this.vy >= 0) {
        this.state = 'IDLE';
        this.stateTimer = 0.5;
        this.vx = 0;
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 100, '#8d6e63');
        }
      }
    } else if (this.state === 'CURL_ROLL') {
      if (this.grounded) {
        this.vy = -180; // Bouncing ball motion
      }
    }

    // Update Bouncing Dung Balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.vy += 850 * dt; // Gravity
      ball.life -= dt;

      // Floor bounce
      if (ball.y >= room.height - 180) {
        ball.y = room.height - 180;
        ball.vy = -ball.vy * 0.78;
        if (particles && Math.random() < 0.5) {
          particles.spawnDust(ball.x, ball.y, 4);
        }
      }

      const ballRect = { x: ball.x - ball.radius, y: ball.y - ball.radius, width: ball.radius * 2, height: ball.radius * 2 };
      if (Physics.rectIntersect(ballRect, player.getBounds())) {
        player.takeDamage(1, ball.x, soundManager, particles, camera);
      }

      if (ball.life <= 0) {
        this.balls.splice(i, 1);
      }
    }
  }

  draw(ctx, camera) {
    if (!this.active || this.isDead) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.save();

    // 1. Draw Bouncing Dung Spheres
    for (const ball of this.balls) {
      const bx = ball.x - camera.x;
      const by = ball.y - camera.y;

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
      // Burrowed lump in soil
      ctx.fillStyle = '#5d4037';
      ctx.beginPath();
      ctx.arc(0, 20, 18, 0, Math.PI, true);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Round Heavy Beetle Armor
    ctx.fillStyle = '#5d4037';
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
