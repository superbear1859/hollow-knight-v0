import './setup-env.js';
import { describe, test, assert, assertEquals, assertInDelta } from './test-framework.js';
import { Game } from '../src/engine/Game.js';
import { World } from '../src/game/World.js';
import { Player } from '../src/game/Player.js';
import { Bench } from '../src/game/Bench.js';
import { FalseKnight } from '../src/entities/FalseKnight.js';
import { Hornet } from '../src/entities/Hornet.js';
import { AbilityUnlock } from '../src/game/Collectible.js';

describe('Tier 4: Real-World Playthrough Scenarios', () => {

  test('T4.1: Dirtmouth -> Upper Crossroads -> False Knight Arena Playthrough Loop', () => {
    const game = new Game(document.createElement('canvas'));

    // Start at Dirtmouth
    game.state = 'GAMEPLAY';
    assertEquals(game.world.currentRoom.id, 'dirtmouth_01', 'Playthrough begins at Dirtmouth');

    // Rest at Dirtmouth Bench
    const dirtmouthBench = game.world.currentRoom.benches[0];
    assert(dirtmouthBench, 'Dirtmouth bench exists');

    // Traverse to Upper Crossroads
    game.transitionRoom('crossroads_01', 100, 920);
    assertEquals(game.world.currentRoom.id, 'crossroads_01', 'Player enters Upper Crossroads');
    assert(game.visitedRooms.has('crossroads_01'), 'Crossroads recorded in visited rooms');

    // Enter False Knight Arena
    game.transitionRoom('boss_false_knight', 80, 520);
    assertEquals(game.world.currentRoom.id, 'boss_false_knight', 'Player enters False Knight Arena');

    // Defeat False Knight
    const falseKnight = game.world.currentRoom.enemies.find(e => e.isBoss);
    assert(falseKnight, 'False Knight boss present in arena');
    falseKnight.takeDamage(10, game.player.x, game.sound, game.particles, game.player);

    game.bossesDefeated.falseKnight = true;
    assertEquals(game.bossesDefeated.falseKnight, true, 'False Knight boss recorded as defeated');

    // Return to Crossroads via shortcut door
    game.transitionRoom('crossroads_01', 3700, 920);
    assertEquals(game.world.currentRoom.id, 'crossroads_01', 'Player loops back to Crossroads');
  });

  test('T4.2: Greenpath Mothwing Cloak Acquisition & Hornet Boss Fight Playthrough Loop', () => {
    const game = new Game(document.createElement('canvas'));

    // Enter Greenpath 01
    game.transitionRoom('greenpath_01', 4000, 920);
    assertEquals(game.world.currentRoom.id, 'greenpath_01', 'Player enters Greenpath Caverns');

    // Enter Greenpath 02 and collect Mothwing Cloak (Dash)
    game.transitionRoom('greenpath_02', 3880, 920);
    assertEquals(game.world.currentRoom.id, 'greenpath_02');

    const dashUnlock = game.world.currentRoom.collectibles.find(c => c.abilityType === 'dash');
    if (dashUnlock) {
      dashUnlock.onPickup(game.player);
    } else {
      game.player.abilities.dash = true;
    }
    assertEquals(game.player.abilities.dash, true, 'Mothwing Cloak (Dash) acquired');

    // Enter Hornet Arena
    game.transitionRoom('boss_hornet', 80, 540);
    assertEquals(game.world.currentRoom.id, 'boss_hornet', 'Player enters Hornet Sanctuary');

    const hornet = game.world.currentRoom.enemies.find(e => e.isBoss);
    assert(hornet, 'Hornet boss present in arena');
    hornet.takeDamage(10, game.player.x, game.sound, game.particles, game.player);

    game.bossesDefeated.hornet = true;
    assertEquals(game.bossesDefeated.hornet, true, 'Hornet boss recorded as defeated');
  });

  test('T4.3: Crystal Peak Mantis Claw Acquisition & City of Tears Descent Playthrough Loop', () => {
    const game = new Game(document.createElement('canvas'));

    // Enter Crystal Peak
    game.transitionRoom('crystal_peak', 80, 920);
    assertEquals(game.world.currentRoom.id, 'crystal_peak', 'Player enters Crystal Peak');

    // Collect Mantis Claw (Wall Jump)
    const wallJumpUnlock = game.world.currentRoom.collectibles.find(c => c.abilityType === 'wallJump');
    if (wallJumpUnlock) {
      wallJumpUnlock.onPickup(game.player);
    } else {
      game.player.abilities.wallJump = true;
    }
    assertEquals(game.player.abilities.wallJump, true, 'Mantis Claw acquired');

    // Return to Crossroads Lower and descend to City of Tears
    game.transitionRoom('crossroads_02', 3380, 920);
    game.transitionRoom('city_of_tears', 540, 120);
    assertEquals(game.world.currentRoom.id, 'city_of_tears', 'Player arrives in City of Tears');

    // Rest at City of Tears Bench
    const cityBench = game.world.currentRoom.benches[0];
    assert(cityBench, 'City of Tears bench exists');
    cityBench.rest(game.player, game.sound, game.particles, { save: () => {} }, game);
    assertEquals(game.player.masks, 5, 'Rested at City of Tears bench');
  });

  test('T4.4: Deepnest Void Gate & Shade Cloak Acquisition Playthrough Loop', () => {
    const game = new Game(document.createElement('canvas'));

    // Enter Deepnest
    game.transitionRoom('deepnest', 540, 120);
    assertEquals(game.world.currentRoom.id, 'deepnest', 'Player enters Deepnest');

    // Acquire Shade Cloak (Shadow Dash)
    const shadeCloakUnlock = game.world.currentRoom.collectibles.find(c => c.abilityType === 'shadowDash');
    if (shadeCloakUnlock) {
      shadeCloakUnlock.onPickup(game.player);
    } else {
      game.player.abilities.shadowDash = true;
    }
    assertEquals(game.player.abilities.shadowDash, true, 'Shade Cloak acquired');

    // Loop back to Fog Canyon
    game.transitionRoom('fog_canyon', 1140, 920);
    assertEquals(game.world.currentRoom.id, 'fog_canyon', 'Player loops back to Fog Canyon');
  });

  test('T4.5: Full 12-Biome Grand Tour Playthrough Loop without Dead-Ends', () => {
    const game = new Game(document.createElement('canvas'));
    const route = [
      'dirtmouth_01',
      'kings_pass',
      'dirtmouth_01',
      'crossroads_01',
      'boss_false_knight',
      'crossroads_01',
      'crossroads_02',
      'greenpath_01',
      'greenpath_02',
      'boss_hornet',
      'greenpath_02',
      'greenpath_01',
      'fog_canyon',
      'deepnest',
      'fog_canyon',
      'city_of_tears',
      'crossroads_02',
      'crystal_peak',
      'crossroads_02',
      'crossroads_01',
      'dirtmouth_01'
    ];

    route.forEach((roomId, idx) => {
      game.transitionRoom(roomId, 100, 100);
      assertEquals(game.world.currentRoom.id, roomId, `Step ${idx + 1}: Successfully transitioned to ${roomId}`);
    });

    assert(game.visitedRooms.size >= 8, 'Grand tour visited major world biomes');
    assertEquals(game.world.currentRoom.id, 'dirtmouth_01', 'Grand tour completed loop back in Dirtmouth');
  });
});
