# Handoff Report — Explorer 3: Codebase Exploration & Analysis

## 1. Observation

### Exact File Paths & Code Snippets:
- **Player Ability Tracking (`src/game/Player.js:53-57`)**:
  ```javascript
  this.abilities = {
    dash: false,
    shadowDash: false,
    wallJump: false
  };
  ```
- **Dash & Shade Cloak Activation (`src/game/Player.js:168-180`)**:
  ```javascript
  const canDash = this.abilities.dash && this.dashCooldownTimer <= 0;
  if (input.isJustPressed('dash') && canDash) {
    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    const cooldown = this.hasCharm('DASHMASTER') ? this.dashCooldown * 0.5 : this.dashCooldown;
    this.dashCooldownTimer = cooldown;
    this.isShadowDash = this.abilities.shadowDash;
    if (this.isShadowDash) {
      this.invulnerable = true;
      this.invulnerableTimer = this.dashDuration;
    }
    soundManager.playDash();
  }
  ```
- **Wall Jump Mechanics (`src/game/Player.js:133-160`)**:
  Wall slide triggers when `(onLeftWall || onRightWall) && !grounded && vy > 0 && abilities.wallJump`. Jump buffer executes wall jump with `vy = -513`, `vx = wallDir * 252`, `wallJumpTimer = 0.18s`.

- **Bench Resting Function (`src/game/Bench.js:17-42`)**:
  ```javascript
  rest(player, soundManager, particles, saveSystem, game) {
    player.masks = player.maxMasks;
    player.soul = player.maxSoul;

    soundManager.playBenchBell();
    particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 80, '#b0e2ff');

    const saveData = { ... };
    saveSystem.save(saveData);
  }
  ```
  *(Observation: No enemy respawn logic or room enemy array reset is called in `Bench.rest()`)*.

- **Enemy Death & Geo Spawn (`src/entities/Enemy.js:35-41`, `src/engine/Game.js:268-272`)**:
  In `Enemy.takeDamage()`: `this.isDead = true; this.active = false;`.
  In `Game.update()`:
  ```javascript
  if (defeated) {
    for (let g = 0; g < enemy.geoReward; g++) {
      room.collectibles.push(new GeoCoin(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 1));
    }
  }
  ```

- **Search for Secret Breakable Walls**:
  `grep_search` for pattern `secret|breakable|Breakable|Secret|crumb` across `src/` yielded **0 matches**.

---

## 2. Logic Chain

1. **Ability Activation & Tracking**: Player abilities are stored in `player.abilities` object and unlocked via `AbilityUnlock` collectibles. Movement abilities (`dash`, `wallJump`, `shadowDash`) alter physics velocities (`vx`, `vy`) in `Player.js`. Shade Cloak toggles `isShadowDash` and `invulnerableTimer`, but currently has no interaction with physical barriers like dark void gates.
2. **Enemy Behavior & Geo Drops**: Enemies inherit from `Enemy.js` and implement custom movement/attack patterns (`Crawlid` patrols, `Vengefly` chases in 2D, `HuskSentinel` thrusts melee, `FalseKnight` & `Hornet` use FSMs). When an enemy dies, it sets `active = false` and spawns `GeoCoin` collectibles with magnetic physics (`magnetRadius = 130`).
3. **Bench Mechanics & Respawn Defect**: Resting at a bench restores player HP (`masks`) and Soul and saves game state. However, because `Bench.rest()` lacks code to reset `enemy.active = true` or recreate non-boss enemies in `room.enemies`, defeated enemies remain permanently dead during the play session. This invalidates the bench respawn and enemy farming requirements.
4. **Secret Wall Defect**: No `SecretWall` entity or breakable tile type exists in `src/entities/` or `src/game/World.js`. Consequently, hidden breakable secret walls containing Geo caches or Charms are completely missing from the existing codebase.

---

## 3. Caveats

- Investigation was performed strictly in read-only mode without modifying source code files outside of `.agents/teamwork_preview_explorer_investigate_3/`.
- Framerate impact during high-count Geo coin generation (e.g. 150 coins for Hornet) was inferred from loop iterations in `Game.js` line 269.

---

## 4. Conclusion

The core object hierarchy and UI systems (`Player`, `Enemy`, `HUD`, `InventoryUI`, `MapUI`, `Bench`, `Collectibles`) provide a solid foundation. However, to satisfy Metroidvania design requirements, the following implementation work is required:
1. **Bench Respawn**: Add `world.respawnEnemies()` called from `Bench.rest()` and player death respawn.
2. **Breakable Walls**: Implement a `SecretWall` entity class that handles nail hits, crumbling particle effects, and spawns hidden Geo caches or Charms upon destruction.
3. **Geo Economy Overhaul**: Increase enemy spawn density to 3-6 per room across all 12 biomes and introduce multi-value Geo coins (1, 5, 20 Geo) to optimize rendering performance.
4. **Shade Cloak Barriers**: Create `VoidGate` entities that block passage unless passed through with `isShadowDash`.

---

## 5. Verification Method

To independently verify these observations and conclusions:
1. **Code File Inspection**: Use `view_file` on `src/game/Bench.js` (lines 17-42) to confirm the absence of enemy respawn calls.
2. **Secret Wall Code Search**: Run `grep_search` with pattern `secret|breakable` on `src/` to confirm that breakable wall entities do not exist.
3. **Ability Inspection**: Use `view_file` on `src/game/Player.js` (lines 168-180) to verify how `abilities.shadowDash` sets `invulnerable` but lacks void gate collision handling.
