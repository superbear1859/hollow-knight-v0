import './setup-env.js';
import { describe, test, assert, assertEquals, assertInDelta, runSuites } from './test-framework.js';
import { CrumblingPlatform } from '../src/entities/CrumblingPlatform.js';
import { BreakableWall } from '../src/entities/BreakableWall.js';
import { VoidGate } from '../src/entities/VoidGate.js';
import { Player } from '../src/game/Player.js';
import { Physics } from '../src/engine/Physics.js';
import { World, Room } from '../src/game/World.js';
import { GeoCoin, AbilityUnlock } from '../src/game/Collectible.js';

// Mocks for particle, sound, and camera effects
const mockSound = {
  playHit: () => {},
  playPogo: () => {},
  playSlash: () => {},
  playDash: () => {},
  playGeo: () => {}
};

const mockParticles = {
  spawnHitSparks: () => {},
  spawnDust: () => {},
  spawnShockwave: () => {},
  spawnSlashArc: () => {},
  add: () => {}
};

const mockCamera = {
  shake: () => {},
  follow: () => {},
  setBounds: () => {},
  getView: () => ({ x: 0, y: 0, width: 960, height: 540 })
};

const mockInput = (keys = {}) => ({
  isDown: (k) => !!keys[k],
  isJustPressed: (k) => !!keys[k],
  update: () => {}
});

describe('Tier 5 Adversarial Stress Suite 1: Platforming & Physics Mechanics', () => {

  // -------------------------------------------------------------------
  // SCENARIO 1: CRUMBLING PLATFORM RAPID RE-STEPPING & STATE TRANSITIONS
  // -------------------------------------------------------------------
  test('A1.1: CrumblingPlatform ignores rapid re-stepping during SHAKING phase without resetting timer', () => {
    const platform = new CrumblingPlatform(100, 200, 64, 16);
    assertEquals(platform.state, 'IDLE', 'Initial state must be IDLE');
    assertEquals(platform.solid, true, 'Initially platform is solid');

    // First step triggers shaking
    platform.onStepOn();
    assertEquals(platform.state, 'SHAKING', 'First step transitions to SHAKING');
    assertEquals(platform.shakeTimer, 0.4, 'Shake timer initialized to 0.4s');

    // Simulate 0.1s passing
    platform.update(0.1, null, mockParticles, mockSound);
    assertInDelta(platform.shakeTimer, 0.3, 0.001, 'Shake timer should be ~0.3s after 0.1s update');

    // Rapid re-stepping (50 rapid calls to onStepOn) during SHAKING
    for (let i = 0; i < 50; i++) {
      platform.onStepOn();
    }

    assertEquals(platform.state, 'SHAKING', 'State remains SHAKING under rapid re-stepping');
    assertInDelta(platform.shakeTimer, 0.3, 0.001, 'shakeTimer is NOT reset or extended by re-stepping');

    // Elapse remaining shake time (0.31s)
    platform.update(0.31, null, mockParticles, mockSound);
    assertEquals(platform.state, 'CRUMBLED', 'Platform transitions to CRUMBLED when shake timer expires');
    assertEquals(platform.solid, false, 'Platform becomes non-solid when CRUMBLED');
  });

  test('A1.2: CrumblingPlatform rapid re-stepping during CRUMBLED phase does not alter respawn timer', () => {
    const platform = new CrumblingPlatform(100, 200, 64, 16);
    platform.onStepOn();
    platform.update(0.41, null, mockParticles, mockSound); // Crumble

    assertEquals(platform.state, 'CRUMBLED');
    assertEquals(platform.solid, false);

    // Simulate 1.0s of respawn time passing
    platform.update(1.0, null, mockParticles, mockSound);
    assertInDelta(platform.respawnTimer, 2.0, 0.001, 'Respawn timer should be ~2.0s remaining');

    // Rapid re-stepping (50 calls) while crumbled
    for (let i = 0; i < 50; i++) {
      platform.onStepOn();
    }

    assertEquals(platform.state, 'CRUMBLED', 'State remains CRUMBLED');
    assertEquals(platform.solid, false, 'Solid remains false while CRUMBLED');
    assertInDelta(platform.respawnTimer, 2.0, 0.001, 'Respawn timer is unchanged by re-stepping during CRUMBLED');

    // Elapse remaining respawn time (2.01s)
    platform.update(2.01, null, mockParticles, mockSound);
    assertEquals(platform.state, 'IDLE', 'Platform respawns back to IDLE');
    assertEquals(platform.solid, true, 'Platform solid restored to true after respawn');
  });

  test('A1.3: Player standing auto-detection and player falling through CRUMBLED platform', () => {
    const platform = new CrumblingPlatform(100, 200, 64, 16);
    const room = new Room('test_room', 'Test', 'crossroads', 20, 20);
    room.platforms.push(platform);

    const player = new Player(110, 162); // Feet at y = 200
    player.grounded = true;

    // Platform update auto-detects player standing on top
    platform.update(0.016, player, mockParticles, mockSound);
    assertEquals(platform.state, 'SHAKING', 'Auto-detect transitions IDLE platform to SHAKING when player stands on top');

    // Elapse shake timer so platform crumbles
    platform.update(0.4, player, mockParticles, mockSound);
    assertEquals(platform.state, 'CRUMBLED');
    assertEquals(platform.solid, false);

    // Physics check: player should fall through non-solid crumbled platform
    player.vy = 100;
    Physics.checkTileCollision(player, room, 0.016);
    assert(player.y > 162, 'Player falls through crumbled non-solid platform');
    assertEquals(player.grounded, false, 'Player is no longer grounded after platform crumbles');
  });

  test('A1.4: Multi-cycle crumbling platform lifecycle reproducibility', () => {
    const platform = new CrumblingPlatform(100, 200, 64, 16);

    for (let cycle = 1; cycle <= 3; cycle++) {
      assertEquals(platform.state, 'IDLE', `Cycle ${cycle}: starts IDLE`);
      assertEquals(platform.solid, true, `Cycle ${cycle}: starts solid`);

      platform.onStepOn();
      assertEquals(platform.state, 'SHAKING', `Cycle ${cycle}: step transitions to SHAKING`);

      platform.update(0.41, null, mockParticles, mockSound);
      assertEquals(platform.state, 'CRUMBLED', `Cycle ${cycle}: crumbles after shake time`);
      assertEquals(platform.solid, false, `Cycle ${cycle}: becomes non-solid when crumbled`);

      platform.update(3.01, null, mockParticles, mockSound);
      assertEquals(platform.state, 'IDLE', `Cycle ${cycle}: respawns to IDLE`);
      assertEquals(platform.solid, true, `Cycle ${cycle}: restores solid after respawn`);
    }
  });


  // -------------------------------------------------------------------
  // SCENARIO 2: BREAKABLE WALL MULTI-HIT PERSISTENCE & REWARD NON-DUPLICATION
  // -------------------------------------------------------------------
  test('A2.1: BreakableWall invulnerability timer prevents multi-hit damage melting in same tick', () => {
    const room = new Room('test_wall', 'Test Wall Room', 'crossroads', 20, 20);
    const wall = new BreakableWall(300, 400, 32, 96, 3, { type: 'GEO_CACHE', count: 5 });
    room.walls.push(wall);

    assertEquals(wall.hp, 3, 'Initial wall HP is 3');

    // First hit succeeds
    const hit1 = wall.takeDamage(1, mockSound, mockParticles, room);
    assertEquals(hit1, false, 'First hit returns false (wall not destroyed yet)');
    assertEquals(wall.hp, 2, 'HP decremented to 2');
    assert(wall.invulnerableTimer > 0, 'Invulnerability timer activated');

    // Rapid secondary hits within 0.15s invulnerability window
    for (let i = 0; i < 10; i++) {
      const rapidHit = wall.takeDamage(1, mockSound, mockParticles, room);
      assertEquals(rapidHit, false, `Rapid hit ${i+1} must be rejected during invulnerability`);
    }

    assertEquals(wall.hp, 2, 'HP remains 2 despite 10 rapid hit attempts');

    // Advance time past invulnerability window (0.16s)
    wall.update(0.16);
    assertEquals(wall.invulnerableTimer <= 0, true, 'Invulnerability timer expired');

    // Second hit succeeds
    const hit2 = wall.takeDamage(1, mockSound, mockParticles, room);
    assertEquals(hit2, false, 'Second hit returns false');
    assertEquals(wall.hp, 1, 'HP decremented to 1');
  });

  test('A2.2: BreakableWall destruction and reward non-duplication under extreme hit spam', () => {
    const room = new Room('test_wall_reward', 'Test Reward Room', 'crossroads', 20, 20);
    const wall = new BreakableWall(300, 400, 32, 96, 3, { type: 'GEO_CACHE', count: 5 });
    room.walls.push(wall);

    // Hit 1 & cooldown
    wall.takeDamage(1, mockSound, mockParticles, room);
    wall.update(0.16);

    // Hit 2 & cooldown
    wall.takeDamage(1, mockSound, mockParticles, room);
    wall.update(0.16);

    // Hit 3 (Destroying hit)
    const fatalHit = wall.takeDamage(1, mockSound, mockParticles, room);
    assertEquals(fatalHit, true, 'Fatal hit returns true (destroyed)');
    assertEquals(wall.hp, 0, 'HP reaches 0');
    assertEquals(wall.isDestroyed, true, 'isDestroyed set to true');
    assertEquals(wall.solid, false, 'Wall becomes non-solid when destroyed');
    assertEquals(wall.active, false, 'Wall marked inactive');

    // Verify total Geo value spawned equals 5 (createMultiDenominations creates 1 coin of value 5)
    const totalGeoValue = room.collectibles.reduce((sum, item) => sum + (item.value || 0), 0);
    assertEquals(totalGeoValue, 5, 'Exactly 5 Geo total value spawned on destruction');
    const initialCollectibleCount = room.collectibles.length;

    // Adversarial attack: Spam takeDamage 100 times after destruction
    for (let i = 0; i < 100; i++) {
      wall.update(0.16); // Even if invulnerability expires
      const spamHit = wall.takeDamage(1, mockSound, mockParticles, room);
      assertEquals(spamHit, false, 'Post-destruction hit returns false');
    }

    assertEquals(room.collectibles.length, initialCollectibleCount, 'Collectibles count remains unchanged (no reward duplication)');
    const finalGeoValue = room.collectibles.reduce((sum, item) => sum + (item.value || 0), 0);
    assertEquals(finalGeoValue, 5, 'Total Geo value remains EXACTLY 5');
  });

  test('A2.3: Overkill single-hit damage destroys wall cleanly and spawns reward once', () => {
    const room = new Room('test_overkill', 'Overkill Room', 'crossroads', 20, 20);
    const wall = new BreakableWall(300, 400, 32, 96, 3, { type: 'GEO_CACHE', count: 5 });
    room.walls.push(wall);

    const overkillHit = wall.takeDamage(100, mockSound, mockParticles, room);
    assertEquals(overkillHit, true, 'Single 100-damage hit destroys 3-HP wall');
    assertEquals(wall.isDestroyed, true);

    const totalGeoValue = room.collectibles.reduce((sum, item) => sum + (item.value || 0), 0);
    assertEquals(totalGeoValue, 5, 'Geo cache total value 5 spawned exactly once');

    // Follow-up hit
    const followUp = wall.takeDamage(100, mockSound, mockParticles, room);
    assertEquals(followUp, false, 'Follow up overkill hit rejected');

    const finalGeoValue = room.collectibles.reduce((sum, item) => sum + (item.value || 0), 0);
    assertEquals(finalGeoValue, 5, 'No extra rewards spawned');
  });

  test('A2.4: Entity secret reward non-duplication on wall destruction', () => {
    const room = new Room('test_entity_reward', 'Reward Room', 'crossroads', 20, 20);
    const abilityPedestal = new AbilityUnlock(316, 400, 'dash', 'Mothwing Cloak (Dash)');
    const wall = new BreakableWall(300, 400, 32, 96, 1, abilityPedestal);
    room.walls.push(wall);

    wall.takeDamage(1, mockSound, mockParticles, room);
    assertEquals(room.collectibles.length, 1, 'Ability pedestal spawned in room collectibles');
    assertEquals(room.collectibles[0], abilityPedestal);

    // Spam calls
    wall.takeDamage(1, mockSound, mockParticles, room);
    assertEquals(room.collectibles.length, 1, 'Ability pedestal is not duplicated');
  });


  // -------------------------------------------------------------------
  // SCENARIO 3: HAZARD PIT RESPAWN COORDINATE PRECISION UNDER EXTREME FALL VELOCITIES
  // -------------------------------------------------------------------
  test('A3.1: Hazard pit respawn restores exact lastSafeX/lastSafeY and zeros velocity at vy = 700', () => {
    const room = new Room('hazard_prec', 'Hazard Precision Room', 'crossroads', 40, 30);
    room.fillBox(0, 25, 40, 5, { solid: true, color: '#161d28', type: 'stone' });
    // Spike pit at (15, 24)
    room.setTile(15, 24, { solid: true, hazard: true, type: 'spike', color: '#aa2222' });

    const player = new Player(64, 24 * 32 - 34);
    player.lastSafeX = 64;
    player.lastSafeY = 24 * 32 - 34;
    player.masks = 5;

    // Ground player on safe tile (2, 24) to establish verified safe checkpoint
    Physics.checkTileCollision(player, room, 0.016);
    player.update(0.016, mockInput(), mockSound, mockParticles, room, mockCamera);
    assertEquals(player.lastSafeX, 64, 'Safe ground checkpoint saved at X = 64');

    // Simulate falling into spike pit at extreme terminal fall velocity vy = 700
    player.x = 15 * 32;
    player.y = 24 * 32 - 40;
    player.vx = 150;
    player.vy = 700; // Extreme fall velocity
    player.invulnerable = false;

    player.update(0.016, mockInput(), mockSound, mockParticles, room, mockCamera);

    assertEquals(player.masks, 4, 'Spike collision inflicts 1 damage (masks 5 -> 4)');
    assertEquals(player.x, 64, 'Player position restored to EXACT lastSafeX (64)');
    assertEquals(player.y, 24 * 32 - 34, 'Player position restored to EXACT lastSafeY');
    assertEquals(player.vx, 0, 'Horizontal velocity zeroed after hazard respawn');
    assertEquals(player.vy, 0, 'Vertical velocity zeroed after hazard respawn');
    assertEquals(player.grounded, true, 'Player grounded state set to true on safe checkpoint');
  });

  test('A3.2: Hazard pit fall does not pollute or overwrite lastSafe checkpoint coordinates', () => {
    const room = new Room('hazard_pollute', 'Pollution Room', 'crossroads', 40, 30);
    room.fillBox(0, 25, 40, 5, { solid: true, color: '#161d28', type: 'stone' });
    room.setTile(20, 24, { solid: true, hazard: true, type: 'spike', color: '#aa2222' });

    const player = new Player(128, 24 * 32 - 34);
    player.lastSafeX = 128;
    player.lastSafeY = 24 * 32 - 34;

    // Drop player onto spike tile with vy = 700 multiple times
    for (let drop = 1; drop <= 3; drop++) {
      player.x = 20 * 32;
      player.y = 24 * 32 - 10;
      player.vy = 700;
      player.invulnerable = false;

      player.update(0.016, mockInput(), mockSound, mockParticles, room, mockCamera);

      assertEquals(player.x, 128, `Drop ${drop}: player restored to lastSafeX = 128`);
      assertEquals(player.lastSafeX, 128, `Drop ${drop}: lastSafeX remains unpolluted at 128`);
    }
  });

  test('A3.3: Crumbling platform standing does not update lastSafe checkpoint', () => {
    const room = new Room('hazard_crumble_safe', 'Crumble Safe Room', 'crossroads', 40, 30);
    room.fillBox(0, 25, 40, 5, { solid: true, color: '#161d28', type: 'stone' });

    const platform = new CrumblingPlatform(300, 24 * 32 - 32, 64, 16);
    room.platforms.push(platform);

    const player = new Player(64, 24 * 32 - 34);
    player.lastSafeX = 64;
    player.lastSafeY = 24 * 32 - 34;

    // Step on crumbling platform so it becomes SHAKING
    platform.onStepOn();
    assertEquals(platform.state, 'SHAKING');

    // Move player onto crumbling platform while grounded
    player.x = 310;
    player.y = 24 * 32 - 32 - 34;
    player.grounded = true;

    player.update(0.016, mockInput(), mockSound, mockParticles, room, mockCamera);

    // lastSafeX/lastSafeY should NOT update to 310 while on a shaking crumbling platform!
    assertEquals(player.lastSafeX, 64, 'lastSafeX is NOT updated while standing on a shaking crumbling platform');
  });

  test('A3.4: Sequential spike hazard falls until death (5 masks -> 0 masks)', () => {
    const room = new Room('hazard_death', 'Hazard Death Room', 'crossroads', 40, 30);
    room.fillBox(0, 25, 40, 5, { solid: true, color: '#161d28', type: 'stone' });
    room.setTile(10, 24, { solid: true, hazard: true, type: 'spike', color: '#aa2222' });

    const player = new Player(64, 24 * 32 - 34);
    player.lastSafeX = 64;
    player.lastSafeY = 24 * 32 - 34;
    player.masks = 5;

    for (let hit = 1; hit <= 5; hit++) {
      player.x = 10 * 32;
      player.y = 24 * 32 - 10;
      player.vy = 700;
      player.invulnerable = false;

      player.update(0.016, mockInput(), mockSound, mockParticles, room, mockCamera);
      assertEquals(player.masks, 5 - hit, `After ${hit} hazard hits, masks = ${5 - hit}`);
      assertEquals(player.x, 64, `Restored to safe X`);
    }

    assertEquals(player.masks, 0, 'Player health depleted to 0 masks');
  });


  // -------------------------------------------------------------------
  // SCENARIO 4: ACID POGO JUMP TIMING GRACE WINDOWS & BOUNCE CHAINS
  // -------------------------------------------------------------------
  test('A4.1: pogoBounce() initializes exact vertical velocity vy = -380 and grace timer 0.3s', () => {
    const player = new Player(200, 300);
    player.pogoBounce();

    assertEquals(player.vy, -380, 'pogoBounce() sets vy = -380');
    assertInDelta(player.pogoMitigatedTimer, 0.3, 0.001, 'pogoBounce() sets pogoMitigatedTimer = 0.3s');
  });

  test('A4.2: Acid pogo grace window prevents hazard damage while touching acid surface', () => {
    const acidRoom = new Room('acid_grace', 'Acid Grace Room', 'greenpath', 30, 20);
    acidRoom.fillBox(0, 15, 30, 5, { solid: false, acid: true, type: 'acid', color: '#24a058' });

    const player = new Player(5 * 32, 15 * 32 - 20);
    player.lastSafeX = 64;
    player.lastSafeY = 100;
    player.masks = 5;

    // Trigger pogo bounce (down-slash on acid)
    player.pogoBounce();
    assertEquals(player.pogoMitigatedTimer, 0.3);

    // Update for 0.15s while player overlaps acid bounds
    for (let i = 0; i < 9; i++) {
      player.update(0.016, mockInput(), mockSound, mockParticles, acidRoom, mockCamera);
    }

    // Player should remain unharmed during grace window
    assertEquals(player.masks, 5, 'Player masks remain 5 (no damage during acid pogo grace window)');
    assertEquals(player.x, 5 * 32, 'Player position is NOT reset to lastSafeX during grace window');
  });

  test('A4.3: Acid collision inflicts damage and respawns player after grace window expires', () => {
    const acidRoom = new Room('acid_expire', 'Acid Expire Room', 'greenpath', 30, 20);
    acidRoom.fillBox(0, 15, 30, 5, { solid: false, acid: true, type: 'acid', color: '#24a058' });

    const player = new Player(5 * 32, 15 * 32 - 10);
    player.lastSafeX = 64;
    player.lastSafeY = 100;
    player.masks = 5;

    // Pogo bounce, then elapse 0.35s so grace window expires while still touching acid
    player.pogoBounce();
    player.update(0.35, mockInput(), mockSound, mockParticles, acidRoom, mockCamera);

    // Touch acid after grace window expired
    assertEquals(player.pogoMitigatedTimer <= 0, true, 'Grace timer expired');
    assertEquals(player.masks, 4, 'Touching acid after grace window expiration inflicts damage (5 -> 4)');
    assertEquals(player.x, 64, 'Player hazard respawned to lastSafeX');
  });

  test('A4.4: 10-bounce consecutive acid pogo chain maintains zero damage', () => {
    const acidRoom = new Room('acid_chain', 'Acid Chain Room', 'greenpath', 40, 20);
    acidRoom.fillBox(0, 15, 40, 5, { solid: false, acid: true, type: 'acid', color: '#24a058' });

    const player = new Player(10 * 32, 15 * 32 - 20);
    player.lastSafeX = 64;
    player.lastSafeY = 100;
    player.masks = 5;

    for (let bounce = 1; bounce <= 10; bounce++) {
      // Position player just above acid surface for next pogo bounce
      player.y = 15 * 32 - 20;

      // Down-slash attack simulation over acid
      player.attackDirection = 'down';
      player.isAttacking = true;
      player.attackHitbox = { x: player.x, y: player.y + player.height, width: 28, height: 95 };

      const acidHit = Physics.checkBoundsAcid(player.attackHitbox, acidRoom);
      assert(acidHit, `Bounce ${bounce}: down-slash hitbox overlaps acid surface`);

      player.pogoBounce();
      assertEquals(player.vy, -380, `Bounce ${bounce}: vy set to -380`);
      assertInDelta(player.pogoMitigatedTimer, 0.3, 0.001, `Bounce ${bounce}: grace window refreshed to 0.3s`);

      // Update physics for 5 frames (~0.08s airtime rising)
      for (let f = 0; f < 5; f++) {
        player.update(0.016, mockInput(), mockSound, mockParticles, acidRoom, mockCamera);
      }

      assertEquals(player.masks, 5, `Bounce ${bounce}: player health remains 5/5`);
    }
  });

  test('A4.5: Longnail Charm increases down-slash pogo reach by 1.5x', () => {
    const playerNoCharm = new Player(100, 100);
    playerNoCharm.performAttack(mockInput({ down: true }), mockSound, mockParticles);
    const hNoCharm = playerNoCharm.attackHitbox.height;
    assertEquals(hNoCharm, 95, 'Default down-slash hitbox height is 95px');

    const playerCharm = new Player(100, 100);
    playerCharm.equippedCharms = ['LONGNAIL'];
    playerCharm.performAttack(mockInput({ down: true }), mockSound, mockParticles);
    const hCharm = playerCharm.attackHitbox.height;
    assertEquals(hCharm, 95 * 1.5, 'LONGNAIL charm increases down-slash reach to 142.5px (1.5x)');
  });


  // -------------------------------------------------------------------
  // SCENARIO 5: VOID GATE COLLISION DURING NORMAL MOVEMENT VS SHADOW DASH
  // -------------------------------------------------------------------
  test('A5.1: VoidGate blocks normal walking movement as a solid barrier', () => {
    const room = new Room('void_walk', 'Void Walk Room', 'deepnest', 30, 20);
    const voidGate = new VoidGate(300, 400, 32, 96);
    room.voidGates.push(voidGate);

    // Place player right at VoidGate edge: x = 275 (bounds right edge = 275+5+22 = 302 > 300)
    const player = new Player(275, 400);
    player.abilities = { dash: false, wallJump: false, shadowDash: false };
    player.vx = 210; // Moving right into gate

    assertEquals(voidGate.isPassableBy(player), false, 'VoidGate is NOT passable during normal walking');

    // Run physics tile collision check
    Physics.checkTileCollision(player, room, 0.016);

    assertEquals(player.onRightWall, true, 'Player collides with left side of VoidGate (onRightWall = true)');
    assertEquals(player.vx, 0, 'Horizontal velocity zeroed by VoidGate collision');
    assert(player.x + player.boxOffsetX + player.width <= 300, 'Player position clamped before VoidGate boundary (x <= 300)');
  });

  test('A5.2: VoidGate blocks standard Mothwing Cloak Dash (without Shade Cloak)', () => {
    const room = new Room('void_dash', 'Void Normal Dash Room', 'deepnest', 30, 20);
    const voidGate = new VoidGate(300, 400, 32, 96);
    room.voidGates.push(voidGate);

    // Place player near VoidGate edge: x = 275
    const player = new Player(275, 400);
    player.abilities = { dash: true, wallJump: false, shadowDash: false };
    player.facing = 1;

    // Trigger normal dash
    player.isDashing = true;
    player.dashTimer = 0.22;
    player.vx = 520;
    player.isShadowDash = player.abilities.shadowDash; // false

    assertEquals(voidGate.isPassableBy(player), false, 'VoidGate is NOT passable during standard dash');

    Physics.checkTileCollision(player, room, 0.016);

    assertEquals(player.vx, 0, 'Normal dash is stopped by VoidGate barrier');
    assert(player.x + player.boxOffsetX + player.width <= 300, 'Player cannot penetrate VoidGate without Shade Cloak');
  });

  test('A5.3: Active Shadow Dash (Shade Cloak) passes smoothly through VoidGate barrier', () => {
    const room = new Room('void_shadow', 'Void Shadow Dash Room', 'deepnest', 30, 20);
    const voidGate = new VoidGate(300, 400, 32, 96);
    room.voidGates.push(voidGate);

    const player = new Player(260, 400);
    player.abilities = { dash: true, wallJump: false, shadowDash: true };
    player.facing = 1;

    // Trigger Shadow Dash
    player.isDashing = true;
    player.dashTimer = 0.22;
    player.isShadowDash = true;
    player.vx = 520;

    assertEquals(voidGate.isPassableBy(player), true, 'VoidGate IS passable during active Shadow Dash');

    // Run physics through full dash duration (0.22s)
    const dt = 0.016;
    const steps = Math.ceil(0.22 / dt);
    for (let i = 0; i < steps; i++) {
      Physics.checkTileCollision(player, room, dt);
      player.x += player.vx * dt;
    }

    assert(player.x > 332, `Player successfully passed through VoidGate (x = ${player.x} > 332)`);
  });

  test('A5.4: Shadow Dash grants temporary invulnerability phase during dash duration', () => {
    const player = new Player(100, 100);
    player.abilities = { dash: true, shadowDash: true };
    player.invulnerable = false;

    // Trigger Shadow Dash via update with dash input
    player.update(0.016, mockInput({ dash: true }), mockSound, mockParticles, null, mockCamera);

    assertEquals(player.isDashing, true, 'Dash active');
    assertEquals(player.isShadowDash, true, 'Shadow Dash active');
    assertEquals(player.invulnerable, true, 'Player gains invulnerability phase during Shadow Dash');
    assertEquals(player.invulnerableTimer, 0.22, 'Invulnerability timer matches dash duration (0.22s)');
  });

  test('A5.5: Dash expiration inside VoidGate boundary collision handling', () => {
    const room = new Room('void_expire', 'Void Expire Room', 'deepnest', 30, 20);
    const voidGate = new VoidGate(300, 400, 32, 96);
    room.voidGates.push(voidGate);

    const player = new Player(305, 400); // Positioned directly inside VoidGate x=[300..332]
    player.abilities = { dash: true, shadowDash: true };
    player.isDashing = false; // Dash expires while inside
    player.isShadowDash = false;
    player.vx = 100; // Attempting to move right

    assertEquals(voidGate.isPassableBy(player), false, 'Expired dash makes VoidGate non-passable');

    // Physics update with expired dash inside VoidGate
    Physics.checkTileCollision(player, room, 0.016);

    // Confirm system handles collision resolution without crashing or throwing
    assert(typeof player.x === 'number', 'Player X coordinate remains valid number after collision');
    assert(typeof player.y === 'number', 'Player Y coordinate remains valid number after collision');
  });

});

// Self-runner when executed directly via node
if (process.argv[1] && process.argv[1].includes('test_tier5_adversarial_1.js')) {
  runSuites().then(results => {
    if (results.totalFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
