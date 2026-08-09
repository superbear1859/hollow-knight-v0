import { Entity } from './Entity.js';

export class CrumblingPlatform extends Entity {
  constructor(x, y, width = 64, height = 16) {
    super(x, y, width, height);
    this.state = 'IDLE'; // 'IDLE', 'SHAKING', 'CRUMBLED'
    this.shakeTimer = 0;
    this.maxShakeTime = 0.4;
    this.respawnTimer = 0;
    this.maxRespawnTime = 3.0;
    this.solid = true;
    this.shakeOffset = 0;
    this.active = true;
  }

  onStepOn() {
    if (this.state === 'IDLE') {
      this.state = 'SHAKING';
      this.shakeTimer = this.maxShakeTime;
    }
  }

  update(dt, player, particles, soundManager) {
    super.update(dt);

    if (this.state === 'SHAKING') {
      this.shakeTimer -= dt;
      this.shakeOffset = (Math.random() - 0.5) * 4;

      if (particles && Math.random() < 0.3) {
        particles.spawnDust(this.x + Math.random() * this.width, this.y, 1);
      }

      if (this.shakeTimer <= 0) {
        this.state = 'CRUMBLED';
        this.solid = false;
        this.respawnTimer = this.maxRespawnTime;
        this.shakeOffset = 0;

        if (soundManager && soundManager.playHit) {
          soundManager.playHit();
        }
        if (particles) {
          particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 8, '#aaaaaa');
          particles.spawnDust(this.x + this.width / 2, this.y + this.height / 2, 6);
        }
      }
    } else if (this.state === 'CRUMBLED') {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.state = 'IDLE';
        this.solid = true;
        this.shakeOffset = 0;
      }
    }

    // Auto-detect player standing on top of platform
    if (player && this.solid && this.state === 'IDLE') {
      const playerBounds = player.getBounds ? player.getBounds() : {
        x: player.x + (player.boxOffsetX || 0),
        y: player.y + (player.boxOffsetY || 0),
        width: player.width,
        height: player.height
      };

      const feetY = playerBounds.y + playerBounds.height;
      const horizontalOverlap = playerBounds.x + playerBounds.width > this.x && playerBounds.x < this.x + this.width;
      const standingOnTop = player.grounded && feetY >= this.y - 2 && feetY <= this.y + 8;

      if (horizontalOverlap && standingOnTop) {
        this.onStepOn();
      }
    }
  }

  draw(ctx, camera) {
    if (this.state === 'CRUMBLED') return;

    const view = camera.getView();
    const screenX = Math.round(this.x + this.shakeOffset - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();
    // Rock / Crumbling Stone Platform Graphic
    ctx.fillStyle = this.state === 'SHAKING' ? '#4a5568' : '#2d3748';
    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 2;

    ctx.fillRect(screenX, screenY, this.width, this.height);
    ctx.strokeRect(screenX, screenY, this.width, this.height);

    // Crack details
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX + 8, screenY + 2);
    ctx.lineTo(screenX + 16, screenY + 12);
    ctx.lineTo(screenX + 28, screenY + 6);
    if (this.width > 32) {
      ctx.moveTo(screenX + 40, screenY + 3);
      ctx.lineTo(screenX + 52, screenY + 13);
    }
    ctx.stroke();

    ctx.restore();
  }
}
