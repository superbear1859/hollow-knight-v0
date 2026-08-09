# Codebase Technical Analysis: Entities, UI, Abilities, Enemies, and Bench Mechanics

## Executive Summary
This document presents an in-depth exploration and architectural audit of `src/entities/`, `src/ui/`, `src/game/`, and `src/engine/` within the Hollow Knight web application repository. It details how player states and abilities are tracked and activated, evaluates enemy AI behaviors and spawn density, analyzes bench resting and respawn mechanisms, inspects collectible economy structures, and identifies architectural gaps—specifically missing breakable secret walls and missing enemy bench respawn triggers—with concrete overhaul recommendations.

---

## 1. Directory & Class Architecture

### `src/entities/`
- **`Entity.js` (`src/entities/Entity.js`)**: Base class for all physical game entities.
  - **Properties**: `x`, `y`, `width`, `height`, `vx`, `vy`, `gravity = 1100`, `maxFallSpeed = 700`, `grounded`, `onLeftWall`, `onRightWall`, `boxOffsetX`, `boxOffsetY`, `facing` (`1` right, `-1` left), `active`, `invulnerable`, `invulnerableTimer`.
  - **Methods**: `getBounds()`, `update(dt)`, `draw(ctx, camera)`.

- **`Enemy.js` (`src/entities/Enemy.js`)**: Extends `Entity`. Base class for all hostile creatures and bosses.
  - **Properties**: `hp`, `maxHp`, `geoReward`, `hitFlashTimer`, `knockbackVx`, `knockbackVy`, `isDead`.
  - **Methods**: `takeDamage(damage, sourceX, soundManager, particles, player)`:
    - Decrements HP, sets hit flash timer (`0.15s`), triggers invulnerability (`0.2s`), applies knockback (`vx = ±180`, `vy = -100`), grants player `+11 Soul` (`player.addSoul(11)`), plays hit sound, and spawns hit sparks.
    - If `hp <= 0`: sets `isDead = true`, `active = false`, plays pogo SFX, spawns yellow reward sparks, returns `true`.

- **`Crawlid.js` (`src/entities/Crawlid.js`)**: Ground patrol crawler.
  - **Stats**: 28x20, `hp: 2`, `geoReward: 3`, `speed: 40`.
  - **AI**: Simple horizontal movement. Reverses `facing` upon colliding with wall tiles (`onLeftWall || onRightWall`).

- **`Vengefly.js` (`src/entities/Vengefly.js`)**: Flying aggressive insect.
  - **Stats**: 26x26, `hp: 3`, `geoReward: 5`, `gravity: 0`, `speed: 110`, `aggroRange: 220`.
  - **AI**: Hovers sinusoidally near origin (`startY + Math.sin(hoverTimer) * 15`). When player distance `< aggroRange` (220px), calculates 2D vector towards player center and chases at 110px/s.

- **`HuskSentinel.js` (`src/entities/HuskSentinel.js`)**: Heavy armored knight guard.
  - **Stats**: 30x42, `hp: 6`, `geoReward: 12`, `speed: 60`, `attackCooldown: 2.0s`.
  - **AI**: Aggroes when player is within 180px. Advances toward player while `dist > 50`. When `dist <= 50` and `attackTimer <= 0`, halts movement and performs forward spear thrust (`isAttacking = true` for 400ms).

- **`FalseKnight.js` (`src/entities/FalseKnight.js`)**: Boss entity in `boss_false_knight`.
  - **Stats**: 70x90, `hp: 45`, `geoReward: 100`, `speed: 80`, `isBoss: true`.
  - **AI**: Finite State Machine (`IDLE`, `MOVE`, `SLAM`, `RAGE`). Triggers ground slam (`performSlam`) spawning radial shockwave particles and camera shake (`shake(12, 0.4)`).

- **`Hornet.js` (`src/entities/Hornet.js`)**: Boss entity in `boss_hornet`.
  - **Stats**: 32x48, `hp: 50`, `geoReward: 150`, `speed: 170`, `isBoss: true`.
  - **AI**: FSM (`IDLE`, `LUNGE`, `NEEDLE_THROW`, `SPHERE`). High-speed airborne lunge (`vx = facing * 340`, `vy = -180`), needle throw projectile, and 8-directional silk thread sphere attack.

---

### `src/game/`
- **`Player.js` (`src/game/Player.js`)**: Core player character controller extending `Entity`.
  - **Dimensions & Stats**: `22x34`, `maxMasks: 5`, `masks: 5`, `soul: 100`, `maxSoul: 100`, `geo: 0`.
  - **Movement Tuning**: `moveSpeed: 210`, `jumpForce: -570`, `wallSlideSpeed: 90`, coyote time buffer (`0.12s`), jump input buffer (`0.15s`).
  - **Abilities State Object**:
    ```javascript
    this.abilities = {
      dash: false,
      shadowDash: false,
      wallJump: false
    };
    ```

- **`Bench.js` (`src/game/Bench.js`)**: Checkpoint bench entity.
  - **Proximity check**: `isPlayerNear(player)` checks horizontal distance `< 40px` and vertical distance `< 30px`.
  - **Rest function**: `rest(player, soundManager, particles, saveSystem, game)`:
    - Sets `player.masks = player.maxMasks`.
    - Sets `player.soul = player.maxSoul`.
    - Plays bell sound and spawns light cyan shockwave.
    - Serializes game state via `SaveSystem.save(...)`.

- **`Collectible.js` (`src/game/Collectible.js`)**:
  - `GeoCoin`: Physics-driven currency drop (`10x10`). Spawns with random velocity (`vx = ±70, vy = -60..-240`), gravity (`900`), and magnet radius (`130px`). When player is within 130px, accelerates towards player. Picked up at `< 22px` distance (`player.geo += value`).
  - `AbilityUnlock`: Floating diamond artifact (`24x36`). Intersects player -> sets `player.abilities[abilityKey] = true`, plays sound/particles, deactivates.

- **`Charms.js` (`src/game/Charms.js`)**: Defines 5 charms (`WAYWARD_COMPASS`, `LONGNAIL`, `QUICK_FOCUS`, `SOUL_CATCHER`, `DASHMASTER`).
- **`Shop.js` (`src/game/Shop.js`)**: Sly's Shop interface in Dirtmouth for purchasing charms with Geo.
- **`SaveSystem.js` (`src/game/SaveSystem.js`)**: Standardizes `localStorage` save data (`hollow_knight_v0_save`).
- **`World.js` (`src/game/World.js`)**: Instantiates 12 rooms across 6 biomes, tile maps, enemy positions, benches, doors, and collectibles.

---

### `src/ui/`
- **`HUD.js` (`src/ui/HUD.js`)**: Render overlay for player status and boss health.
  - **Soul Orb**: Radial white/cyan liquid gauge (`player.soul / player.maxSoul`).
  - **Mask Counter**: Glowing bone masks with horn artwork, broken mask states, and relighting flash animation when healed.
  - **Interactive Button**: `[❤ Heal (H)]` button responding to mouse clicks.
  - **Geo Counter**: Top-right text displaying `❖ player.geo`.
  - **Boss Bar**: Bottom-center red bar displaying active boss name and HP ratio.

- **`InventoryUI.js` (`src/ui/InventoryUI.js`)**: Menu for viewing/equipping Charms & Abilities.
  - Displays notch usage (`currentCost / notchCapacity`).
  - **Constraint**: Charm equipping/unequipping is strictly locked unless `atBench` state is active!

- **`MapUI.js` (`src/ui/MapUI.js`)**: Fullscreen room graph map rendering 12 node coordinates and connections. Shows player location (`🧭 You`) when `WAYWARD_COMPASS` is equipped.
- **`DialogueUI.js` (`src/ui/DialogueUI.js`)**: Animated typewriter dialogue box for NPC interactions.

---

## 2. Ability Tracking & Activation System

| Ability | Internal Key | Pedestal Room Location | Activation Inputs & Physics Dynamics | Current Limitations |
|---------|--------------|------------------------|--------------------------------------|---------------------|
| **Mothwing Cloak (Dash)** | `abilities.dash` | `greenpath_02` (x:1800, y:520) | Key `C`/`L`/`Shift`. Sets `isDashing = true`, duration `0.22s`, `vx = facing * 520`, `vy = 0`. Cooldown `0.6s` (`0.3s` with `DASHMASTER`). | Horizontal movement only; no air dash limit count reset check per ground touch. |
| **Mantis Claw (Wall Jump)** | `abilities.wallJump` | `crystal_peak` (x:2800, y:580) | Contact with wall (`onLeftWall` / `onRightWall`) while falling (`vy > 0`). Clamps `vy` to `wallSlideSpeed` (90). Pressing `Jump` launches player with `vy = -513`, `vx = wallDir * 252`, `wallJumpTimer = 0.18s`. | Does not yet feature dedicated wall slide particle trails or pogo mechanics on wall surfaces. |
| **Shade Cloak (Shadow Dash)** | `abilities.shadowDash` | `deepnest` (x:2200, y:390) | Automatically wraps `dash` when unlocked. Grants temporary invulnerability (`invulnerableTimer = 0.22s`) and changes cloak color to dark void `#101525`. | Does NOT pass through dark void gates or bypass enemy physical collision boxes. |

---

## 3. Enemy Types, AI Behavior, and Geo Economy Audit

### Current Enemy Population (17 Total Entities Across 12 Rooms):
1. **`kings_pass`**: 2 Crawlids, 1 Vengefly
2. **`dirtmouth_01`**: 0 enemies (Town sanctuary)
3. **`crossroads_01`**: 1 Crawlid, 1 Vengefly, 1 HuskSentinel
4. **`crossroads_02`**: 1 Crawlid, 1 HuskSentinel, 1 Vengefly
5. **`boss_false_knight`**: 1 FalseKnight (Boss)
6. **`crystal_peak`**: 1 Vengefly, 1 Crawlid
7. **`greenpath_01`**: 1 Crawlid, 1 Vengefly
8. **`greenpath_02`**: 1 HuskSentinel, 1 Vengefly
9. **`boss_hornet`**: 1 Hornet (Boss)
10. **`fog_canyon`**: 1 Vengefly, 1 Crawlid
11. **`city_of_tears`**: 2 HuskSentinels
12. **`deepnest`**: 2 Crawlids

### Geo Dropping Mechanism:
When an enemy dies in `Game.js`:
```javascript
for (let g = 0; g < enemy.geoReward; g++) {
  room.collectibles.push(new GeoCoin(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 1));
}
```
- Spawns `geoReward` individual `GeoCoin` objects (e.g. 150 coins for Hornet).
- **Performance Risk**: Spawning 100-150 separate physical objects with gravity and magnet physics creates frame rate drops on boss defeat.

---

## 4. Critical Deficiencies Identified

### A. Bench Resting Enemy Respawn Defect
- **Defect**: In `Bench.js`, `bench.rest()` restores `masks` and `soul` and saves state, but **does not respawn defeated enemies**.
- **Impact**: Once a player kills enemies in a room, those enemies set `isDead = true; active = false;`. Resting at a bench or changing rooms does NOT restore them, completely disabling enemy farming and breaking the Geo economy.

### B. Missing Breakable Secret Walls
- **Defect**: No breakable wall entities or breakable tiles exist in `src/`.
- **Impact**: Requirement R2 (hidden breakable secret walls containing Geo caches or Charms) is unfulfilled.

### C. Shade Cloak Void Gate Interaction Defect
- **Defect**: `abilities.shadowDash` toggles `invulnerable = true` during dash, but enemy collision detection in `Game.js` (`Physics.rectIntersect(enemy.getBounds(), player.getBounds())`) still executes player damage unless `invulnerable` is true. Dark void gates are missing from room geometry.

---

## 5. Architectural Overhaul Recommendations

1. **Bench Respawn System**:
   - Implement `world.respawnEnemies()` called during `bench.rest()` and player death respawn.
   - Store room initial enemy template data (`enemySpawns` list per room) and re-instantiate or reset enemies on bench rest.

2. **Breakable Secret Wall Architecture**:
   - Create `src/entities/SecretWall.js` extending `Entity` (or custom tile collision type `tile.breakable`).
   - Give walls `hp: 3`, hit flash, masonry crumbling particle effects, and secret contents (`GEO_CACHE` or `CHARM`).
   - Register attack collision in `Game.js` (`player.attackHitbox` vs `secretWall.getBounds()`).

3. **Geo Economy & Coin Bundling**:
   - Introduce multi-denomination Geo coins (`GeoCoin(x, y, value)` with values 1, 5, 20) to cap coin count at 5-10 coins per enemy/boss death.
   - Increase enemy density to 3-6 enemies per room across all 12 biomes.

4. **Void Gate & Shade Cloak Interaction**:
   - Implement `VoidGate` entity in `Deepnest` and `Fog Canyon`.
   - Allow player to pass through `VoidGate` only when `player.isDashing && player.abilities.shadowDash` is active.
