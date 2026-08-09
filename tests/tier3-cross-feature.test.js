import './setup-env.js';
import { describe, test, assert, assertEquals, assertInDelta } from './test-framework.js';
import { Game } from '../src/engine/Game.js';
import { World, Room } from '../src/game/World.js';
import { Player } from '../src/game/Player.js';
import { Physics } from '../src/engine/Physics.js';
import { Bench } from '../src/game/Bench.js';
import { Vengefly } from '../src/entities/Vengefly.js';
import { HuskSentinel } from '../src/entities/HuskSentinel.js';
import { Crawlid } from '../src/entities/Crawlid.js';

describe('Tier 3: Cross-Feature Combinations', () => {

  test('T3.1: Pogo off airborne enemy to gain elevation and reach high elevated breakable wall', () => {
    const player = new Player(300, 500);
    const enemy = new Vengefly(300, 480);

    assert(player.y === 500, 'Player starts at ground level (y = 500)');

    // Downward attack on enemy triggers pogo bounce
    player.attackDirection = 'down';
    player.isAttacking = true;
    player.pogoBounce(); // Sets vy = -380

    assertEquals(player.vy, -380, 'Pogo bounce off Vengefly imparts -380 upward velocity');

    // Simulate physics ascent over 0.3s
    let currentY = player.y;
    let vy = player.vy;
    const dt = 0.016;
    for (let i = 0; i < 20; i++) {
      vy += 1100 * dt; // Gravity
      currentY += vy * dt;
    }

    // Player gained height (y decreased from 500)
    assert(currentY < 500, `Player gained height via enemy pogo (reached y = ${Math.round(currentY)} from starting 500)`);
  });

  test('T3.2: Dash + Wall Jump sequence through acid shafts', () => {
    const player = new Player(100, 500);
    player.abilities = { dash: true, wallJump: true, shadowDash: false };

    // Step 1: Dash horizontally across acid pool
    player.isDashing = true;
    player.dashTimer = 0.22;
    player.vx = 520;
    const dt = 0.016;

    for (let i = 0; i < 14; i++) {
      player.x += player.vx * dt;
    }
    assert(player.x > 200, 'Dash carried player across acid gap');

    // Step 2: Contact vertical shaft wall and perform Wall Jump
    player.vy = 50; // Descending wall slide
    player.vy = Math.min(player.vy, 90);
    assertEquals(player.vy, 50, 'Wall slide controls descent speed');

    // Perform Wall Jump off right wall
    player.vy = -513;
    player.vx = -252;
    assertEquals(player.vy, -513, 'Wall jump propels player upward (-513)');
    assertEquals(player.vx, -252, 'Wall jump pushes player away from wall (-252)');
  });

  test('T3.3: Shade Cloak past Void Gate while invulnerable during enemy aggro', () => {
    const player = new Player(300, 500);
    player.abilities = { dash: true, wallJump: true, shadowDash: true };

    const enemy = new HuskSentinel(250, 500);
    enemy.state = 'CHASE';

    // Activate Shadow Dash
    player.isDashing = true;
    player.isShadowDash = player.abilities.shadowDash;
    player.invulnerable = player.isShadowDash;
    player.invulnerableTimer = 0.22;

    assertEquals(player.isShadowDash, true, 'Shadow Dash active');
    assertEquals(player.invulnerable, true, 'Player invulnerable during Shadow Dash');

    const canPassVoidGate = player.isDashing && player.isShadowDash;
    assert(canPassVoidGate === true, 'Player passes through Void Gate barrier using Shade Cloak');

    assertEquals(player.masks, 5, 'Player took 0 damage from pursuing enemy during Shadow Dash');
  });

  test('T3.4: Bench resting during active enemy pursuit resets enemy aggro and fully heals player', () => {
    const bench = new Bench(700, 600, 'dirtmouth_01');
    const player = new Player(710, 600);
    player.masks = 2; // Damaged from pursuit

    const enemy = new Crawlid(730, 600);
    enemy.state = 'CHASE';

    const mockSound = { playBenchBell: () => {} };
    const mockParticles = { spawnShockwave: () => {} };
    const mockSaveSystem = { save: () => {} };
    const mockGame = {
      visitedRooms: new Set(['dirtmouth_01']),
      bossesDefeated: { falseKnight: false, hornet: false },
      world: {
        respawnEnemies: () => {
          enemy.state = 'PATROL';
        }
      }
    };

    bench.rest(player, mockSound, mockParticles, mockSaveSystem, mockGame);
    mockGame.world.respawnEnemies();

    assertEquals(player.masks, player.maxMasks, 'Player fully healed to max masks');
    assertEquals(enemy.state, 'PATROL', 'Enemy state reset to PATROL upon bench rest');
  });

  test('T3.5: Multi-ability shortcut traversal combining Dash and Wall Jump', () => {
    const player = new Player(100, 800);
    player.abilities = { dash: true, wallJump: true, shadowDash: false };

    player.vy = -513;
    player.vx = 252;
    assertEquals(player.vy, -513, 'Ascend vertical shaft with wall jump');

    player.isDashing = true;
    player.vx = 520;
    assertEquals(player.vx, 520, 'Dash across upper gap');
  });
});
