import { Entity } from './Entity.js';

export class Enemy extends Entity {
  constructor(x, y, width, height, hp = 3, geoReward = 4) {
    super(x, y, width, height);
    this.hp = hp;
    this.maxHp = hp;
    this.geoReward = geoReward;

    this.hitFlashTimer = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.isDead = false;
  }

  getGeoReward() {
    if (typeof this.geoReward === 'object' && this.geoReward !== null) {
      const min = this.geoReward.min || 1;
      const max = this.geoReward.max || min;
      return Math.floor(min + Math.random() * (max - min + 1));
    }
    return typeof this.geoReward === 'number' ? this.geoReward : 4;
  }

  takeDamage(damage, sourceX, soundManager, particles, player) {
    if (this.invulnerable || this.isDead) return false;

    this.hp -= damage;
    this.hitFlashTimer = 0.15;
    this.invulnerable = true;
    this.invulnerableTimer = 0.2;

    const knockDir = sourceX < this.x ? 1 : -1;
    this.vx = knockDir * 180;
    this.vy = -100;

    if (soundManager && soundManager.playHit) soundManager.playHit();
    if (particles && particles.spawnHitSparks) {
      particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 8, '#ffffff');
    }

    if (player) {
      player.addSoul(1);
    }

    if (this.hp <= 0) {
      this.isDead = true;
      this.active = false;
      if (soundManager && soundManager.playPogo) soundManager.playPogo();
      if (particles && particles.spawnHitSparks) {
        particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 16, '#ffcf40');
      }
      return true; // Enemy defeated
    }

    return false;
  }

  update(dt) {
    super.update(dt);
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }
  }
}
