## 2026-08-07T17:11:13Z
You are the Forensic Auditor. Your working directory is /Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_auditor_forensic.
Read PROJECT.md at /Users/teddy/Documents/github/hollow-knight-v0/PROJECT.md and ORIGINAL_REQUEST.md at /Users/teddy/Documents/github/hollow-knight-v0/.agents/ORIGINAL_REQUEST.md.

Task:
Perform a complete forensic integrity audit of the entire codebase across `src/`, `tests/`, and build artifacts:
1. Static analysis & code inspection:
   - Check for hardcoded test results, expected output strings, or static pass flags.
   - Check for dummy/facade implementations, empty stubs, or mock returns in `src/engine/`, `src/entities/`, `src/game/`, and `src/ui/`.
   - Verify authentic implementation of all 6 acceptance criteria (Ability Gating across 12 biomes, 0 dead-end rooms, crumbling platforms, spike pits, acid pogo, breakable secret walls, enemy farming density, bench respawns, multi-value Geo coins).
2. Dynamic execution validation:
   - Run `npm run build` and verify clean build.
   - Run `node tests/run-e2e-tests.js` and verify test execution.
   - Run unit/integration test scripts in `tests/`.
3. Render a verdict: CLEAN or INTEGRITY VIOLATION.
4. Document full forensic evidence, file paths, line numbers, and audit findings in `/Users/teddy/Documents/github/hollow-knight-v0/.agents/teamwork_preview_auditor_forensic/handoff.md`.

Update progress.md as your liveness heartbeat!
