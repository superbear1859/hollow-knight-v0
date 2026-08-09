## 2026-08-08T00:06:23Z
Implement Enemy Farming Density & Bench Respawn Economy in `src/entities/`, `src/game/`, and `src/engine/`:
1. Enemy Density & Diversity:
   - Increase enemy spawn count across all 12 biomes (3 to 6 enemies per room, except town sanctuary).
   - Include diverse behaviors: Crawlids (crawlers), Vengeflies (flyers), Husk Sentinels (armored guards), Mantis guards, and bosses (False Knight, Hornet).
2. Bench Respawn System:
   - Implement `world.respawnEnemies()` in `src/game/World.js`.
   - Store room initial enemy spawn configurations so defeated enemies can be re-instantiated.
   - Trigger `world.respawnEnemies()` inside `Bench.rest()` (`src/game/Bench.js`) and player death respawn in `Game.js` (`src/engine/Game.js`).
3. Multi-Denomination Geo Economy:
   - Update `src/game/Collectible.js` / `Enemy.js` to drop multi-value Geo coins (values 1, 5, 20 Geo) instead of hundreds of single coins.
   - Ensure magnet physics, pickup collision (`player.geo += value`), and audio/visual SFX work cleanly.
4. Execute test suite: `node tests/run-e2e-tests.js` and `npm run build` to verify 100% pass rate.
5. Document all changes and verification results in `/Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_worker_m5_enemies/handoff.md`.
