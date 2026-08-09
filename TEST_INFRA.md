# TEST_INFRA.md — Hollow Knight Web Application E2E Test Infrastructure

## Overview & Test Architecture

The Hollow Knight web application E2E test suite is an opaque-box, headless Node.js test infrastructure designed to exercise and verify all game engine subsystems (`Game`, `Physics`, `Camera`, `InputHandler`, `Particles`, `SoundManager`), entity behaviors (`Player`, `Enemy`, `Crawlid`, `Vengefly`, `HuskSentinel`, `FalseKnight`, `Hornet`), world graph structures (`World`, `Room`, `Bench`, `Collectible`, `SaveSystem`), and interface contracts defined in `PROJECT.md`.

### Architecture Diagram & Component Isolation

```
                   +---------------------------------------+
                   |       node tests/run-e2e-tests.js     |
                   +---------------------------------------+
                                       |
                   +---------------------------------------+
                   |       tests/test-framework.js         |
                   |   (Runner, Assertions, Timing, Report)|
                   +---------------------------------------+
                                       |
                   +---------------------------------------+
                   |          tests/setup-env.js           |
                   | (Polyfills: DOM, Canvas, Audio, Local)|
                   +---------------------------------------+
                                       |
      +--------------------+--------------------+--------------------+
      |                    |                    |                    |
+--------------+     +--------------+     +--------------+     +--------------+
|   Tier 1:    |     |   Tier 2:    |     |   Tier 3:    |     |   Tier 4:    |
|   Feature    |     | Boundary &   |     | Cross-       |     | Playthrough  |
|  Coverage    |     | Corner Cases |     | Feature      |     | Scenarios    |
+--------------+     +--------------+     +--------------+     +--------------+
```

### Key Execution Environment Characteristics
1. **Native ES Modules**: Utilizes Node.js native `"type": "module"` support without transpilation overhead.
2. **Headless Browser Environment (`tests/setup-env.js`)**: Polyfills `window`, `document`, `localStorage`, `HTMLCanvasElement`, 2D Rendering Context, `AudioContext`, and `requestAnimationFrame`.
3. **Zero External Dependencies**: Pure JS test harness providing deterministic execution (<10ms total execution time for 38 tests).
4. **State Verification**: Directly queries real game state instances (`player.x`, `player.y`, `player.vx`, `player.vy`, `player.masks`, `player.soul`, `player.abilities`, `world.rooms`, `game.visitedRooms`) rather than stubbed return values.

---

## Test Runner Command

To run the complete E2E test suite:

```bash
node tests/run-e2e-tests.js
```

---

## 4-Tier Coverage Methodology

The test suite enforces a rigorous 4-tier testing hierarchy comprising **38 total E2E tests**:

### Tier 1: Feature Coverage (22 Tests)
Guarantees at least 5 tests per major feature area:
- **Ability Gating across 12 Biomes (6 tests)**:
  - `T1.1`: Mothwing Cloak (Dash) requirement across 280px Greenpath acid gap.
  - `T1.2`: Mantis Claw (Wall Jump) requirement for 600px Crystal Peak vertical wall shafts.
  - `T1.3`: Shade Cloak (Shadow Dash) requirement for dark Void Gate passage in Deepnest.
  - `T1.4`: Ability pickup collectibles (`AbilityUnlock`) update `player.abilities` state (`dash`, `wallJump`, `shadowDash`).
  - `T1.5`: 12 distinct biomes accessibility and room layout matrix validation.
  - `T1.6`: Gated room entrance door collision triggers and target mapping.
- **Platforming Mechanics (6 tests)**:
  - `T1.7`: Crumbling platforms state transition (`INTACT` -> `SHAKING` -> `CRUMBLED` -> solid disable -> respawn).
  - `T1.8`: Spike pit collision -> damage application -> hazard respawn at `lastSafeX`, `lastSafeY`.
  - `T1.9`: Acid pogo-jumping challenge -> down attack over hazard -> `pogoBounce()` execution (`vy = -380`).
  - `T1.10`: Vertical wall shafts -> wall slide speed cap (`vy = 90`) and wall jump vectors (`vy = -513`, `vx = 252`).
  - `T1.11`: Breakable secret walls -> damage intake -> destruction -> solid physics disable -> reward spawn.
  - `T1.12`: Grounded hazard checkpoint updates when standing on safe solid tiles.
- **Enemy Economy & Bench Respawns (5 tests)**:
  - `T1.13`: Enemy spawn density across 12 biomes.
  - `T1.14`: Multi-denomination Geo coin drop values (1, 5, 20 Geo) and pickup collision.
  - `T1.15`: Bench resting restores player masks (`masks = 5`) and soul (`soul = 100`).
  - `T1.16`: Bench resting triggers enemy respawns across non-boss rooms (`world.respawnEnemies()`).
  - `T1.17`: Player death respawns player at last bench checkpoint with full health.
- **0 Dead-End Topology (5 tests)**:
  - `T1.18`: Topological graph check: every room connects to >=2 exits or boss arena / pedestal / bench / shortcut loop.
  - `T1.19`: False Knight post-boss shortcut connection to Lower Crossroads.
  - `T1.20`: Hornet post-boss drop chute connection to Fog Canyon.
  - `T1.21`: Crystal Peak vertical shaft exit connecting to City of Tears / Crossroads.
  - `T1.22`: Deepnest Void Gate shortcut loop connecting back to City of Tears / Dirtmouth.

### Tier 2: Boundary & Corner Cases (6 Tests)
- `T2.1`: Precise AABB collision boundaries and pixel alignment at tile edges.
- `T2.2`: Zero Soul focus attempt and 1 Mask health edge case.
- `T2.3`: High-velocity door transitions (max fall speed & max dash velocity).
- `T2.4`: Multi-hit secret breakable wall health persistence across hits.
- `T2.5`: Rapid bench resting does not corrupt save data or duplicate enemy respawns.
- `T2.6`: Repeated hazard pit falling accurately decrements masks until player death.

### Tier 3: Cross-Feature Combinations (5 Tests)
- `T3.1`: Pogo off airborne enemy to gain elevation and reach high elevated breakable wall.
- `T3.2`: Dash + Wall Jump sequence through vertical acid shafts.
- `T3.3`: Shade Cloak past Void Gate while invulnerable during enemy aggro.
- `T3.4`: Bench resting during active enemy pursuit resets enemy aggro state and fully heals player.
- `T3.5`: Multi-ability shortcut traversal combining Dash and Wall Jump.

### Tier 4: Real-World Playthrough Scenarios (5 Tests)
- `T4.1`: Dirtmouth -> Upper Crossroads -> False Knight Arena Playthrough Loop.
- `T4.2`: Greenpath Mothwing Cloak Acquisition & Hornet Boss Fight Playthrough Loop.
- `T4.3`: Crystal Peak Mantis Claw Acquisition & City of Tears Descent Playthrough Loop.
- `T4.4`: Deepnest Void Gate & Shade Cloak Acquisition Playthrough Loop.
- `T4.5`: Full 12-Biome Grand Tour Playthrough Loop without Dead-Ends.

---

## File Structure

```
tests/
├── run-e2e-tests.js               # Main executable runner
├── setup-env.js                   # Headless DOM, Canvas, Audio, LocalStorage polyfills
├── test-framework.js              # Test suite describe/test harness & assertions
├── tier1-feature-coverage.test.js # Tier 1 test cases (22 tests)
├── tier2-boundary-corner.test.js  # Tier 2 test cases (6 tests)
├── tier3-cross-feature.test.js     # Tier 3 test cases (5 tests)
└── tier4-playthrough-scenarios.test.js # Tier 4 test cases (5 tests)
```
