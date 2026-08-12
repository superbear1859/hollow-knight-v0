export class Camera {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    this.bounds = null; // { minX, minY, maxX, maxY }
    this.lerpSpeed = 0.14;
  }

  setBounds(minX, minY, maxX, maxY) {
    this.bounds = { minX, minY, maxX, maxY };
  }

  shake(intensity = 3, duration = 0.15) {
    const clampedIntensity = Math.min(4, intensity * 0.4);
    const clampedDuration = Math.min(0.18, duration * 0.5);
    this.shakeIntensity = Math.max(this.shakeIntensity, clampedIntensity);
    this.shakeDuration = Math.max(this.shakeDuration, clampedDuration);
  }

  snapTo(targetX, targetY) {
    this.targetX = targetX - this.width / 2;
    this.targetY = targetY - this.height / 2;

    if (this.bounds) {
      const roomW = this.bounds.maxX - this.bounds.minX;
      const roomH = this.bounds.maxY - this.bounds.minY;

      if (roomW <= this.width) {
        this.targetX = this.bounds.minX + (roomW - this.width) / 2;
      } else {
        this.targetX = Math.max(this.bounds.minX, Math.min(this.targetX, this.bounds.maxX - this.width));
      }

      if (roomH <= this.height) {
        this.targetY = this.bounds.minY + (roomH - this.height) / 2;
      } else {
        this.targetY = Math.max(this.bounds.minY, Math.min(this.targetY, this.bounds.maxY - this.height));
      }
    }

    this.x = this.targetX;
    this.y = this.targetY;
  }

  follow(targetX, targetY, dt) {
    this.targetX = targetX - this.width / 2;
    this.targetY = targetY - this.height / 2;

    if (this.bounds) {
      const roomW = this.bounds.maxX - this.bounds.minX;
      const roomH = this.bounds.maxY - this.bounds.minY;

      if (roomW <= this.width) {
        this.targetX = this.bounds.minX + (roomW - this.width) / 2;
      } else {
        this.targetX = Math.max(this.bounds.minX, Math.min(this.targetX, this.bounds.maxX - this.width));
      }

      if (roomH <= this.height) {
        this.targetY = this.bounds.minY + (roomH - this.height) / 2;
      } else {
        this.targetY = Math.max(this.bounds.minY, Math.min(this.targetY, this.bounds.maxY - this.height));
      }
    }

    this.x += (this.targetX - this.x) * this.lerpSpeed;
    this.y += (this.targetY - this.y) * this.lerpSpeed;

    // Smooth exponentially decaying screen shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      this.shakeIntensity *= 0.85; // Damping decay
      this.shakeOffsetX = (Math.random() - 0.5) * 1.2 * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() - 0.5) * 1.2 * this.shakeIntensity;
      if (this.shakeDuration <= 0 || this.shakeIntensity < 0.2) {
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  getView() {
    return {
      x: Math.round(this.x + this.shakeOffsetX),
      y: Math.round(this.y + this.shakeOffsetY),
      width: this.width,
      height: this.height
    };
  }
}
