# Handoff Report: Core Engine & Platforming Mechanics Investigation

## 1. Observation

Direct observations from codebase inspection across `src/engine/`, `src/entities/`, and `src/game/`:

- **Game Loop Step Limit**: In `src/engine/Game.js:93`, `const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);` caps delta time to 100ms.
- **Door Transition Logic**: In `src/engine/Game.js:211-216`, door checks use `Physics.rectIntersect(this.player.getBounds(), door)`.
- **Pogo Jump Trigger Limit**: In `src/engine/Game.js:264-266`:
  ```javascript
  if (isDownAttack) {
    this.player.pogoBounce();
    this.sound.playPogo();
  }
  ```
  This code block is situated exclusively inside the player attack vs enemy hitbox loop (`Game.js:252-277`). Pogo does NOT trigger on any tile or hazard surface.
- **Physics Gravity & Collision**: In `src/engine/Physics.js:10-17`, gravity is applied as `entity.vy += (entity.gravity || 1100) * dt` with max fall speed `700`. Collision resolution in `Physics.checkTileCollision` (`Physics.js:31,67`) strictly checks `tile && tile.solid`.
- **Dead Physics Methods**: In `src/engine/Physics.js:90-102`:
  ```javascript
  static isTileHazard(x, y, tilemap) { ... }
  static isTileAcid(x, y, tilemap) { ... }
  ```
  Neither `isTileHazard` nor `isTileAcid` is called anywhere in `src/engine/Game.js`, `src/game/Player.js`, or any entity update routine.
- **Acid Tile Data Structure**: In `src/game/World.js:90`:
  ```javascript
  const ACID = { solid: false, acid: true, color: '#24a058' };
  ```
  Because `ACID` sets `solid: false`, `Physics.checkTileCollision` ignores acid tiles completely, allowing player entities to fall through acid without taking damage or triggering pogo.
- **Player Hitbox & Physics Tuning**: In `src/game/Player.js:6-30`:
  - Size: `22x34` px, bounding box offset `(5, 4)` (`Player.js:7-8`).
  - Speed: `moveSpeed = 210`, `jumpForce = -570`, `wallSlideSpeed = 90`, `dashSpeed = 520`.
  - Coyote time: `coyoteTimer = 0.12`s. Jump buffer: `jumpBufferTimer = 0.15`s.
- **Missing Platforming Entities**:
  - `SpikePit`: 0 references in `src/`.
  - `CrumblingPlatform`: 0 references in `src/`.
  - `BreakableWall`: 0 references in `src/`.

---

## 2. Logic Chain

1. **Observation**: `Physics.checkTileCollision` (`Physics.js:31,67`) checks `if (tile && tile.solid)`.
   **Reasoning**: Non-solid tiles (like `ACID`) are skipped during collision detection and resolution.
   **Deduction**: Player movement and gravity pass right through `ACID` tiles without stopping or registering contact.

2. **Observation**: `Physics.isTileHazard` and `Physics.isTileAcid` exist in `Physics.js:90-102` but have zero call sites across `src/`.
   **Reasoning**: No system checks whether the player's current bounding box overlaps a hazard or acid tile.
   **Deduction**: Fall into acid or hazard area inflicts zero damage and triggers no player respawn.

3. **Observation**: `Game.js:259-267` executes `pogoBounce()` only when `this.player.isAttacking && Physics.rectIntersect(this.player.attackHitbox, enemy.getBounds())` where `isDownAttack` is true.
   **Reasoning**: Nail hitboxes are only tested against enemy bounds.
   **Deduction**: Player cannot pogo bounce off acid surfaces or spike hazard tiles.

4. **Observation**: `PROJECT.md` Requirements & Milestones specify crumbling platforms, spike pits, acid pogo jumping, vertical wall shafts, and breakable secret walls for Milestone 3.
   **Reasoning**: Existing codebase contains only basic solid stone tiles, static doors, basic wall jump, and enemy pogo.
   **Deduction**: Milestone 3 implementation must construct entity classes (`CrumblingPlatform`, `BreakableWall`, `SpikePit`/`HazardTile`), implement acid pogo detection in attack handling, and build a safe-ground hazard respawn system in `Player.js`.

---

## 3. Caveats

- **Scope Boundary**: This investigation is strictly read-only per workflow rules. No source files under `src/` were edited.
- **Enemy Behaviors & Geo Economy**: Enemy AI expansion and Geo economy tuning are scheduled for Milestone 5 and were only examined in the context of player attack/pogo interaction.
- **Isma's Tear Equivalent**: Code currently has no ability flag for acid immunity (e.g. `abilities.acidImmunity`). If acid pogo / swimming without damage is added later, an ability flag will need to be introduced.

---

## 4. Conclusion

The existing engine architecture (`src/engine/`) provides a solid foundation with clean AABB tile physics, responsive jump buffering, coyote time, and smooth camera tracking. However, platforming mechanics are currently incomplete:
- **Acid pools** are non-functional (player falls through with 0 damage).
- **Hazard detection** (`isTileHazard`/`isTileAcid`) is dead code.
- **Pogo jumping** is constrained to enemies.
- **Crumbling platforms, spike pits, and breakable walls** do not exist.

Full recommendations and complete entity data structures for `CrumblingPlatform`, `BreakableWall`, `SpikePit`, `AcidPogo`, and `HazardRespawn` have been detailed in `/Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_explorer_investigate_1/analysis.md`.

---

## 5. Verification Method

To independently verify these observations:

1. **Verify Dead Code (`isTileHazard`, `isTileAcid`)**:
   Run grep for `isTileHazard` or `isTileAcid` across `src/`:
   ```bash
   grep -rn "isTileHazard\|isTileAcid" src/
   ```
   *Expected result*: Matches found ONLY in `src/engine/Physics.js:90,97`. Zero call sites in `Game.js`, `Player.js`, or `World.js`.

2. **Verify Acid Collision Defect**:
   Inspect `src/game/World.js:90` (`const ACID = { solid: false, acid: true, color: '#24a058' };`) and `src/engine/Physics.js:31,67` (`if (tile && tile.solid)`).
   *Expected result*: `solid: false` ensures `Physics.checkTileCollision` completely skips acid tiles.

3. **Verify Downward Attack Pogo Constraint**:
   Inspect `src/engine/Game.js:259-267`.
   *Expected result*: `this.player.pogoBounce()` is strictly contained within the `enemy` array iteration loop.

4. **Verify Build Integrity**:
   Run `npm run build` from workspace root to verify that the existing codebase builds cleanly without TypeScript/Vite syntax errors:
   ```bash
   npm run build
   ```
