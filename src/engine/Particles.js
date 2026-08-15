export class Particles {
  constructor() {
    this.particles = [];
  }

  add(p) {
    // Keep particle array size bounded to prevent any accumulation
    if (this.particles.length > 180) {
      this.particles.splice(0, 40);
    }
    this.particles.push({
      x: p.x,
      y: p.y,
      vx: p.vx || 0,
      vy: p.vy || 0,
      size: p.size || 3,
      color: p.color || '#ffffff',
      alpha: p.alpha ?? 1,
      life: p.life || 0.5,
      maxLife: p.maxLife || p.life || 0.5,
      shape: p.shape || 'circle',
      angle: p.angle || 0,
      scaleX: p.scaleX || 1,
      scaleY: p.scaleY || 1,
      gravity: p.gravity || 0,
      friction: p.friction || 0.98,
      fade: p.fade ?? true
    });
  }

  spawnSlash(x, y, direction, attackDirection, isLongnail = false) {
    const isUp = attackDirection === 'up';
    const isDown = attackDirection === 'down';
    this.spawnSlashArc(x, y, direction, isUp, isDown, isLongnail);
  }

  spawnSlashArc(x, y, direction, isUp, isDown, isLongnail = false) {
    // Remove any previous lingering slash arcs so slashes never stack or persist
    this.particles = this.particles.filter(p => p.shape !== 'slash');

    const scale = isLongnail ? 1.5 : 1.0;
    const baseSize = 85 * scale; // Sleek razor-thin swing size

    this.add({
      x, y,
      vx: direction * 40,
      vy: isUp ? -60 : (isDown ? 60 : 0),
      size: baseSize,
      color: '#eaf4ff',
      life: 0.10,
      maxLife: 0.10,
      shape: 'slash',
      angle: isUp ? -Math.PI / 2 : (isDown ? Math.PI / 2 : (direction < 0 ? Math.PI : 0)),
      scaleX: scale,
      scaleY: scale,
      fade: true
    });

    // Add crisp transient sparks that dissipate rapidly (0.08s)
    for (let i = 0; i < 5; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.9 + (direction > 0 ? 0 : Math.PI);
      const speed = Math.random() * 200 + 80;
      this.add({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 2 + 1,
        color: i % 2 === 0 ? '#ffffff' : '#88d6ff',
        life: Math.random() * 0.08 + 0.04,
        maxLife: 0.12,
        gravity: 80,
        shape: 'spark',
        fade: true
      });
    }
  }

  spawnHitSparks(x, y, count = 8, color = '#ffffff') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 180 + 40;
      this.add({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1,
        color: color,
        life: Math.random() * 0.25 + 0.1,
        gravity: 200,
        shape: 'spark'
      });
    }
  }

  spawnSoulGain(x, y) {
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5);
      const speed = Math.random() * 80 + 40;
      this.add({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color: '#b0e2ff',
        life: 0.4,
        shape: 'circle',
        gravity: -100
      });
    }
  }

  spawnDust(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 10,
        y: y,
        vx: (Math.random() - 0.5) * 40,
        vy: -Math.random() * 25 - 5,
        size: Math.random() * 4 + 2,
        color: 'rgba(180, 200, 220, 0.4)',
        life: Math.random() * 0.3 + 0.2,
        friction: 0.92,
        shape: 'circle'
      });
    }
  }

  spawnShockwave(x, y, maxRadius = 50, color = 'rgba(255,255,255,0.7)') {
    this.add({
      x, y,
      vx: 0, vy: 0,
      size: 4,
      maxRadius: maxRadius,
      color: color,
      life: 0.35,
      shape: 'ring'
    });
  }

  spawnAmbientSpores(bounds, count = 2) {
    if (!bounds) return;
    for (let i = 0; i < count; i++) {
      this.add({
        x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
        y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
        vx: (Math.random() - 0.5) * 15,
        vy: -Math.random() * 10 - 5,
        size: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? 'rgba(140, 230, 180, 0.4)' : 'rgba(100, 180, 255, 0.3)',
        life: Math.random() * 3 + 2,
        shape: 'spore'
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= p.friction;
      p.vy *= p.friction;

      if (p.fade) {
        p.alpha = Math.max(0, p.life / p.maxLife);
      }
    }
  }

  clear() {
    this.particles = [];
  }

  draw(ctx, camera) {
    const view = camera.getView();

    ctx.save();
    for (const p of this.particles) {
      if (
        p.x < view.x - 100 || p.x > view.x + view.width + 100 ||
        p.y < view.y - 100 || p.y > view.y + view.height + 100
      ) {
        continue;
      }

      const screenX = p.x - view.x;
      const screenY = p.y - view.y;

      ctx.globalAlpha = p.alpha;

      if (p.shape === 'circle' || p.shape === 'spore') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX - p.vx * 0.04, screenY - p.vy * 0.04);
        ctx.stroke();
      } else if (p.shape === 'slash') {
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(p.angle);
        ctx.scale(p.scaleX, p.scaleY);

        // Sleek, Thin & Long Razor Silver Whip Slash Arc
        ctx.fillStyle = 'rgba(136, 214, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.2, p.size * 0.14, 0, -Math.PI * 0.7, Math.PI * 0.7);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.08, 0, -Math.PI * 0.65, Math.PI * 0.65);
        ctx.fill();

        ctx.restore();
      } else if (p.shape === 'ring') {
        const progress = 1 - (p.life / p.maxLife);
        const radius = p.maxRadius * progress;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 4 * (1 - progress));
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
