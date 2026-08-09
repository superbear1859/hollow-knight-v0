## 2026-08-08T00:00:35Z
You are the Milestone 3 Implementation Worker. Your working directory is /Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_worker_m3_mechanics.
Read PROJECT.md at /Users/teddy/Documents/github/hollow-knight-v0/PROJECT.md and ORIGINAL_REQUEST.md at /Users/teddy/Documents/github/hollow-knight-v0/.agents/ORIGINAL_REQUEST.md.
Also read handoff report from Explorer 1:
- /Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_explorer_investigate_1/handoff.md

Task:
Implement Core Platforming & Mechanics in `src/engine/` and `src/entities/`:
1. Fix `src/engine/Physics.js`:
   - Wire up `Physics.isTileHazard` and `Physics.isTileAcid`.
   - Update tile collision detection so acid tiles trigger acid hazard response unless player down-slashes to pogo.
2. Implement `src/entities/CrumblingPlatform.js`:
   - Extends `Entity`. Solid platform that shakes on step (`0.4s`), crumbles (`solid = false`), and respawns after `3.0s`.
3. Implement `src/entities/BreakableWall.js`:
   - Extends `Entity`. Multi-hit secret wall (`hp: 3`). Plays masonry sparks/hit SFX, crumbles into debris, and spawns Geo cache or Charm entity when destroyed.
4. Implement Spike Pits & Hazard Respawn System:
   - Track `lastSafeX` and `lastSafeY` on `Player.js` whenever grounded on safe solid tiles.
   - Touching spikes or unmitigated acid applies 1 damage (`takeDamage(1)`), plays hit sound, triggers camera shake, and repositions player to `(lastSafeX, lastSafeY)` with zeroed velocity.
5. Implement Acid & Spike Pogo-Jumping:
   - Downward nail slashes over acid, spike tiles, crumbling platforms, or breakable walls trigger `player.pogoBounce()` (`vy = -380`), play pogo SFX, and spawn splash/spark particles.
6. Implement `src/entities/VoidGate.js`:
   - Barrier entity blocking room passages in Deepnest/Fog Canyon. Solid to normal movement; passable when `player.isDashing && player.abilities.shadowDash` is active.

Verify your implementation by running builds/tests or node scripts, and document all changes, file paths, and test results in `/Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_worker_m3_mechanics/handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Update your progress.md regularly as your liveness heartbeat!
