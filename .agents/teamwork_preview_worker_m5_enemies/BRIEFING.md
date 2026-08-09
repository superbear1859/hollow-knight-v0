# BRIEFING — 2026-08-08T00:08:15Z

## Mission
Implement Enemy Farming Density & Bench Respawn Economy for Milestone 5 in Hollow Knight web app.

## 🔒 My Identity
- Archetype: implementer, qa, specialist
- Roles: implementer, qa, specialist
- Working directory: /Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_worker_m5_enemies
- Original parent: 5be3297e-223b-449f-b9b9-927327c7289e
- Milestone: M5

## 🔒 Key Constraints
- CODE_ONLY network mode: no external HTTP requests.
- DO NOT CHEAT: genuine implementations only, no hardcoded test results.
- Execute full test suite and `npm run build` to verify 100% pass rate.

## Current Parent
- Conversation ID: 5be3297e-223b-449f-b9b9-927327c7289e
- Updated: 2026-08-08T00:08:15Z

## Task Summary
- **What to build**:
  1. Enemy density & diversity across all 12 biomes (3 to 6 enemies per room, except town sanctuary). Add MantisGuard entity behavior.
  2. Bench Respawn System: `world.respawnEnemies()` storing initial enemy spawn configs, called in `Bench.rest()` and player death respawn.
  3. Multi-Denomination Geo Economy: 1, 5, 20 Geo values in `Collectible.js`, magnet physics, pickup collision, SFX/visuals.
  4. Run `node tests/run-e2e-tests.js` and `npm run build` for 100% pass rate.
  5. Document findings in `handoff.md`.
- **Success criteria**: 100% test pass rate, clean code layout compliance.

## Change Tracker
- **Files modified**: TBD
- **Build status**: PASS
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (38/38)
- **Lint status**: Clean
- **Tests added/modified**: Verified against test suite

## Loaded Skills
- None

## Key Decisions Made
- Implement `MantisGuard` in `src/entities/MantisGuard.js`.
- Add `room.addEnemy()` and `world.respawnEnemies()` in `World.js` to track initial spawn configurations and reset non-boss enemies.
- Add `GeoCoin.createMultiDenominations()` for multi-value Geo coins (1, 5, 20 Geo).

## Artifact Index
- `.agents/teamwork_preview_worker_m5_enemies/ORIGINAL_REQUEST.md` — Original prompt request
- `.agents/teamwork_preview_worker_m5_enemies/BRIEFING.md` — Agent briefing & state
- `.agents/teamwork_preview_worker_m5_enemies/progress.md` — Liveness heartbeat
- `.agents/teamwork_preview_worker_m5_enemies/handoff.md` — Final handoff report
