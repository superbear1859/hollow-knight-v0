import { Entity } from './Entity.js';
import { GeoCoin } from '../game/Collectible.js';

export class BreakableWall extends Entity {
  constructor(x, y, width = 32, height = 96, hp = 3, secretReward = null) {
    super(x, y, width, height);
    this.hp = hp;
    this.maxHp = hp;
    this.secretReward = secretReward; // e.g. { type: 'GEO_CACHE', count: 5 } or Collectible instance
    this.solid = true;
    this.active = true;
    this.isDestroyed = false;
    this.invulnerableTimer = 0;
  }

  takeDamage(amount = 1, soundManager, particles, room) {
    if (!this.active || this.isDestroyed || this.invulnerableTimer > 0) return false;

    this.hp -= amount;
    this.invulnerableTimer = 0.15;

    if (soundManager && soundManager.playHit) {
      soundManager.playHit();
    }
    if (particles && particles.spawnHitSparks) {
      particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 10, '#888899');
    }

    if (this.hp <= 0) {
      this.isDestroyed = true;
      this.solid = false;
      this.active = false;

      if (particles) {
        if (particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 60, '#aaaaaa');
        }
        if (particles.spawnHitSparks) {
          particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 18, '#666666');
        }
        if (particles.spawnDust) {
          particles.spawnDust(this.x + this.width / 2, this.y + this.height / 2, 10);
        }
      }

      if (this.secretReward && room) {
        this.spawnReward(room);
      }
      return true; // Destroyed
    }
    return false;
  }

  spawnReward(room) {
    if (!room || !this.secretReward) return;

    if (this.secretReward.type === 'GEO_CACHE' || typeof this.secretReward.count === 'number') {
      const count = this.secretReward.count || 5;
      const coins = GeoCoin.createMultiDenominations(
        this.x + this.width / 2,
        this.y + this.height / 2,
        count
      );
      room.collectibles.push(...coins);
    } else if (this.secretReward instanceof Entity) {
      room.collectibles.push(this.secretReward);
    } else if (typeof this.secretReward === 'object' && this.secretReward.entity) {
      room.collectibles.push(this.secretReward.entity);
    }
  }

  update(dt) {
    super.update(dt);
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }
  }

  draw(ctx, camera) {
    if (this.isDestroyed || !this.active) return;

    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();
    // Cracked Secret Masonry Wall Graphic
    ctx.fillStyle = '#1e2430';
    ctx.strokeStyle = '#3a4454';
    ctx.lineWidth = 2;

    ctx.fillRect(screenX, screenY, this.width, this.height);
    ctx.strokeRect(screenX, screenY, this.width, this.height);

    // Brick Pattern
    ctx.strokeStyle = '#2c3545';
    ctx.lineWidth = 1;
    for (let py = 16; py < this.height; py += 16) {
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + py);
      ctx.lineTo(screenX + this.width, screenY + py);
      ctx.stroke();
    }

    // Cracks depending on damage
    const hitsTaken = this.maxHp - this.hp;
    if (hitsTaken > 0) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(screenX + 8, screenY + 12);
      ctx.lineTo(screenX + 22, screenY + 36);
      ctx.lineTo(screenX + 12, screenY + 60);
      if (hitsTaken > 1) {
        ctx.moveTo(screenX + 24, screenY + 24);
        ctx.lineTo(screenX + 10, screenY + 48);
        ctx.lineTo(screenX + 26, screenY + 80);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}
