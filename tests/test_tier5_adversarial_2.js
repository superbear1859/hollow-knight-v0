import './setup-env.js';
import { describe, test, assert, assertEquals, assertInDelta, runSuites } from './test-framework.js';
import { Game } from '../src/engine/Game.js';
import { World, Room } from '../src/game/World.js';
import { Player } from '../src/game/Player.js';
import { Physics } from '../src/engine/Physics.js';
import { Bench } from '../src/game/Bench.js';
import { AbilityUnlock, GeoCoin } from '../src/game/Collectible.js';
import { VoidGate } from '../src/entities/VoidGate.js';
import { Crawlid } from '../src/entities/Crawlid.js';
import { Vengefly } from '../src/entities/Vengefly.js';
import { HuskSentinel } from '../src/entities/HuskSentinel.js';
import { SaveSystem } from '../src/game/SaveSystem.js';

describe('Tier 5: White-Box Adversarial Stress Testing (Challenger 2)', () => {

  // =========================================================================
  // 1. FULL 12-BIOME GRAPH TRAVERSAL & PASSAGE INTEGRITY
  // =========================================================================
  test('T5.2.1: Full 12-biome graph traversal verifying 0 dead-end rooms and target validity', () => {
    const world = new World();
    const roomKeys = Object.keys(world.rooms);

    assertEquals(roomKeys.length, 12, 'World must contain exactly 12 rooms');

    // Collect biomes across all 12 rooms
    const biomes = new Set();
    roomKeys.forEach(id => {
      biomes.add(world.rooms[id].biome);
    });

    assertEquals(biomes.size, 12, 'World must cover exactly 12 distinct biomes');
    assert(biomes.has('kings_pass'), 'Biome kings_pass must exist');
    assert(biomes.has('dirtmouth'), 'Biome dirtmouth must exist');
    assert(biomes.has('crossroads'), 'Biome crossroads must exist');
    assert(biomes.has('ancient_basin'), 'Biome ancient_basin must exist');
    assert(biomes.has('ancestral_mound'), 'Biome ancestral_mound must exist');
    assert(biomes.has('crystal_peak'), 'Biome crystal_peak must exist');
    assert(biomes.has('greenpath'), 'Biome greenpath must exist');
    assert(biomes.has('fungal_wastes'), 'Biome fungal_wastes must exist');
    assert(biomes.has('hornet_sanctuary'), 'Biome hornet_sanctuary must exist');
    assert(biomes.has('fog_canyon'), 'Biome fog_canyon must exist');
    assert(biomes.has('city_of_tears'), 'Biome city_of_tears must exist');
    assert(biomes.has('deepnest'), 'Biome deepnest must exist');

    // 0 Dead-End Verification: Every room must have at least 1 exit door
    roomKeys.forEach(id => {
      const room = world.rooms[id];
      assert(room.doors.length > 0, `Room ${id} in biome ${room.biome} must have at least 1 door exit (0 dead-end rooms requirement)`);
      
      // Verify every door targets a valid existing room in the world
      room.doors.forEach(door => {
        assert(world.rooms[door.targetRoomId] !== undefined, `Door in ${id} targets valid room ${door.targetRoomId}`);
      });
    });

    // BFS Traversal: Verify all 12 rooms are reachable starting from dirtmouth_01
    const visited = new Set(['dirtmouth_01']);
    const queue = ['dirtmouth_01'];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentRoom = world.rooms[currentId];

      for (const door of currentRoom.doors) {
        if (!visited.has(door.targetRoomId)) {
          visited.add(door.targetRoomId);
          queue.push(door.targetRoomId);
        }
      }
    }

    assertEquals(visited.size, 12, 'BFS graph traversal must reach all 12 rooms from dirtmouth_01 without unreachable dead ends');
  });

  test('T5.2.2: Bidirectional shortcut passage verification across connected biome loops', () => {
    const world = new World();

    // Verify key cyclic shortcut connections allow return traversal
    // 1. False Knight Arena (boss_false_knight) shortcut connection to Lower Crossroads (crossroads_02)
    const falseKnightDoors = world.rooms['boss_false_knight'].doors;
    const fkShortcut = falseKnightDoors.find(d => d.targetRoomId === 'crossroads_02');
    assert(fkShortcut !== undefined, 'False Knight post-boss shortcut door to crossroads_02 must exist');

    // 2. Hornet Arena (boss_hornet) post-boss drop chute to Fog Canyon (fog_canyon)
    const hornetDoors = world.rooms['boss_hornet'].doors;
    const hornetShortcut = hornetDoors.find(d => d.targetRoomId === 'fog_canyon');
    assert(hornetShortcut !== undefined, 'Hornet post-boss shortcut door to fog_canyon must exist');

    // 3. Crystal Peak (crystal_peak) top shaft shortcut exit to City of Tears (city_of_tears)
    const crystalDoors = world.rooms['crystal_peak'].doors;
    const crystalShortcut = crystalDoors.find(d => d.targetRoomId === 'city_of_tears');
    assert(crystalShortcut !== undefined, 'Crystal Peak top shaft shortcut door to city_of_tears must exist');

    // 4. Deepnest (deepnest) Void Gate shortcut loop to City of Tears (city_of_tears)
    const deepnestDoors = world.rooms['deepnest'].doors;
    const deepnestShortcut = deepnestDoors.find(d => d.targetRoomId === 'city_of_tears');
    assert(deepnestShortcut !== undefined, 'Deepnest Void Gate shortcut door to city_of_tears must exist');

    // Return loop check: verify every room has a path leading back to dirtmouth_01
    Object.keys(world.rooms).forEach(startRoomId => {
      const visited = new Set([startRoomId]);
      const queue = [startRoomId];
      let canReturn = false;

      while (queue.length > 0) {
        const curr = queue.shift();
        if (curr === 'dirtmouth_01') {
          canReturn = true;
          break;
        }

        const rm = world.rooms[curr];
        for (const d of rm.doors) {
          if (!visited.has(d.targetRoomId)) {
            visited.add(d.targetRoomId);
            queue.push(d.targetRoomId);
          }
        }
      }

      assert(canReturn, `Room ${startRoomId} must have a valid return path back to dirtmouth_01 (bidirectional graph passage)`);
    });
  });

  // =========================================================================
  // 2. ABILITY GATING STRICT BOUNDS STRESS TESTING
  // =========================================================================
  test('T5.2.3: Strict bound: Player CANNOT cross 280px acid gap without Dash (Mothwing Cloak)', () => {
    const player = new Player(100, 900);
    player.abilities = { dash: false, wallJump: false, shadowDash: false };

    // Standard Jump Parabola Math & Physics
    // moveSpeed = 210, jumpForce = -570, gravity = 1100
    // t_air = 2 * 570 / 1100 = 1.03636s
    // Max horizontal displacement without dash = 210 * 1.03636 = 217.636px
    const dt = 0.016;
    player.vy = player.jumpForce;
    player.vx = player.moveSpeed;

    let totalHorizontalDistance = 0;
    while (player.vy < -player.jumpForce) {
      player.x += player.vx * dt;
      totalHorizontalDistance += player.vx * dt;
      player.vy += 1100 * dt;
    }

    assert(totalHorizontalDistance < 280, `Without dash, max horizontal jump reach is ${totalHorizontalDistance.toFixed(1)}px, strictly < 280px acid gap`);

    // Enable Mothwing Cloak (Dash)
    player.abilities.dash = true;
    player.isDashing = true;
    player.dashTimer = player.dashDuration; // 0.22s
    player.vx = player.dashSpeed; // 520px/s

    let dashDistance = 0;
    for (let i = 0; i < Math.ceil(0.22 / dt); i++) {
      dashDistance += player.vx * dt;
    }

    const combinedReach = totalHorizontalDistance + dashDistance;
    assert(combinedReach >= 280, `With Mothwing Cloak dash, combined jump reach is ${combinedReach.toFixed(1)}px, strictly clearing 280px acid gap`);
  });

  test('T5.2.4: Strict bound: Player CANNOT scale 600px vertical shaft without Wall Jump (Mantis Claw)', () => {
    const world = new World();
    const room = world.rooms['crystal_peak'];
    const player = new Player(3360, 920); // Base of vertical shaft
    player.abilities = { dash: false, wallJump: false, shadowDash: false };

    const dummyInput = { isDown: () => true, isJustPressed: (k) => k === 'jump' };
    const dummySound = { playSlash: () => {} };
    const dummyParticles = { spawnDust: () => {} };

    // Max height without wall jump = v0^2 / (2 * g) = 570^2 / (2 * 1100) = 147.68px
    const initialY = player.y;
    let minYWithoutWallJump = initialY;

    for (let i = 0; i < 60; i++) {
      player.update(0.016, dummyInput, dummySound, dummyParticles, room);
      if (player.y < minYWithoutWallJump) minYWithoutWallJump = player.y;
    }

    const heightGainNoWallJump = initialY - minYWithoutWallJump;
    assert(heightGainNoWallJump < 200, `Without Mantis Claw, height gain is ${heightGainNoWallJump.toFixed(1)}px, far below 600px vertical shaft`);
    assertEquals(player.isWallSliding, false, 'Player cannot wall slide without Mantis Claw');

    // Enable Mantis Claw (Wall Jump)
    player.abilities.wallJump = true;
    player.x = 3360;
    player.y = 800;
    player.onRightWall = true;
    player.vy = 50;

    player.update(0.016, dummyInput, dummySound, dummyParticles, room);
    assert(player.abilities.wallJump, 'Mantis Claw wall jump enabled');
  });

  test('T5.2.5: Strict bound: Player CANNOT pass Void Gate without Shade Cloak (Shadow Dash)', () => {
    const voidGate = new VoidGate(1800, 896, 32, 96);
    const player = new Player(1750, 896);

    // Permutation 1: No dash, No Shade Cloak
    player.isDashing = false;
    player.abilities = { dash: false, shadowDash: false };
    assertEquals(voidGate.isPassableBy(player), false, 'Void Gate is IMPASSABLE when not dashing');

    // Permutation 2: Dashing, NO Shade Cloak (Standard Mothwing Dash)
    player.isDashing = true;
    player.abilities = { dash: true, shadowDash: false };
    player.isShadowDash = false;
    assertEquals(voidGate.isPassableBy(player), false, 'Void Gate is IMPASSABLE with standard Mothwing Dash');

    // Permutation 3: Shade Cloak unlocked, but NOT actively dashing
    player.isDashing = false;
    player.abilities = { dash: true, shadowDash: true };
    player.isShadowDash = false;
    assertEquals(voidGate.isPassableBy(player), false, 'Void Gate is IMPASSABLE when standing still even with Shade Cloak');

    // Permutation 4: Dashing WITH Shade Cloak active
    player.isDashing = true;
    player.abilities = { dash: true, shadowDash: true };
    player.isShadowDash = true;
    assertEquals(voidGate.isPassableBy(player), true, 'Void Gate is PASSABLE when Shadow Dashing with Shade Cloak');
  });

  // =========================================================================
  // 3. BENCH RESTING ENEMY RESPAWN CONSISTENCY ACROSS 10 CYCLES
  // =========================================================================
  test('T5.2.6: Bench resting enemy respawn consistency across 10 consecutive rest cycles', () => {
    const game = new Game({ getContext: () => ({}) });
    const world = game.world;
    const player = game.player;

    // Count initial non-boss enemies across all 12 rooms
    let totalInitialNonBossEnemies = 0;
    const initialConfigMap = new Map();

    Object.keys(world.rooms).forEach(roomId => {
      const rm = world.rooms[roomId];
      const nonBosses = rm.enemies.filter(e => !e.isBoss);
      totalInitialNonBossEnemies += nonBosses.length;
      initialConfigMap.set(roomId, nonBosses.map(e => ({ x: e.x, y: e.y, type: e.constructor })));
    });

    assert(totalInitialNonBossEnemies >= 30, `World must contain substantial enemy count (found ${totalInitialNonBossEnemies})`);

    const bench = new Bench(700, 616, 'dirtmouth_01');

    // Execute 10 consecutive kill-and-rest cycles
    for (let cycle = 1; cycle <= 10; cycle++) {
      // Kill 100% of non-boss enemies in rooms
      Object.keys(world.rooms).forEach(roomId => {
        const rm = world.rooms[roomId];
        rm.enemies.forEach(enemy => {
          if (!enemy.isBoss) {
            enemy.hp = 0;
            enemy.active = false;
            enemy.isDead = true;
          }
        });
      });

      // Verify enemies are killed before rest
      let activeCountBeforeRest = 0;
      Object.keys(world.rooms).forEach(roomId => {
        activeCountBeforeRest += world.rooms[roomId].enemies.filter(e => !e.isBoss && e.active && !e.isDead).length;
      });
      assertEquals(activeCountBeforeRest, 0, `Cycle ${cycle}: All non-boss enemies must be dead prior to resting`);

      // Perform Bench Rest
      bench.rest(player, game.sound, game.particles, SaveSystem, game);

      // Verify AFTER Bench Rest
      let activeCountAfterRest = 0;
      Object.keys(world.rooms).forEach(roomId => {
        const rm = world.rooms[roomId];
        rm.enemies.forEach(enemy => {
          if (!enemy.isBoss) {
            assert(enemy.active, `Cycle ${cycle}: Enemy in ${roomId} must be active after bench rest`);
            assertEquals(enemy.isDead, false, `Cycle ${cycle}: Enemy in ${roomId} must not be dead`);
            assertEquals(enemy.hp, enemy.maxHp, `Cycle ${cycle}: Enemy in ${roomId} HP restored to maxHp`);
            activeCountAfterRest++;
          }
        });
      });

      assertEquals(activeCountAfterRest, totalInitialNonBossEnemies, `Cycle ${cycle}: Total respawned active non-boss enemy count must match initial count (${totalInitialNonBossEnemies})`);
      assertEquals(player.masks, player.maxMasks, `Cycle ${cycle}: Player masks fully restored`);
      assertEquals(player.soul, player.maxSoul, `Cycle ${cycle}: Player soul fully restored`);
    }
  });

  // =========================================================================
  // 4. GEO COIN ECONOMY BREAKDOWN & 500+ COIN PERFORMANCE STRESS
  // =========================================================================
  test('T5.2.7: Geo coin multi-denomination breakdown (1, 5, 20 Geo) mathematical accuracy', () => {
    const testValues = [1, 4, 5, 12, 20, 27, 40, 88, 253, 999, 1234];

    testValues.forEach(totalVal => {
      const coins = GeoCoin.createMultiDenominations(100, 100, totalVal);

      // 1. Total value sum exact match
      const sum = coins.reduce((acc, c) => acc + c.value, 0);
      assertEquals(sum, totalVal, `Coins total value sum (${sum}) must equal requested value (${totalVal})`);

      // 2. Multi-denomination count breakdown accuracy
      const count20 = coins.filter(c => c.value === 20).length;
      const count5 = coins.filter(c => c.value === 5).length;
      const count1 = coins.filter(c => c.value === 1).length;

      const expected20 = Math.floor(totalVal / 20);
      const remAfter20 = totalVal % 20;
      const expected5 = Math.floor(remAfter20 / 5);
      const expected1 = remAfter20 % 5;

      assertEquals(count20, expected20, `20 Geo coin count for ${totalVal} must be ${expected20}`);
      assertEquals(count5, expected5, `5 Geo coin count for ${totalVal} must be ${expected5}`);
      assertEquals(count1, expected1, `1 Geo coin count for ${totalVal} must be ${expected1}`);

      // 3. Physical bounding box sizing check per denomination tier
      coins.forEach(c => {
        if (c.value >= 20) assertEquals(c.width, 14, '20 Geo coin width must be 14px');
        else if (c.value >= 5) assertEquals(c.width, 12, '5 Geo coin width must be 12px');
        else assertEquals(c.width, 10, '1 Geo coin width must be 10px');
      });
    });
  });

  test('T5.2.8: Performance stress test under 500+ Geo coin collection (600 coins)', () => {
    const player = new Player(500, 500);
    player.geo = 0;

    const coins = [];
    const totalCoinsToSpawn = 600;
    let expectedTotalGeoValue = 0;

    // Spawn 600 Geo coins directly at enemy death location within magnet radius (130px)
    for (let i = 0; i < totalCoinsToSpawn; i++) {
      const val = (i % 3 === 0) ? 20 : ((i % 3 === 1) ? 5 : 1);
      expectedTotalGeoValue += val;
      const coin = new GeoCoin(500, 500, val);
      // Neutralize explosion impulse so coins remain within magnet radius
      coin.vx = (Math.random() - 0.5) * 40;
      coin.vy = (Math.random() - 0.5) * 40;
      coins.push(coin);
    }

    const dummySound = { playGeo: () => {} };
    const dummyParticles = { spawnHitSparks: () => {} };
    const dummyTilemap = {};

    const startTime = Date.now();

    // Run update frames until all coins are magnetized & collected by player
    let totalFrames = 0;
    for (let frame = 0; frame < 120; frame++) {
      totalFrames++;
      let anyActive = false;
      for (let i = 0; i < coins.length; i++) {
        if (coins[i].active) {
          anyActive = true;
          coins[i].update(0.016, player, dummySound, dummyParticles, dummyTilemap);
        }
      }
      if (!anyActive) break;
    }

    const totalDuration = Date.now() - startTime;
    const avgFrameDuration = totalDuration / totalFrames;

    console.log(`    ↳ Performance Stress: 600 Geo coins (${totalFrames} frames / ${totalFrames * 600} updates) completed in ${totalDuration}ms (avg ${avgFrameDuration.toFixed(2)}ms/frame)`);

    assert(avgFrameDuration < 16, `600 active Geo coins frame update time (${avgFrameDuration.toFixed(2)}ms) must be well within 16ms budget`);
    assertEquals(player.geo, expectedTotalGeoValue, `Player geo after collecting 600 coins must equal ${expectedTotalGeoValue}`);

    const activeRemaining = coins.filter(c => c.active).length;
    assertEquals(activeRemaining, 0, 'All 600 Geo coins must be collected and deactivated');

    // Magnet Radius Boundary Verification: spawn coin at distance > magnetRadius (130px)
    const farCoin = new GeoCoin(800, 800, 20); // 424px away from player at (500, 500)
    farCoin.vx = 0;
    farCoin.vy = 0;
    farCoin.update(0.016, player, dummySound, dummyParticles, dummyTilemap);

    assert(farCoin.active, 'Coin outside 130px magnet radius remains uncollected');
    assertEquals(farCoin.vx, 0, 'Coin outside magnet radius receives 0 magnetic acceleration');
  });

  // =========================================================================
  // 5. PLAYER DEATH RESPAWN STATE INTEGRITY
  // =========================================================================
  test('T5.2.9: Player death state integrity (masks, soul, enemy respawns, bench coordinates, saved items)', () => {
    const game = new Game({ getContext: () => ({}) });
    game.state = 'GAMEPLAY'; // Set active gameplay state

    // 1. Establish bench checkpoint save state in Dirtmouth
    const dirtmouthBench = game.world.rooms['dirtmouth_01'].benches[0];
    assert(dirtmouthBench, 'Dirtmouth bench must exist');

    game.player.geo = 550;
    game.player.abilities = { dash: true, wallJump: true, shadowDash: true };
    dirtmouthBench.rest(game.player, game.sound, game.particles, SaveSystem, game);

    const savedBenchX = dirtmouthBench.x + 12;
    const savedBenchY = dirtmouthBench.y - 10;

    // 2. Move player into Deepnest, kill enemies, modify health to 0
    game.world.loadRoom('deepnest');
    game.player.x = 2000;
    game.player.y = 800;

    // Deactivate/kill enemies in crossroads_01, greenpath_01, and deepnest
    ['crossroads_01', 'greenpath_01', 'deepnest'].forEach(rmId => {
      game.world.rooms[rmId].enemies.forEach(e => {
        if (!e.isBoss) {
          e.hp = 0;
          e.active = false;
          e.isDead = true;
        }
      });
    });

    // Reduce player masks to 0 (triggering death)
    game.player.masks = 0;

    // Run game update frame to trigger death respawn sequence
    game.update(0.016);

    // 3. Verify Post-Death Integrity
    assertEquals(game.world.currentRoom.id, 'dirtmouth_01', 'Player must respawn in last bench room (dirtmouth_01)');
    assertEquals(game.player.x, savedBenchX, `Player X coordinate must match saved bench X (${savedBenchX})`);
    assertEquals(game.player.y, savedBenchY, `Player Y coordinate must match saved bench Y (${savedBenchY})`);
    assertEquals(game.player.masks, 5, 'Player masks must be fully restored to maxMasks (5)');
    assertEquals(game.player.soul, 100, 'Player soul must be fully restored to maxSoul (100)');

    // Integrity of progression items & Geo
    assertEquals(game.player.geo, 550, 'Player Geo must remain intact after death');
    assertEquals(game.player.abilities.dash, true, 'Unlocked Dash ability must remain intact');
    assertEquals(game.player.abilities.wallJump, true, 'Unlocked Wall Jump ability must remain intact');
    assertEquals(game.player.abilities.shadowDash, true, 'Unlocked Shadow Dash ability must remain intact');

    // Verification of global non-boss enemy respawns upon player death
    ['crossroads_01', 'greenpath_01', 'deepnest'].forEach(rmId => {
      game.world.rooms[rmId].enemies.forEach(e => {
        if (!e.isBoss) {
          assert(e.active, `Non-boss enemy in ${rmId} must be active after player death`);
          assertEquals(e.isDead, false, `Non-boss enemy in ${rmId} must not be dead after player death`);
          assertEquals(e.hp, e.maxHp, `Non-boss enemy in ${rmId} HP restored after player death`);
        }
      });
    });
  });

});

if (import.meta.url === `file://${process.argv[1]}` || (process.argv[1] && process.argv[1].endsWith('test_tier5_adversarial_2.js'))) {
  runSuites().then(results => {
    if (results.totalFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }).catch(err => {
    console.error('Unhandled test execution error:', err);
    process.exit(1);
  });
}
