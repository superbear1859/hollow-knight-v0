## 2026-08-08T00:06:23Z
You are the Milestone 4 Implementation Worker. Your working directory is /Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_worker_m4_biomes.
Read PROJECT.md at /Users/teddy/Documents/github/hollow-knight-v0/PROJECT.md and ORIGINAL_REQUEST.md at /Users/teddy/Documents/github/hollow-knight-v0/.agents/ORIGINAL_REQUEST.md.
Also read handoff report from Explorer 2:
- /Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_explorer_investigate_2/handoff.md

Task:
Implement 12 Biomes & 0-Dead-End Level Topology in `src/game/World.js` and `src/ui/MapUI.js`:
1. Modify `src/game/World.js`:
   - Instantiate 12 distinct rooms with 12 distinct biome tags (`kings_pass`, `dirtmouth`, `crossroads`, `ancestral_mound`, `greenpath`, `hornet_sanctuary`, `fog_canyon`, `fungal_wastes`, `crystal_peak`, `city_of_tears`, `deepnest`, `ancient_basin`).
   - Eliminate ALL dead ends. Ensure EVERY room connects to a boss arena, ability pedestal, bench checkpoint, or unlocked shortcut loop back (0 dead-end rooms).
   - Add shortcut doors / post-boss exits / post-pedestal drop chutes / void gate shortcuts (e.g. False Knight post-boss wall to Lower Crossroads, Hornet post-boss drop chute to Fog Canyon, Crystal Peak top shaft shortcut to City of Tears, Deepnest Void Gate shortcut loop to City of Tears/Dirtmouth).
2. Ability Gating Enforcement:
   - Mothwing Cloak (Dash) requirement across 280px acid gap in `greenpath_01` & `fog_canyon`.
   - Mantis Claw (Wall Jump) requirement for 600px vertical shaft in `crystal_peak` & `city_of_tears`.
   - Shade Cloak (Shadow Dash) requirement for dark Void Gate in `deepnest` & `fog_canyon`.
3. Update `src/ui/MapUI.js`:
   - Update `mapNodes` array to accurately render and connect all 12 biomes on the interactive map UI.
4. Execute test suite: `node tests/run-e2e-tests.js` and `npm run build` to verify 100% pass rate.
5. Document all changes and verification results in `/Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_worker_m4_biomes/handoff.md`.
