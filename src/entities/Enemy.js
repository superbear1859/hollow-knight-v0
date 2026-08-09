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

  takeDamage(damage, sourceX, soundManager, particles, player) {
    if (this.invulnerable || this.isDead) return false;

    this.hp -= damage;
    this.hitFlashTimer = 0.15;
    this.invulnerable = true;
    this.invulnerableTimer = 0.2;

    const knockDir = sourceX < this.x ? 1 : -1;
    this.vx = knockDir * 180;
    this.vy = -100;

    soundManager.playHit();
    particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 8, '#ffffff');

    if (player) {
      player.addSoul(11);
    }

    if (this.hp <= 0) {
      this.isDead = true;
      this.active = false;
      soundManager.playPogo();
      particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 16, '#ffcf40');
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
