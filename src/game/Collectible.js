import { Entity } from '../entities/Entity.js';
import { Physics } from '../engine/Physics.js';

export class GeoCoin extends Entity {
  constructor(x, y, value = 1) {
    const size = value >= 20 ? 14 : (value >= 5 ? 12 : 10);
    super(x, y, size, size);
    this.value = value;
    this.vx = (Math.random() - 0.5) * 160;
    this.vy = -Math.random() * 200 - 80;
    this.gravity = 900;
    this.maxFallSpeed = 400;
    this.active = true;
    this.magnetRadius = 130;
  }

  static createMultiDenominations(x, y, totalValue) {
    const coins = [];
    let remaining = totalValue;

    const count20 = Math.floor(remaining / 20);
    remaining %= 20;

    const count5 = Math.floor(remaining / 5);
    remaining %= 5;

    const count1 = remaining;

    for (let i = 0; i < count20; i++) {
      coins.push(new GeoCoin(x + (Math.random() - 0.5) * 12, y + (Math.random() - 0.5) * 12, 20));
    }
    for (let i = 0; i < count5; i++) {
      coins.push(new GeoCoin(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, 5));
    }
    for (let i = 0; i < count1; i++) {
      coins.push(new GeoCoin(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, 1));
    }

    return coins;
  }

  update(dt, player, soundManager, particles, tilemap) {
    if (!this.active) return;

    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
    const dist = Math.hypot(dx, dy);

    if (dist < 22) {
      this.active = false;
      player.geo += this.value;
      if (soundManager && soundManager.playGeo) soundManager.playGeo();
      if (particles && particles.spawnHitSparks) {
        const sparkColor = this.value >= 20 ? '#ff4466' : (this.value >= 5 ? '#40c0ff' : '#ffcf40');
        particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 4, sparkColor);
      }
      return;
    }

    if (dist < this.magnetRadius) {
      this.vx += (dx / dist) * 450 * dt;
      this.vy += (dy / dist) * 450 * dt;
    }

    Physics.checkTileCollision(this, tilemap, dt);
  }

  draw(ctx, camera) {
    if (!this.active) return;
    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);
    const radius = this.width / 2;

    ctx.save();
    if (this.value >= 20) {
      // 20 Geo: Large Ruby/Gold Coin
      ctx.fillStyle = '#ff4466';
      ctx.strokeStyle = '#ffcf40';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX + radius, screenY + radius, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(screenX + radius, screenY + radius, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.value >= 5) {
      // 5 Geo: Medium Cyan/Silver Coin
      ctx.fillStyle = '#40c0ff';
      ctx.strokeStyle = '#2080e0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(screenX + radius, screenY + radius, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e0f4ff';
      ctx.beginPath();
      ctx.arc(screenX + radius, screenY + radius, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 1 Geo: Standard Gold Coin
      ctx.fillStyle = '#ffcf40';
      ctx.strokeStyle = '#b38600';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(screenX + radius, screenY + radius, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

export class AbilityUnlock extends Entity {
  constructor(x, y, abilityKey, title) {
    super(x, y, 32, 48);
    this.abilityKey = abilityKey;
    this.title = title;
    this.active = true;
    this.hoverTimer = 0;
  }

  update(dt, player, soundManager, particles) {
    if (!this.active) return;
    this.hoverTimer += dt * 3;

    // Generous 45px pickup radius
    const dx = Math.abs((player.x + player.width / 2) - (this.x + this.width / 2));
    const dy = Math.abs((player.y + player.height / 2) - (this.y + this.height / 2));

    if (dx < 45 && dy < 45) {
      this.active = false;
      player.abilities[this.abilityKey] = true;
      if (soundManager && soundManager.playBenchBell) soundManager.playBenchBell();
      if (particles && particles.spawnShockwave) {
        particles.spawnShockwave(this.x + 16, this.y + 24, 120, '#88d6ff');
        particles.spawnHitSparks(this.x + 16, this.y + 24, 16, '#ffffff');
      }
    }
  }

  draw(ctx, camera) {
    if (!this.active) return;
    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y) + Math.sin(this.hoverTimer) * 6;

    ctx.save();

    // 1. Radiant Glowing Radial Aura
    const auraGrad = ctx.createRadialGradient(screenX + 16, screenY + 24, 4, screenX + 16, screenY + 24, 40);
    auraGrad.addColorStop(0, 'rgba(180, 235, 255, 0.7)');
    auraGrad.addColorStop(0.6, 'rgba(100, 180, 255, 0.3)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(screenX + 16, screenY + 24, 40, 0, Math.PI * 2);
    ctx.fill();

    // 2. Floating Diamond Relic Orb
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#88d6ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(screenX + 16, screenY);
    ctx.lineTo(screenX + 32, screenY + 24);
    ctx.lineTo(screenX + 16, screenY + 48);
    ctx.lineTo(screenX, screenY + 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Floating Title Banner Prompt
    ctx.fillStyle = 'rgba(10, 16, 28, 0.9)';
    ctx.strokeStyle = '#ffcf40';
    ctx.lineWidth = 1.5;
    const bannerW = 200;
    const bannerH = 26;
    const bannerX = screenX + 16 - bannerW / 2;
    const bannerY = screenY - 32;

    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
    ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

    ctx.fillStyle = '#ffcf40';
    ctx.font = '700 11px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`✦ UNLOCK: ${this.title}`, screenX + 16, bannerY + 17);

    ctx.restore();
  }
}
