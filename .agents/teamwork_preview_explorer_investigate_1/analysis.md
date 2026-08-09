# Comprehensive Platforming Engine & Mechanics Analysis

## Executive Summary
This report presents an in-depth architectural audit of the Hollow Knight web application codebase (`src/engine/`, `src/entities/`, `src/game/`). The investigation focuses on game loop orchestration, physics/collision processing, hazard handling, tilemap structure, and existing vs missing platforming mechanics. 

While the existing physics framework provides crisp basic movement (coyote time, jump buffering, variable jump height, wall sliding, nail slashing, enemy pogo), **critical gaps exist in platforming mechanics**:
1. `Physics.isTileHazard` and `Physics.isTileAcid` are defined static methods but remain **dead code** (never invoked).
2. Acid tiles (`ACID` in `World.js`) have `solid: false` and no hazard collision logic, allowing the player to fall straight through acid pools without taking damage or standing.
3. Spike pits, crumbling platforms, secret breakable walls, and acid pogo mechanics are **completely missing** from the codebase.

---

## 1. Engine Subsystems Architecture (`src/engine/`)

### 1.1 Game Loop & State Management (`src/engine/Game.js`)
- **Initialization & Dimensions** (`Game.js:17-62`):
  - Canvas resolution set to `960x540` internal canvas dimensions.
  - Core subsystems instantiated: `InputHandler`, `Camera`, `Particles`, `SoundManager`, `World`, `HUD`, `MapUI`, `Shop`, `DialogueUI`, `InventoryUI`.
  - State Machine states: `TITLE`, `GAMEPLAY`, `PAUSED`, `DIALOGUE`, `SHOP`, `BENCH`, `MAP`.
  - Player state loaded via `SaveSystem.load()`. Default spawn position: `(700, 580)` in `dirtmouth_01`.
- **Game Loop Execution** (`Game.js:92-101`):
  - Standard `requestAnimationFrame` loop.
  - Delta time calculation: `dt = Math.min((timestamp - this.lastTime) / 1000, 0.1)`, clamping `dt` to 100ms max step to prevent physics tunneling during lag spikes.
- **Gameplay Update Logic** (`Game.js:196-295`):
  - `Player.update()` driven per-frame, passing active room tilemap.
  - `Camera.follow()` targets player center `(player.x + width/2, player.y + height/2)`.
  - Door transitions (`Game.js:211-216`): checks `Physics.rectIntersect(this.player.getBounds(), door)` and calls `this.transitionRoom()`.
  - Combat & Enemy Collisions (`Game.js:252-283`):
    - Downward attack pogo check: `if (isDownAttack) { this.player.pogoBounce(); this.sound.playPogo(); }` (`Game.js:264-266`). Pogo is currently **only** triggered against active enemy bounding boxes.
    - Enemy contact damage: `if (enemy.active && !enemy.isDead && Physics.rectIntersect(enemy.getBounds(), this.player.getBounds())) { this.player.takeDamage(1, enemy.x, ...); }`.
  - Player Death & Respawn (`Game.js:286-295`): when `masks <= 0`, reloads `lastBenchRoom` and repositions player to `lastBenchX/Y` with full health.

### 1.2 Physics Engine & Collision Detection (`src/engine/Physics.js`)
- **Tile Grid Standard**: `Physics.TILE_SIZE = 32` (`Physics.js:2`).
- **Axis-Aligned Tilemap Collision** (`Physics.js:4-88`):
  - **Gravity Application** (`Physics.js:10-17`): Applies `vy += (entity.gravity || 1100) * dt` capped at `entity.maxFallSpeed || 700` whenever `!entity.grounded && !entity.isDashing && !entity.isWallSliding`.
  - **Horizontal Step & Collision Resolution** (`Physics.js:19-51`):
    - Calculates tile range `[startTileX..endTileX, startTileY..endTileY]`.
    - Checks `tile.solid`.
    - On collision: snaps `entity.x` to tile boundary, sets `entity.onRightWall = true` (if `vx > 0`) or `entity.onLeftWall = true` (if `vx < 0`), and zeroes `entity.vx = 0`.
  - **Vertical Step & Collision Resolution** (`Physics.js:53-87`):
    - Moves `entity.y += entity.vy * dt`, sets `entity.grounded = false`.
    - On downward collision (`vy > 0`): snaps `entity.y = tileRect.y - bounds.height - boxOffsetY`, sets `entity.vy = 0` and `entity.grounded = true`.
    - On upward collision (`vy < 0`): snaps `entity.y = tileRect.y + tileRect.height - boxOffsetY`, sets `entity.vy = 0`.
- **Dead Code Detection**:
  - `Physics.isTileHazard(x, y, tilemap)` (`Physics.js:90-95`)
  - `Physics.isTileAcid(x, y, tilemap)` (`Physics.js:97-102`)
  - Both methods convert coordinates to tile indices and return boolean flags, but **neither is called anywhere in the codebase**.

### 1.3 Camera & Input Systems (`src/engine/Camera.js` & `src/engine/InputHandler.js`)
- **Camera** (`Camera.js`): Linear interpolation (`lerpSpeed = 0.14`), bounds clamping to room size, decay-based screen shake (`shake(intensity, duration)`).
- **InputHandler** (`InputHandler.js`): Action mapping supporting Arrow keys, WASD, Space, Z, X, C, Shift, M, E, Escape. Single-frame `isJustPressed(action)` buffer maintained for jump/dash/attack triggers.

---

## 2. Existing Platforming Mechanics & Data Structures

### 2.1 Player Physics Data Structure (`src/game/Player.js:5-61`)
```javascript
// Dimensions & Hitbox Offset
this.x, this.y;
this.width = 22, this.height = 34;
this.boxOffsetX = 5, this.boxOffsetY = 4;
// Bounds rectangle: { x: x + 5, y: y + 4, width: 22, height: 34 }

// Physics Constants
this.moveSpeed = 210;        // px/s horizontal movement
this.jumpForce = -570;       // px/s initial vertical jump impulse
this.wallSlideSpeed = 90;    // px/s max downward velocity on wall
this.dashSpeed = 520;        // px/s horizontal dash speed
this.dashDuration = 0.22;    // seconds dash duration

// Responsiveness Buffers
this.coyoteTimer = 0.12;     // Grace period after leaving ground
this.jumpBufferTimer = 0.15; // Grace window for jump press before landing

// Ability Flags
this.abilities = { dash: false, shadowDash: false, wallJump: false };
```

### 2.2 Wall Jump & Wall Slide Mechanics (`src/game/Player.js:133-160`)
- Wall slide condition: `onWall = (onLeftWall || onRightWall) && !grounded`. If `onWall && vy > 0 && abilities.wallJump`, sets `isWallSliding = true` and caps fall speed to `wallSlideSpeed = 90`.
- Wall jump execution: Push off wall setting `vy = jumpForce * 0.9` (`-513` px/s), `vx = wallDir * moveSpeed * 1.2` (`±252` px/s), and sets `wallJumpTimer = 0.18` seconds to lock input direction.

### 2.3 Damage & Hazard Response (`src/game/Player.js:268-282`)
- `takeDamage(amount, sourceX, soundManager, particles, camera)`:
  - Invulnerability period: `invulnerableTimer = 1.2` seconds.
  - Knockback impulse: `vx = knockDirection * 240`, `vy = -220`.
  - Visual/Audio feedback: Red sparks, metal hit sound, camera shake (`intensity 8, duration 0.3s`).

---

## 3. Comprehensive Codebase Gaps & Deficiencies

| Feature / Requirement | Status | Current Code Deficiency | Files & Lines |
|---|---|---|---|
| **Acid Pools** | Broken | `ACID` tile defined (`solid: false, acid: true`), but `Physics.checkTileCollision` ignores non-solid tiles. `Physics.isTileAcid` is never called. Player passes through acid safely. | `src/game/World.js:90,249`<br>`src/engine/Physics.js:97-102` |
| **Acid Pogo Jumping** | Missing | Downward attack only checks against enemy bounding boxes (`Game.js:264`). Downward slashes over acid or hazards do nothing. | `src/engine/Game.js:264-266`<br>`src/game/Player.js:220-266` |
| **Spike Pits** | Missing | `Physics.isTileHazard` exists but is dead code. No spike tile definition or spike hazard entity exists in `World.js`. | `src/engine/Physics.js:90-95` |
| **Crumbling Platforms** | Missing | No entity or tile type exists that shakes upon step, crumbles after a delay (e.g. 0.4s), and respawns after a timer (e.g. 3.0s). | N/A |
| **Secret Breakable Walls** | Missing | No `BreakableWall` entity or breakable tile exists. Attacks do not interact with wall tiles, and no breakable secret passages exist to hide Geo/Charms. | N/A |
| **Vertical Wall Shafts** | Minimal | Basic wall jump exists in `Player.js`, but no dedicated wall-shaft level objects, crumbling wall pegs, or specialized wall cling physics exist. | `src/game/Player.js:133-160` |

---

## 4. Concrete Recommendations for Redesign (Milestone 3)

### 4.1 Crumbling Platforms Implementation (`src/entities/CrumblingPlatform.js`)
Create a dedicated entity class extending `Entity`:
```javascript
export class CrumblingPlatform extends Entity {
  constructor(x, y, width = 64, height = 16) {
    super(x, y, width, height);
    this.state = 'IDLE'; // 'IDLE', 'SHAKING', 'CRUMBLED', 'RESPAWNING'
    this.shakeTimer = 0;
    this.maxShakeTime = 0.4;
    this.respawnTimer = 0;
    this.maxRespawnTime = 3.0;
    this.solid = true;
  }

  update(dt, player, particles, soundManager) {
    if (this.state === 'SHAKING') {
      this.shakeTimer -= dt;
      particles.spawnDust(this.x + Math.random() * this.width, this.y, 1);
      if (this.shakeTimer <= 0) {
        this.state = 'CRUMBLED';
        this.solid = false;
        this.respawnTimer = this.maxRespawnTime;
        soundManager.playHit();
        particles.spawnHitSparks(this.x + this.width / 2, this.y, 8, '#aaaaaa');
      }
    } else if (this.state === 'CRUMBLED') {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.state = 'IDLE';
        this.solid = true;
      }
    }
  }

  onStepOn() {
    if (this.state === 'IDLE') {
      this.state = 'SHAKING';
      this.shakeTimer = this.maxShakeTime;
    }
  }
}
```

### 4.2 Spike Pits & Safe Checkpoint System
1. **Tile & Entity Support**: Define `SPIKE` tiles in `World.js`:
   `const SPIKE = { solid: true, hazard: true, type: 'spike', color: '#aa2222' };`
2. **Safe Ground Checkpoint System**:
   In `Player.js`, track `lastSafeX` and `lastSafeY`. Update these coordinates whenever `player.grounded && !onCrumblingPlatform && !onHazardTile`.
3. **Hazard Intersection & Respawn**:
   In `Physics.checkTileCollision()` or `Player.update()`, check if player bounds intersect any hazard tile/entity:
   - Call `player.takeDamage(1, player.x, soundManager, particles, camera)`.
   - Reposition player to `(player.lastSafeX, player.lastSafeY)`.
   - Zero velocities (`vx = 0, vy = 0`) and trigger camera shake.

### 4.3 Acid Pogo & Acid Hazard System
1. **Acid Surface Detection**:
   In `Physics.js` / `Player.js`, check if player bounds overlap an `ACID` tile.
2. **Nail Down-Slash Pogo Interaction**:
   In `Player.performAttack()` / `Game.js`, check if `attackDirection === 'down'` and `attackHitbox` intersects the surface of an `ACID` tile or `SPIKE` hazard.
   - If collision detected: call `player.pogoBounce()` (`vy = -380`), play `soundManager.playPogo()`, and spawn cyan/green splash particles (`particles.spawnShockwave(hitX, hitY, 50, '#24a058')`).
3. **Unmitigated Acid Fall**:
   If player enters acid without pogoing: apply hazard damage (`takeDamage(1)`), play splash sound, and reset player to `lastSafeX/Y`.

### 4.4 Secret Breakable Walls (`src/entities/BreakableWall.js`)
Create a breakable wall entity:
```javascript
export class BreakableWall extends Entity {
  constructor(x, y, width = 32, height = 96, maxHits = 3, secretReward = null) {
    super(x, y, width, height);
    this.maxHits = maxHits;
    this.currentHits = 0;
    this.secretReward = secretReward; // e.g. { type: 'GEO_CACHE', count: 5 } or Charm entity
    this.solid = true;
  }

  takeDamage(amount, soundManager, particles, room) {
    if (!this.active) return;
    this.currentHits += amount;
    soundManager.playHit();
    particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 10, '#888888');

    if (this.currentHits >= this.maxHits) {
      this.active = false;
      this.solid = false;
      particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 60, '#aaaaaa');
      if (this.secretReward) {
        this.spawnReward(room);
      }
    }
  }
}
```

### 4.5 Wall Climbing Shafts & Wall Cling Refinement
- Incorporate vertical tile shafts with alternating wall slide/jump surfaces.
- Add wall slide dust particles continuously while sliding down walls.
- Provide wall cling friction option when pressing toward the wall.
