import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class DungDefender extends Enemy {
  constructor(x, y) {
    super(x, y, 48, 54, 55, 250);
    this.speed = 150;
    this.state = 'IDLE'; // IDLE, BURROW, ERUPT, ROLL_BALL, DIVE
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

      if (rand < 0.4) {
        // 1. BURROW & ERUPT ("DOMA DOMA!")
        this.state = 'BURROW';
        this.vx = (dx > 0 ? 1 : -1) * 220;
        this.vy = 0;
        this.stateTimer = 1.2;
        if (particles && particles.spawnHitSparks) {
          particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height, 12, '#8d6e63');
        }
      } else if (rand < 0.75) {
        // 2. TOSS BOUNCING DUNG BALLS
        this.state = 'ROLL_BALL';
        this.vx = 0;
        this.vy = -180;
        this.stateTimer = 1.5;

        // Spawn 2 bouncing brown spheres
        this.balls.push({
          x: this.x + this.width / 2,
          y: this.y + 10,
          vx: (dx > 0 ? 1 : -1) * 320,
          vy: -260,
          radius: 14,
          life: 3.5
        });
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
      } else {
        // 3. HIGH LEAP DIVE
        this.state = 'DIVE';
        this.vx = (dx > 0 ? 1 : -1) * 260;
        this.vy = -550;
        this.stateTimer = 1.6;
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
      // Erupt from ground beneath player!
      if (this.stateTimer < 0.2) {
        this.state = 'ERUPT';
        this.vy = -600;
        if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height, 120, '#d7ccc8');
        }
        if (camera && camera.shake) camera.shake(5, 0.2);
      }
    } else if (this.state === 'ERUPT' || this.state === 'DIVE') {
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

    // Update Bouncing Spheres
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      ball.life -= dt;
      ball.vy += 800 * dt; // Gravity
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Bounce off room floor
      if (ball.y >= room.height - 180) {
        ball.y = room.height - 180;
        ball.vy = -Math.abs(ball.vy) * 0.85;
      }
      // Bounce off room walls
      if (ball.x <= 40 || ball.x >= room.width - 40) {
        ball.vx = -ball.vx;
      }

      // Ball vs Player
      const pDist = Math.hypot((player.x + player.width / 2) - ball.x, (player.y + player.height / 2) - ball.y);
      if (pDist < ball.radius + 14 && !player.invulnerable) {
        player.takeDamage(1, ball.x, soundManager, particles, camera);
      }

      if (ball.life <= 0) {
        this.balls.splice(i, 1);
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

    // Large Round Dung Beetle Body / Shell
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#6d4c41';
    ctx.beginPath();
    ctx.arc(0, 2, 22, 0, Math.PI * 2);
    ctx.fill();

    // Knight Chestplate / Plating
    ctx.fillStyle = '#bcaaa4';
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(4, 4, 14, 18, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Horned Beetle Crest
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.moveTo(8, -18);
    ctx.quadraticCurveTo(24, -30, 26, -42);
    ctx.lineTo(16, -34);
    ctx.quadraticCurveTo(12, -26, 4, -18);
    ctx.closePath();
    ctx.fill();

    // Jovial Beetle Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, -8, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(9, -8, 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw Bouncing Spheres
    if (this.balls.length > 0) {
      for (const ball of this.balls) {
        const bx = Math.round(ball.x - view.x);
        const by = Math.round(ball.y - view.y);

        ctx.restore();
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(this.animTimer * 8);

        ctx.fillStyle = '#5d4037';
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#795548';
        ctx.beginPath();
        ctx.arc(-3, -3, ball.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
