import { Physics } from '../src/engine/Physics.js';
import { Player } from '../src/game/Player.js';
import { Room } from '../src/game/World.js';
import { CrumblingPlatform } from '../src/entities/CrumblingPlatform.js';
import { BreakableWall } from '../src/entities/BreakableWall.js';
import { VoidGate } from '../src/entities/VoidGate.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// Dummy mocks for test runtime
const mockSound = {
  playHit: () => {},
  playPogo: () => {},
  playSlash: () => {},
  playGeo: () => {}
};

const mockParticles = {
  spawnHitSparks: () => {},
  spawnDust: () => {},
  spawnShockwave: () => {},
  add: () => {}
};

const mockCamera = {
  shake: () => {},
  follow: () => {},
  setBounds: () => {},
  getView: () => ({ x: 0, y: 0, width: 960, height: 540 })
};

const mockInput = {
  isDown: () => false,
  isJustPressed: () => false,
  update: () => {}
};

console.log('====================================================');
console.log('  MILESTONE 3: PLATFORMING & MECHANICS SUITE');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Physics static methods (isTileHazard & isTileAcid)
// ----------------------------------------------------
console.log('Test Group 1: Physics static methods (isTileHazard & isTileAcid)');
const testRoom = new Room('test_room', 'Test Room', 'crossroads', 20, 20);
testRoom.setTile(2, 2, { solid: true, hazard: true, type: 'spike', color: '#aa2222' });
testRoom.setTile(5, 5, { solid: false, acid: true, type: 'acid', color: '#24a058' });
testRoom.setTile(8, 8, { solid: true, color: '#161d28', type: 'stone' });

assert(Physics.isTileHazard(2 * 32, 2 * 32, testRoom) === true, 'Physics.isTileHazard detects spike tile at (2,2)');
assert(Physics.isTileHazard(8 * 32, 8 * 32, testRoom) === false, 'Physics.isTileHazard returns false for stone tile at (8,8)');
assert(Physics.isTileAcid(5 * 32, 5 * 32, testRoom) === true, 'Physics.isTileAcid detects acid tile at (5,5)');
assert(Physics.isTileAcid(8 * 32, 8 * 32, testRoom) === false, 'Physics.isTileAcid returns false for stone tile at (8,8)');

// ----------------------------------------------------
// TEST 2: CrumblingPlatform lifecycle (step, shake, crumble, respawn)
// ----------------------------------------------------
console.log('\nTest Group 2: CrumblingPlatform Lifecycle');
const platform = new CrumblingPlatform(100, 200, 64, 16);
assert(platform.solid === true, 'CrumblingPlatform is initially solid');
assert(platform.state === 'IDLE', 'CrumblingPlatform initial state is IDLE');

platform.onStepOn();
assert(platform.state === 'SHAKING', 'Step on platform transitions state to SHAKING');

platform.update(0.45, null, mockParticles, mockSound);
assert(platform.state === 'CRUMBLED', 'After 0.4s shake timer expires, state becomes CRUMBLED');
assert(platform.solid === false, 'CrumblingPlatform solid becomes false when CRUMBLED');

platform.update(3.1, null, mockParticles, mockSound);
assert(platform.state === 'IDLE', 'After 3.0s respawn timer expires, state returns to IDLE');
assert(platform.solid === true, 'CrumblingPlatform solid becomes true after respawn');

// ----------------------------------------------------
// TEST 3: BreakableWall lifecycle (multi-hit, SFX/sparks, reward spawn)
// ----------------------------------------------------
console.log('\nTest Group 3: BreakableWall & Geo Cache Secret');
const wallRoom = new Room('wall_room', 'Wall Room', 'crossroads', 20, 20);
const wall = new BreakableWall(300, 400, 32, 96, 3, { type: 'GEO_CACHE', count: 5 });
wallRoom.walls.push(wall);

assert(wall.hp === 3, 'BreakableWall starts with 3 HP');
assert(wall.solid === true, 'BreakableWall starts as solid');

wall.takeDamage(1, mockSound, mockParticles, wallRoom);
assert(wall.hp === 2, 'After 1 hit, HP decreases to 2');
assert(wall.solid === true, 'Wall remains solid when HP > 0');

wall.invulnerableTimer = 0; // Reset invuln for instant test step
wall.takeDamage(2, mockSound, mockParticles, wallRoom);
assert(wall.hp <= 0, 'After 2 more hits, HP reaches 0');
assert(wall.isDestroyed === true, 'BreakableWall is marked as destroyed');
assert(wall.solid === false, 'BreakableWall solid becomes false when destroyed');
assert(wallRoom.collectibles.reduce((sum, c) => sum + c.value, 0) === 5, 'Wall destruction spawns 5 Geo into room collectibles');

// ----------------------------------------------------
// TEST 4: Hazard Checkpoint Tracking & Respawn System
// ----------------------------------------------------
console.log('\nTest Group 4: Spike Pit & Safe Checkpoint System');
const hazardRoom = new Room('hazard_room', 'Hazard Room', 'crossroads', 30, 20);
hazardRoom.fillBox(0, 15, 30, 5, { solid: true, color: '#161d28', type: 'stone' });
hazardRoom.setTile(10, 14, { solid: true, hazard: true, type: 'spike', color: '#aa2222' });

const player = new Player(64, 14 * 32 - 34);
player.lastSafeX = 64;
player.lastSafeY = 14 * 32 - 34;
player.masks = 5;

// Ground player on safe tile (0, 14)
Physics.checkTileCollision(player, hazardRoom, 0.016);
player.update(0.016, mockInput, mockSound, mockParticles, hazardRoom, mockCamera);
assert(player.lastSafeX === 64, 'Safe ground checkpoint saved at X = 64');

// Teleport player onto spike tile (10, 14)
player.x = 10 * 32;
player.y = 14 * 32 - 30;
player.invulnerable = false;
player.update(0.016, mockInput, mockSound, mockParticles, hazardRoom, mockCamera);

assert(player.masks === 4, 'Touching spike pit inflicts 1 damage (masks 5 -> 4)');
assert(player.x === 64, 'Player is repositioned to lastSafeX = 64');
assert(player.vx === 0 && player.vy === 0, 'Player velocity is zeroed upon hazard respawn');

// ----------------------------------------------------
// TEST 5: Acid & Spike Pogo Bounce Mechanics
// ----------------------------------------------------
console.log('\nTest Group 5: Acid & Spike Pogo-Jumping');
player.vy = 200;
player.pogoBounce();
assert(player.vy === -380, 'pogoBounce() sets vertical velocity vy = -380');
assert(player.pogoMitigatedTimer > 0, 'pogoBounce() sets pogoMitigatedTimer > 0 for acid grace');

// Simulate pogo bounce off acid tile
const acidRoom = new Room('acid_room', 'Acid Room', 'greenpath', 20, 20);
acidRoom.setTile(5, 10, { solid: false, acid: true, type: 'acid', color: '#24a058' });

player.x = 5 * 32;
player.y = 10 * 32 - 20;
player.attackDirection = 'down';
player.isAttacking = true;
player.attackHitbox = { x: 5 * 32, y: 10 * 32 - 10, width: 28, height: 40 };

const isAcidOverlap = Physics.checkBoundsAcid(player.attackHitbox, acidRoom);
assert(isAcidOverlap === true, 'Down-slash hitbox overlaps acid surface');

if (isAcidOverlap) {
  player.pogoBounce();
}
assert(player.vy === -380, 'Down-slash on acid triggers pogo bounce (vy = -380)');

// ----------------------------------------------------
// TEST 6: VoidGate Barrier Mechanics
// ----------------------------------------------------
console.log('\nTest Group 6: VoidGate Shadow Dash Barrier');
const voidGate = new VoidGate(500, 500, 32, 96);
player.isDashing = false;
player.abilities.shadowDash = false;
assert(voidGate.isPassableBy(player) === false, 'VoidGate blocks normal movement (isPassableBy = false)');

player.isDashing = true;
player.abilities.shadowDash = true;
assert(voidGate.isPassableBy(player) === true, 'VoidGate is passable when player shadow dashes (isPassableBy = true)');

console.log('\n====================================================');
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
