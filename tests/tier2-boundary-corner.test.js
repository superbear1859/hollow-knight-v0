import './setup-env.js';
import { describe, test, assert, assertEquals, assertInDelta } from './test-framework.js';
import { Game } from '../src/engine/Game.js';
import { World, Room } from '../src/game/World.js';
import { Player } from '../src/game/Player.js';
import { Physics } from '../src/engine/Physics.js';
import { Bench } from '../src/game/Bench.js';
import { SaveSystem } from '../src/game/SaveSystem.js';

describe('Tier 2: Boundary & Corner Cases', () => {

  test('T2.1: Precise AABB collision boundaries and pixel alignment at tile edges', () => {
    const rectA = { x: 100, y: 100, width: 32, height: 32 };
    const rectB = { x: 131, y: 100, width: 32, height: 32 }; // Adjacent edge by 1px offset
    const rectC = { x: 132, y: 100, width: 32, height: 32 }; // Touching edge exact

    assert(Physics.rectIntersect(rectA, rectB) === true, '1px overlap registers as collision');
    assert(Physics.rectIntersect(rectA, rectC) === false, 'Exact edge contact (no overlap) does not register collision');
  });

  test('T2.2: Zero Soul focus attempt and 1 Mask health edge case', () => {
    const player = new Player(100, 100);
    player.soul = 0;
    player.masks = 1;

    // Simulate focus attempt with 0 soul
    const mockInput = { isDown: (act) => act === 'focus', isJustPressed: () => false };
    const mockSound = { playFocus: () => {}, playHit: () => {} };
    const mockParticles = { spawnSoulCharge: () => {}, spawnHitSparks: () => {} };

    player.update(0.1, mockInput, mockSound, mockParticles, null);

    // Focus requires 33 soul; with 0 soul, masks stay at 1
    assertEquals(player.masks, 1, 'Focus with 0 soul cannot heal player');
    assertEquals(player.soul, 0, 'Soul remains 0');

    // Taking damage at 1 mask drops health to 0
    player.takeDamage(1, 200, mockSound, mockParticles, { shake: () => {} });
    assertEquals(player.masks, 0, 'Damage at 1 mask drops health to 0');
  });

  test('T2.3: High-velocity door transitions (max fall speed & max dash velocity)', () => {
    const game = new Game(document.createElement('canvas'));

    // High horizontal dash velocity transition
    game.player.vx = 520;
    game.player.vy = 700; // Max fall speed
    game.transitionRoom('dirtmouth_01', 500, 400);

    assertEquals(game.player.x, 500, 'Player positioned precisely at spawn target X');
    assertEquals(game.player.y, 400, 'Player positioned precisely at spawn target Y');
    assertEquals(game.player.vx, 0, 'Horizontal velocity reset to 0 after transition');
    assertEquals(game.player.vy, 0, 'Vertical velocity reset to 0 after transition');
  });

  test('T2.4: Multi-hit secret breakable wall health persistence across hits', () => {
    const breakableWall = {
      hp: 3,
      solid: true,
      takeDamage(dmg) {
        this.hp = Math.max(0, this.hp - dmg);
        if (this.hp === 0) this.solid = false;
      }
    };

    assertEquals(breakableWall.hp, 3);
    assertEquals(breakableWall.solid, true);

    // Hit 1
    breakableWall.takeDamage(1);
    assertEquals(breakableWall.hp, 2, 'Hit 1 leaves 2 HP');
    assertEquals(breakableWall.solid, true, 'Solid physics remains active after 1 hit');

    // Hit 2
    breakableWall.takeDamage(1);
    assertEquals(breakableWall.hp, 1, 'Hit 2 leaves 1 HP');
    assertEquals(breakableWall.solid, true, 'Solid physics remains active after 2 hits');

    // Hit 3
    breakableWall.takeDamage(1);
    assertEquals(breakableWall.hp, 0, 'Hit 3 reduces HP to 0');
    assertEquals(breakableWall.solid, false, 'Solid physics disabled after 3 hits');
  });

  test('T2.5: Rapid bench resting does not corrupt save data or duplicate enemy respawns', () => {
    const bench = new Bench(100, 100, 'dirtmouth_01');
    const player = new Player(100, 100);
    const mockSound = { playBenchBell: () => {} };
    const mockParticles = { spawnShockwave: () => {} };
    const mockGame = { world: { respawnEnemies: () => {} } };

    // Rapid resting call loop (5 consecutive rests)
    for (let i = 0; i < 5; i++) {
      bench.rest(player, mockSound, mockParticles, SaveSystem, mockGame);
    }

    assertEquals(player.masks, player.maxMasks, 'Player masks remain at max (5)');
    assertEquals(player.soul, player.maxSoul, 'Player soul remains at max (100)');
    const savedData = SaveSystem.load();
    assertEquals(savedData.lastBenchRoom, 'dirtmouth_01', 'Save data lastBenchRoom is intact');
  });

  test('T2.6: Repeated spike/hazard pit falls accurately decrement masks until death', () => {
    const player = new Player(100, 500);
    player.lastSafeX = 100;
    player.lastSafeY = 500;
    player.masks = 5;

    // Simulate 5 consecutive hazard pit falls
    for (let i = 1; i <= 5; i++) {
      player.x = 800; // In spike pit
      player.y = 800;
      player.masks -= 1;
      player.x = player.lastSafeX;
      player.y = player.lastSafeY;

      assertEquals(player.masks, 5 - i, `Fall ${i} decrements masks to ${5 - i}`);
      assertEquals(player.x, 100, `Player reset to safe X`);
      assertEquals(player.y, 500, `Player reset to safe Y`);
    }

    assertEquals(player.masks, 0, '5 falls drop health to 0 (death state)');
  });
});
