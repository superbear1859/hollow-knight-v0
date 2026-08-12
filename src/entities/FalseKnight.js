import { Enemy } from './Enemy.js';
import { Physics } from '../engine/Physics.js';

export class FalseKnight extends Enemy {
  constructor(x, y) {
    super(x, y, 70, 90, 45, 100);
    this.speed = 80;
    this.state = 'IDLE'; // IDLE, MOVE, SLAM, RAGE, STAGGERED
    this.stateTimer = 1.0;
    this.facing = -1;
    this.shockwaveActive = false;
    this.shockwaveX = 0;
    this.shockwaveY = 0;
    this.shockwaveWidth = 0;
    this.staggerCount = 0;
    this.isBoss = true;
    this.bossName = 'FALSE KNIGHT';
  }

  update(dt, player, tilemap, soundManager, particles, camera) {
    super.update(dt);
    if (this.isDead) return;

    this.animTimer = (this.animTimer || 0) + dt;
    this.stateTimer -= dt;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dist = Math.abs(dx);

    if (this.stateTimer <= 0) {
      if (this.hp < 15 && this.staggerCount < 2 && Math.random() < 0.4) {
        this.state = 'RAGE';
        this.stateTimer = 2.5;
      } else if (dist > 100) {
        this.state = 'MOVE';
        this.stateTimer = 1.5;
      } else {
        this.state = 'SLAM';
        this.stateTimer = 1.8;
        this.performSlam(player, soundManager, particles, camera);
      }
    }

    if (this.state === 'MOVE') {
      this.facing = dx > 0 ? 1 : -1;
      this.vx = this.facing * this.speed;
    } else if (this.state === 'SLAM') {
      this.vx = 0;
    } else if (this.state === 'RAGE') {
      this.vx = (Math.random() - 0.5) * 160;
      if (Math.random() < 0.1) {
        particles.spawnHitSparks(this.x + this.width / 2, this.y, 4, '#ff9933');
      }
    } else {
      this.vx = 0;
    }

    Physics.checkTileCollision(this, tilemap, dt);
  }

  performSlam(player, soundManager, particles, camera) {
    soundManager.playBossRoar();
    camera.shake(4, 0.18);

    // Shockwave travelling along ground
    particles.spawnShockwave(this.x + (this.facing > 0 ? this.width + 30 : -30), this.y + this.height, 90, '#ff9944');
    particles.spawnDust(this.x + this.width / 2, this.y + this.height, 12);
  }

  draw(ctx, camera) {
    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    if (this.facing < 0) ctx.scale(-1, 1);

    // Animated Stomping Armor Feet
    const t = this.animTimer || 0;
    const isMoving = this.state === 'MOVE' || this.state === 'RAGE';
    const stompLeft = isMoving ? Math.sin(t * 10) * 8 : 0;
    const stompRight = isMoving ? -Math.sin(t * 10) * 8 : 0;
    const breathY = Math.sin(t * 4) * 2;

    ctx.fillStyle = '#10141e';
    ctx.fillRect(-24 + stompLeft, 26, 14, 16);
    ctx.fillRect(10 + stompRight, 26, 14, 16);

    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : (this.state === 'RAGE' ? '#4a151b' : '#181d28');

    // Massive Dome Armor Body (Breathing animation)
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
    ctx.fillStyle = this.state === 'RAGE' ? '#ff2200' : '#ffcf40';
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
