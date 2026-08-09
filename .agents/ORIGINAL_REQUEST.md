# Original User Request

## Initial Request — 2026-08-07T23:53:27Z

Redesign the level layouts, Metroidvania ability-gated progression, platforming mechanics, hidden secret walls, and enemy farming density for the Hollow Knight web application so that unlocked abilities (Dash, Wall Jump, Shade Cloak) are required to access new biomes without dead ends.

Working directory: /Users/teddy/Documents/github/hollow-knight-v0
Integrity mode: demo

## Requirements

### R1. Metroidvania Ability-Gated Level & Progression Design
Level layouts across all 12 biomes must feature strict ability gates where specific abilities (Dash, Wall Jump, Shade Cloak) are required to cross obstacles, climb vertical shafts, or bypass dark void gates. Eliminate dead-end rooms by connecting all regions with shortcuts, loops, benches, and secret passages.

### R2. Rich Platforming & Exploration Secrets
Incorporate complex 2D platforming elements including crumbling platforms, spike pits, acid pogo-jumping challenges, vertical wall-climbing shafts, and hidden breakable secret walls hiding Geo caches and Charms.

### R3. Enemy Farming & Geo Economy Overhaul
Increase enemy variety, aggro behaviors, and spawn density across all 12 biomes with respawning mechanics upon resting at Benches to create rewarding Geo farming zones.

## Acceptance Criteria

### Progression & Level Flow
- [ ] Every room leads to either a boss arena, ability pedestal, bench checkpoint, or unlocked shortcut loop back to previous biomes (0 dead-end rooms).
- [ ] Mothwing Cloak (Dash) is strictly required to cross wide acid gaps and chasms in Greenpath & Fog Canyon.
- [ ] Mantis Claw (Wall Jump) is strictly required to climb high vertical shafts in Crystal Peak & City of Tears.
- [ ] Shade Cloak (Shadow Dash) is strictly required to pass through dark void gates in Deepnest.

### Platforming & Secrets
- [ ] Platforming sections feature pogo bounces over spikes/acid, wall-climbing shafts, and hidden breakable walls containing Geo caches or Charms.

### Geo Farming & Enemies
- [ ] Increased enemy spawns with diverse enemy behaviors (crawling, flying, husk guards) that respawn when resting at any Bench checkpoint.
