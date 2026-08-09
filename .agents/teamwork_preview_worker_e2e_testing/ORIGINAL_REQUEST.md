## 2026-08-07T17:00:35Z

You are the E2E Testing Track Worker. Your working directory is /Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_worker_e2e_testing.
Read PROJECT.md at /Users/teddy/Documents/github/hollow-knight-v0/PROJECT.md and ORIGINAL_REQUEST.md at /Users/teddy/Documents/github/hollow-knight-v0/.agents/ORIGINAL_REQUEST.md.
Also read handoff reports:
- /Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_explorer_investigate_1/handoff.md
- /Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_explorer_investigate_2/handoff.md
- /Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_explorer_investigate_3/handoff.md

Task:
Build an opaque-box E2E test suite for the Hollow Knight web application.
1. Create `TEST_INFRA.md` at project root documenting test architecture, runner command, and 4-tier coverage methodology.
2. Implement a complete test suite (e.g. executable script/runner in `tests/` or `src/tests/` using Node.js) covering:
   - Tier 1: Feature Coverage (>=5 tests per feature: Ability Gating across 12 biomes [Dash, Wall Jump, Shade Cloak], Platforming Mechanics [Crumbling platforms, Spike pits, Acid pogo, Vertical wall shafts, Breakable secret walls], Enemy Economy & Bench Respawns, 0 Dead-End topology).
   - Tier 2: Boundary & Corner Cases (Precise collision boundaries, zero soul/health, boundary room transitions, multi-hit secret walls, rapid bench resting).
   - Tier 3: Cross-Feature Combinations (Pogo off enemies into secret walls, dash + wall jump through acid shafts, shade cloak past void gates during aggro).
   - Tier 4: Real-World Playthrough Scenarios (Full playthrough loops traversing all 12 biomes from Dirtmouth through boss arenas back via unlocked shortcuts).
3. Ensure the test suite can be run via command (e.g., `node tests/run-e2e-tests.js`).
4. Once the test runner and test cases are implemented and ready, create `TEST_READY.md` at project root with full summary and checklist.
5. Execute the tests, document results in your handoff report at `/Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_worker_e2e_testing/handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Update your progress.md regularly as your liveness heartbeat!
