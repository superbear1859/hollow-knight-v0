# Hollow Knight Redesign Project Plan

## Overview
Redesign level layouts, Metroidvania ability-gated progression across all 12 biomes, platforming mechanics, hidden secret walls, and enemy farming density for the Hollow Knight web application.

## Milestones & Architecture

### Phase 1: Exploration & Codebase Assessment
- Explore existing source structure (`src/engine`, `src/entities`, `src/game`, `src/ui`).
- Document existing biomes, map format, collision detection, player abilities, enemy types, platform types, and bench mechanics.

### Phase 2: E2E Test Suite Track
- Build opaque-box E2E test suite covering Tiers 1-4:
  - Tier 1: Feature Coverage (Ability Gating, Platforming, Secret Walls, Enemy Respawns, 0 Dead-ends)
  - Tier 2: Boundary & Corner Cases (Precise collision limits, zero Geo, fast bench rest, boundary transitions)
  - Tier 3: Cross-Feature Combinations (Pogo off enemies into secret walls, dash through acid while wall jumping, shade cloak past void gate during aggro)
  - Tier 4: Real-World Playthrough Scenarios (Full biome traversal loops from Forgotten Crossroads through all 12 biomes back to shortcuts)
- Publish `TEST_READY.md`.

### Phase 3: Core Platforming & Mechanics Overhaul (Implementation Track)
- Implement crumbling platforms, spike pits, acid pogo physics, vertical wall climbing logic, breakable walls with Geo/Charms.
- Support Mothwing Cloak (Dash), Mantis Claw (Wall Jump), and Shade Cloak (Shadow Dash / Void Gate pass-through).

### Phase 4: Biome & Progression Redesign (Implementation Track)
- Build out all 12 biomes with strict ability gating and 0 dead ends (every room leads to boss, pedestal, bench, or shortcut loop).
- Greenpath & Fog Canyon: Acid gaps requiring Dash.
- Crystal Peak & City of Tears: Vertical shafts requiring Wall Jump.
- Deepnest: Dark void gates requiring Shade Cloak.
- Connect all biomes with shortcut loops, benches, and secret passages.

### Phase 5: Enemy Farming & Geo Economy (Implementation Track)
- Increase enemy spawns, add diverse behaviors (crawlers, flyers, husk guards).
- Implement full enemy respawning upon resting at any Bench.

### Phase 6: Integration, Verification & Adversarial Testing
- Verify all E2E test suite tiers pass.
- Conduct Tier 5 Adversarial Coverage Hardening with Challenger subagents.
- Pass Forensic Audit with CLEAN verdict.
- Announce VICTORY to Sentinel parent agent.
