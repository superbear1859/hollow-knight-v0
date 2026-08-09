import { Entity } from './Entity.js';
import { Physics } from '../engine/Physics.js';

export class SpellProjectile extends Entity {
  constructor(x, y, facing) {
    super(x, y, 44, 28);
    this.facing = facing;
    this.vx = facing * 680;
    this.vy = 0;
    this.damage = 3;
    this.life = 1.2;
    this.active = true;
    this.hitEnemies = new Set();
  }

  update(dt, room, soundManager, particles) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    this.x += this.vx * dt;

    if (particles && Math.random() < 0.6) {
      particles.add({
        x: this.x + Math.random() * this.width,
        y: this.y + Math.random() * this.height,
        vx: -this.facing * (Math.random() * 80 + 40),
        vy: (Math.random() - 0.5) * 60,
        size: Math.random() * 6 + 3,
        color: '#e0f4ff',
        life: 0.3,
        shape: 'spore',
        fade: true
      });
    }

    // Check hit vs Room Enemies safely
    if (room && room.enemies) {
      for (const enemy of room.enemies) {
        if (enemy && enemy.active && !enemy.isDead && !this.hitEnemies.has(enemy)) {
          if (Physics.rectIntersect(this.getBounds(), enemy.getBounds())) {
            this.hitEnemies.add(enemy);
            enemy.takeDamage(this.damage, this.x, soundManager, particles);
            if (particles && particles.spawnShockwave) {
              particles.spawnShockwave(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 50, '#88d6ff');
            }
          }
        }
      }
    }
  }

  draw(ctx, camera) {
    if (!this.active) return;
    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();
    // Surging White / Cyan Soul Blast Core
    const grad = ctx.createLinearGradient(screenX, screenY, screenX + this.width, screenY);
    if (this.facing > 0) {
      grad.addColorStop(0, 'rgba(100, 200, 255, 0.2)');
      grad.addColorStop(0.7, 'rgba(220, 245, 255, 0.9)');
      grad.addColorStop(1, '#ffffff');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, 'rgba(220, 245, 255, 0.9)');
      grad.addColorStop(1, 'rgba(100, 200, 255, 0.2)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(screenX + this.width / 2, screenY + this.height / 2, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outer Soul Aura Glow
    ctx.strokeStyle = '#88d6ff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }
}
