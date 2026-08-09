export class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.vx = 0;
    this.vy = 0;
    this.gravity = 1100;
    this.maxFallSpeed = 700;

    this.grounded = false;
    this.onLeftWall = false;
    this.onRightWall = false;

    this.boxOffsetX = 0;
    this.boxOffsetY = 0;

    this.facing = 1; // 1 = Right, -1 = Left
    this.active = true;
    this.invulnerable = false;
    this.invulnerableTimer = 0;
  }

  getBounds() {
    return {
      x: this.x + this.boxOffsetX,
      y: this.y + this.boxOffsetY,
      width: this.width,
      height: this.height
    };
  }

  update(dt) {
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) {
        this.invulnerable = false;
      }
    }
  }

  draw(ctx, camera) {
    // Base render placeholder
  }
}
