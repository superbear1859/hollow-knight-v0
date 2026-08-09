# Project: Hollow Knight Web Application Redesign

## Architecture
- Game Engine & Physics: `src/engine/` (`Game.js`, `Physics.js`, `Camera.js`, `InputHandler.js`, `Particles.js`, `SoundManager.js`)
- Entity Subsystems: `src/entities/` (`Entity.js`, `Player.js`, `Enemy.js`, `Crawlid.js`, `Vengefly.js`, `HuskSentinel.js`, `MantisGuard.js`, `FalseKnight.js`, `Hornet.js`, `CrumblingPlatform.js`, `BreakableWall.js`, `VoidGate.js`)
- Game World & Layouts: `src/game/` (`World.js`, `Bench.js`, `Collectible.js`, `Charms.js`, `Shop.js`, `SaveSystem.js`)
- UI & HUD: `src/ui/` (`HUD.js`, `MapUI.js`, `InventoryUI.js`, `DialogueUI.js`)

## Requirements Summary
1. **R1: Metroidvania Ability-Gated Level & Progression Design**:
   - 12 distinct biomes (`kings_pass`, `dirtmouth`, `crossroads`, `ancestral_mound`, `greenpath`, `hornet_sanctuary`, `fog_canyon`, `fungal_wastes`, `crystal_peak`, `city_of_tears`, `deepnest`, `ancient_basin`).
   - 0 dead-end rooms (every room leads to a boss arena, ability pedestal, bench checkpoint, or unlocked shortcut loop).
   - Ability gating: Mothwing Cloak (Dash) for 280px acid gaps, Mantis Claw (Wall Jump) for 600px vertical shafts, Shade Cloak (Shadow Dash) for dark Void Gates.
2. **R2: Rich Platforming & Secret Exploration**:
   - Crumbling platforms (shake -> crumble -> respawn).
   - Spike pits with safe ground checkpoint respawn (`lastSafeX`, `lastSafeY`).
   - Acid pogo-jumping challenges (down-slash pogo bounce off acid/spikes).
   - Vertical wall-climbing shafts.
   - Breakable secret walls hiding Geo caches and Charms.
3. **R3: Enemy Farming & Geo Economy Overhaul**:
   - Increased enemy spawns across all 12 biomes (3-6 per room).
   - Diverse behaviors (crawling, flying, husk guards, boss AI).
   - Instant enemy respawning upon resting at any Bench checkpoint.
   - Multi-denomination Geo coin drops (1, 5, 20 Geo values).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Codebase Exploration & Analysis | Audit physics, engine, world map, entities, abilities | None | DONE |
| M2 | E2E Test Suite Creation (Dual Track) | Build comprehensive test suite (Tiers 1-4) & publish `TEST_READY.md` | M1 | DONE |
| M3 | Core Platforming & Mechanics Implementation | Crumbling platforms, breakable secret walls, spike pits, acid pogo, void gates | M1 | DONE |
| M4 | 12-Biome World Layout & 0 Dead End Redesign | 12 biomes, ability gates, cyclic topology, shortcut loops, MapUI | M3 | DONE |
| M5 | Enemy Spawning & Bench Respawn Economy | 3-6 enemies/room, bench respawn system, multi-value Geo coins | M3 | DONE |
| M6 | Integration, Adversarial Hardening & Forensic Audit | Tier 5 Adversarial Hardening, Forensic Audit CLEAN verdict | M2, M4, M5 | DONE |

## Verification Summary
- **E2E Test Suite (`node tests/run-e2e-tests.js`)**: PASSED (38 / 38 tests, 100% success).
- **Unit & Mechanics Suite (`node tests/test_m3_mechanics.js`)**: PASSED (29 / 29 assertions).
- **Tier 5 Adversarial Mechanics Suite (`node tests/test_tier5_adversarial_1.js`)**: PASSED (22 / 22 stress scenarios).
- **Tier 5 Adversarial Topology Suite (`node tests/test_tier5_adversarial_2.js`)**: PASSED (9 / 9 stress scenarios).
- **Vite Production Build (`npm run build`)**: PASSED (31 modules transformed cleanly).
- **Forensic Integrity Audit**: Verdict **CLEAN** (0 hardcoded values, 0 dummy facades, 0 pre-populated logs).

## Code Layout
- `src/main.js`: Game initialization
- `src/engine/`: Engine subsystems (`Game.js`, `Physics.js`, `Camera.js`, `InputHandler.js`, `Particles.js`, `SoundManager.js`)
- `src/entities/`: Physical game entities (`Entity.js`, `Player.js`, `Enemy.js`, `Crawlid.js`, `Vengefly.js`, `HuskSentinel.js`, `MantisGuard.js`, `FalseKnight.js`, `Hornet.js`, `CrumblingPlatform.js`, `BreakableWall.js`, `VoidGate.js`)
- `src/game/`: World state & items (`World.js`, `Bench.js`, `Collectible.js`, `Charms.js`, `Shop.js`, `SaveSystem.js`)
- `src/ui/`: Overlay interfaces (`HUD.js`, `MapUI.js`, `InventoryUI.js`, `DialogueUI.js`)
