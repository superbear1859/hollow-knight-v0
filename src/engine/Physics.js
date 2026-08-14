export class Physics {
  static TILE_SIZE = 32;

  static checkTileCollision(entity, tilemap, dt) {
    if (!tilemap || !entity) return;

    const boxOffsetX = entity.boxOffsetX || 0;
    const boxOffsetY = entity.boxOffsetY || 0;

    // Apply gravity
    if (!entity.grounded && !entity.isDashing && !entity.isWallSliding) {
      entity.vy += (entity.gravity || 1100) * dt;
      const maxFallSpeed = entity.maxFallSpeed || 700;
      if (entity.vy > maxFallSpeed) {
        entity.vy = maxFallSpeed;
      }
    }

    // Helper to collect solid rects from tilemap & room solid entities
    const getSolidRectsInBounds = (bounds) => {
      const rects = [];

      const startTileX = Math.floor(bounds.x / this.TILE_SIZE);
      const endTileX = Math.floor((bounds.x + bounds.width) / this.TILE_SIZE);
      const startTileY = Math.floor(bounds.y / this.TILE_SIZE);
      const endTileY = Math.floor((bounds.y + bounds.height) / this.TILE_SIZE);

      for (let ty = startTileY; ty <= endTileY; ty++) {
        for (let tx = startTileX; tx <= endTileX; tx++) {
          const tile = tilemap.getTile ? tilemap.getTile(tx, ty) : null;
          if (tile && tile.solid) {
            rects.push({
              x: tx * this.TILE_SIZE,
              y: ty * this.TILE_SIZE,
              width: this.TILE_SIZE,
              height: this.TILE_SIZE,
              tile: tile
            });
          }
        }
      }

      // Helper to check room entities
      const checkEntities = (list) => {
        if (!list) return;
        for (const obj of list) {
          if (!obj || !obj.active || !obj.solid) continue;
          if (typeof obj.isPassableBy === 'function' && obj.isPassableBy(entity)) {
            continue; // Player shadow dashing through VoidGate
          }
          const objBounds = obj.getBounds ? obj.getBounds() : { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
          if (this.rectIntersect(bounds, objBounds)) {
            rects.push({
              x: objBounds.x,
              y: objBounds.y,
              width: objBounds.width,
              height: objBounds.height,
              entity: obj
            });
          }
        }
      };

      if (tilemap.platforms) checkEntities(tilemap.platforms);
      if (tilemap.walls) checkEntities(tilemap.walls);
      if (tilemap.voidGates) checkEntities(tilemap.voidGates);
      if (tilemap.entities) checkEntities(tilemap.entities);

      // Block doors/passages as solid physical barriers during active boss fight
      if (tilemap.doors && tilemap.enemies && tilemap.enemies.some(e => e.active && e.isBoss && !e.isDead)) {
        for (const door of tilemap.doors) {
          if (this.rectIntersect(bounds, door)) {
            rects.push({
              x: door.x,
              y: door.y,
              width: door.width,
              height: door.height
            });
          }
        }
      }

      return rects;
    };

    // 1. Horizontal Movement (Inset vertically so ground/ceiling tiles are not misidentified as side walls)
    entity.x += entity.vx * dt;
    let bounds = entity.getBounds ? entity.getBounds() : { x: entity.x + boxOffsetX, y: entity.y + boxOffsetY, width: entity.width, height: entity.height };

    const horizBounds = {
      x: bounds.x,
      y: bounds.y + 1,
      width: bounds.width,
      height: Math.max(1, bounds.height - 6)
    };

    let solidRects = getSolidRectsInBounds(horizBounds);
    for (const rect of solidRects) {
      if (this.rectIntersect(horizBounds, rect)) {
        if (entity.vx > 0) {
          entity.x = rect.x - bounds.width - boxOffsetX;
          entity.onRightWall = true;
        } else if (entity.vx < 0) {
          entity.x = rect.x + rect.width - boxOffsetX;
          entity.onLeftWall = true;
        }
        entity.vx = 0;
        bounds = entity.getBounds ? entity.getBounds() : { x: entity.x + boxOffsetX, y: entity.y + boxOffsetY, width: entity.width, height: entity.height };
        break;
      }
    }

    // 2. Vertical Movement
    entity.y += entity.vy * dt;
    bounds = entity.getBounds ? entity.getBounds() : { x: entity.x + boxOffsetX, y: entity.y + boxOffsetY, width: entity.width, height: entity.height };

    entity.grounded = false;
    solidRects = getSolidRectsInBounds(bounds);

    for (const rect of solidRects) {
      const isStandingOnTop = entity.vy >= 0 && Math.abs((bounds.y + bounds.height) - rect.y) <= 1.0 && bounds.x < rect.x + rect.width && bounds.x + bounds.width > rect.x;
      if (this.rectIntersect(bounds, rect) || isStandingOnTop) {
        if (entity.vy >= 0) {
          entity.y = rect.y - bounds.height - boxOffsetY;
          entity.vy = 0;
          entity.grounded = true;
          if (rect.entity && typeof rect.entity.onStepOn === 'function') {
            rect.entity.onStepOn();
          }
        } else if (entity.vy < 0) {
          entity.y = rect.y + rect.height - boxOffsetY;
          entity.vy = 0;
        }
        bounds = entity.getBounds ? entity.getBounds() : { x: entity.x + boxOffsetX, y: entity.y + boxOffsetY, width: entity.width, height: entity.height };
      }
    }
  }

  static isTileHazard(x, y, tilemap) {
    if (!tilemap) return false;
    const tx = Math.floor(x / this.TILE_SIZE);
    const ty = Math.floor(y / this.TILE_SIZE);
    const tile = tilemap.getTile ? tilemap.getTile(tx, ty) : null;
    return tile ? (tile.hazard || tile.type === 'spike' || false) : false;
  }

  static isTileAcid(x, y, tilemap) {
    if (!tilemap) return false;
    const tx = Math.floor(x / this.TILE_SIZE);
    const ty = Math.floor(y / this.TILE_SIZE);
    const tile = tilemap.getTile ? tilemap.getTile(tx, ty) : null;
    return tile ? (tile.acid || tile.type === 'acid' || false) : false;
  }

  static checkBoundsHazard(bounds, tilemap) {
    if (!tilemap || !bounds) return false;
    const startTileX = Math.floor(bounds.x / this.TILE_SIZE);
    const endTileX = Math.floor((bounds.x + bounds.width) / this.TILE_SIZE);
    const startTileY = Math.floor(bounds.y / this.TILE_SIZE);
    const endTileY = Math.floor((bounds.y + bounds.height) / this.TILE_SIZE);

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const tile = tilemap.getTile ? tilemap.getTile(tx, ty) : null;
        if (tile && (tile.hazard || tile.type === 'spike')) {
          return true;
        }
      }
    }
    return false;
  }

  static checkBoundsAcid(bounds, tilemap) {
    if (!tilemap || !bounds) return false;
    const startTileX = Math.floor(bounds.x / this.TILE_SIZE);
    const endTileX = Math.floor((bounds.x + bounds.width) / this.TILE_SIZE);
    const startTileY = Math.floor(bounds.y / this.TILE_SIZE);
    const endTileY = Math.floor((bounds.y + bounds.height) / this.TILE_SIZE);

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const tile = tilemap.getTile ? tilemap.getTile(tx, ty) : null;
        if (tile && (tile.acid || tile.type === 'acid')) {
          return true;
        }
      }
    }
    return false;
  }

  static rectIntersect(r1, r2) {
    if (!r1 || !r2) return false;
    return !(
      r2.x >= r1.x + r1.width ||
      r2.x + r2.width <= r1.x ||
      r2.y >= r1.y + r1.height ||
      r2.y + r2.height <= r1.y
    );
  }
}
