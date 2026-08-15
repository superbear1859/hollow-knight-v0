import { Physics } from '../engine/Physics.js';
import { Crawlid } from '../entities/Crawlid.js';
import { Vengefly } from '../entities/Vengefly.js';
import { HuskSentinel } from '../entities/HuskSentinel.js';
import { MantisGuard } from '../entities/MantisGuard.js';
import { FalseKnight } from '../entities/FalseKnight.js';
import { Hornet } from '../entities/Hornet.js';
import { SoulMaster } from '../entities/SoulMaster.js';
import { MantisLords } from '../entities/MantisLords.js';
import { DungDefender } from '../entities/DungDefender.js';
import { CrumblingPlatform } from '../entities/CrumblingPlatform.js';
import { BreakableWall } from '../entities/BreakableWall.js';
import { VoidGate } from '../entities/VoidGate.js';
import { NPC } from '../entities/NPC.js';
import { Bench } from './Bench.js';
import { StagStation } from './StagStation.js';
import { AbilityUnlock, GeoCoin } from './Collectible.js';

export class Room {
  constructor(id, name, biome, widthTiles, heightTiles) {
    this.id = id;
    this.name = name;
    this.biome = biome;
    this.width = widthTiles * Physics.TILE_SIZE;
    this.height = heightTiles * Physics.TILE_SIZE;
    this.widthTiles = widthTiles;
    this.heightTiles = heightTiles;

    this.tiles = new Array(widthTiles * heightTiles).fill(null);
    this.enemies = [];
    this.initialEnemySpawns = [];
    this.benches = [];
    this.stagStations = [];
    this.collectibles = [];
    this.doors = [];
    this.npcs = [];
    this.platforms = [];
    this.walls = [];
    this.voidGates = [];
  }

  setTile(tx, ty, tileData) {
    if (tx < 0 || tx >= this.widthTiles || ty < 0 || ty >= this.heightTiles) return;
    this.tiles[ty * this.widthTiles + tx] = tileData;
  }

  getTile(tx, ty) {
    if (tx < 0 || tx >= this.widthTiles || ty < 0 || ty >= this.heightTiles) return null;
    return this.tiles[ty * this.widthTiles + tx];
  }

  fillBox(tx, ty, tw, th, tileData) {
    for (let y = ty; y < ty + th; y++) {
      for (let x = tx; x < tx + tw; x++) {
        this.setTile(x, y, tileData);
      }
    }
  }

  fillFrame(solidTile) {
    for (let x = 0; x < this.widthTiles; x++) {
      this.setTile(x, 0, solidTile);
      this.setTile(x, this.heightTiles - 1, solidTile);
    }
    for (let y = 0; y < this.heightTiles; y++) {
      this.setTile(0, y, solidTile);
      this.setTile(this.widthTiles - 1, y, solidTile);
    }
  }

  addEnemy(enemy) {
    if (!enemy) return;
    enemy.initialX = enemy.x;
    enemy.initialY = enemy.y;
    this.enemies.push(enemy);
    this.initialEnemySpawns.push({
      type: enemy.constructor,
      x: enemy.x,
      y: enemy.y,
      instance: enemy
    });
  }

  addDoor(doorObj) {
    this.doors.push(doorObj);
    const isVerticalShaft = doorObj.y > (this.height - 120) || doorObj.y <= 40;
    const paddingY = isVerticalShaft ? 4 * Physics.TILE_SIZE : 0;

    const startTx = Math.max(0, Math.floor(doorObj.x / Physics.TILE_SIZE));
    const endTx = Math.min(this.widthTiles - 1, Math.floor((doorObj.x + doorObj.width) / Physics.TILE_SIZE));
    const startTy = Math.max(0, Math.floor((doorObj.y - paddingY) / Physics.TILE_SIZE));
    const endTy = Math.min(this.heightTiles - 1, Math.floor((doorObj.y + doorObj.height + paddingY) / Physics.TILE_SIZE));

    for (let ty = startTy; ty <= endTy; ty++) {
      for (let tx = startTx; tx <= endTx; tx++) {
        this.setTile(tx, ty, null);
      }
    }
  }
}

export class World {
  constructor() {
    this.rooms = {};
    this.currentRoom = null;
    this.buildWorld();
  }

  respawnEnemies() {
    Object.values(this.rooms).forEach(room => {
      room.enemies.forEach(enemy => {
        if (!enemy.isBoss) {
          enemy.isDead = false;
          enemy.active = true;
          enemy.hp = enemy.maxHp;
          if (typeof enemy.initialX !== 'undefined') enemy.x = enemy.initialX;
          if (typeof enemy.initialY !== 'undefined') enemy.y = enemy.initialY;
          if (typeof enemy.startX !== 'undefined') enemy.startX = enemy.initialX ?? enemy.x;
          if (typeof enemy.startY !== 'undefined') enemy.startY = enemy.initialY ?? enemy.y;
          enemy.vx = 0;
          enemy.vy = 0;
          enemy.hitFlashTimer = 0;
          enemy.invulnerable = false;
          enemy.invulnerableTimer = 0;
        }
      });

      if (room.initialEnemySpawns && room.initialEnemySpawns.length > 0) {
        room.initialEnemySpawns.forEach(config => {
          const exists = room.enemies.some(e => e === config.instance || (e.initialX === config.x && e.initialY === config.y && e.constructor === config.type));
          if (!exists) {
            const newEnemy = new config.type(config.x, config.y);
            if (!newEnemy.isBoss) {
              newEnemy.initialX = config.x;
              newEnemy.initialY = config.y;
              config.instance = newEnemy;
              room.enemies.push(newEnemy);
            }
          }
        });
      }
    });
  }

  buildWorld() {
    const STONE = { solid: true, color: '#161d28', type: 'stone' };
    const MOSS_STONE = { solid: true, color: '#182b20', type: 'moss' };
    const DIRT_STONE = { solid: true, color: '#252a36', type: 'dirt' };
    const CRYSTAL_STONE = { solid: true, color: '#4a184c', type: 'crystal' };
    const CITY_STONE = { solid: true, color: '#1c3048', type: 'city' };
    const DEEP_STONE = { solid: true, color: '#141018', type: 'deepnest' };
    const ACID = { solid: false, acid: true, color: '#24a058' };
    const SPIKE = { solid: true, hazard: true, type: 'spike', color: '#aa2222' };

    // ----------------------------------------------------
    // ROOM 1: KING'S PASS (80x26 = 2560px x 832px)
    // ----------------------------------------------------
    const kingsPass = new Room('kings_pass', "King's Pass - Howling Cliffs", 'kings_pass', 80, 26);
    kingsPass.fillFrame(DIRT_STONE);
    kingsPass.fillBox(1, 22, 78, 3, DIRT_STONE);
    kingsPass.fillBox(10, 18, 12, 1, DIRT_STONE);
    kingsPass.fillBox(26, 14, 14, 1, DIRT_STONE);

    kingsPass.addEnemy(new Crawlid(400, 650));
    kingsPass.addEnemy(new Crawlid(1100, 650));
    kingsPass.addEnemy(new Vengefly(900, 350));

    kingsPass.addDoor({
      x: 2480, y: 620, width: 70, height: 90,
      targetRoomId: 'dirtmouth_01', targetX: 100, targetY: 600
    });
    this.rooms['kings_pass'] = kingsPass;

    // ----------------------------------------------------
    // ROOM 2: DIRTMOUTH (90x24 = 2880px x 768px) - TOWN SANCTUARY
    // ----------------------------------------------------
    const dirtmouth = new Room('dirtmouth_01', 'Dirtmouth - The Fading Town', 'dirtmouth', 90, 24);
    dirtmouth.fillFrame(DIRT_STONE);
    dirtmouth.fillBox(1, 20, 88, 3, DIRT_STONE);

    dirtmouth.benches.push(new Bench(700, 616, 'dirtmouth_01'));
    dirtmouth.stagStations.push(new StagStation(600, 612, 'dirtmouth', 'Dirtmouth Town Station', 'dirtmouth_01'));

    dirtmouth.npcs.push(
      new NPC(550, 616, 'Elderbug', "Welcome to Dirtmouth, traveler. Passages lead down into the howling caverns of Hallownest...", { type: 'elderbug' }),
      new NPC(1400, 616, 'Sly', "Ho ho! Looking to spend your Geo on fine Charms? Step right up!", { type: 'sly', isShop: true })
    );

    dirtmouth.addDoor({
      x: 0, y: 620, width: 70, height: 90,
      targetRoomId: 'kings_pass', targetX: 2400, targetY: 600
    });
    dirtmouth.addDoor({
      x: 2810, y: 620, width: 70, height: 90,
      targetRoomId: 'crossroads_01', targetX: 100, targetY: 920
    });
    this.rooms['dirtmouth_01'] = dirtmouth;

    // ----------------------------------------------------
    // ROOM 3: UPPER FORGOTTEN CROSSROADS (120x35 = 3840px x 1120px)
    // ----------------------------------------------------
    const crossroads1 = new Room('crossroads_01', 'Upper Forgotten Crossroads', 'crossroads', 120, 35);
    crossroads1.fillFrame(STONE);
    crossroads1.fillBox(1, 31, 118, 3, STONE);

    crossroads1.npcs.push(
      new NPC(750, 968, 'Quirrel', "Ah, a fellow wanderer! The architecture and solemn monuments in these caverns are marvelous, aren't they?", { type: 'quirrel' })
    );

    crossroads1.addEnemy(new Crawlid(600, 930));
    crossroads1.addEnemy(new Crawlid(1400, 930));
    crossroads1.addEnemy(new Vengefly(1000, 500));

    crossroads1.addDoor({
      x: 0, y: 920, width: 70, height: 90,
      targetRoomId: 'dirtmouth_01', targetX: 2700, targetY: 600
    });
    crossroads1.addDoor({
      x: 3770, y: 920, width: 70, height: 90,
      targetRoomId: 'boss_false_knight', targetX: 80, targetY: 520
    });
    crossroads1.addDoor({
      x: 1880, y: 980, width: 160, height: 140,
      targetRoomId: 'crossroads_02', targetX: 2000, targetY: 120
    });
    this.rooms['crossroads_01'] = crossroads1;

    // ----------------------------------------------------
    // ROOM 4: LOWER FORGOTTEN CROSSROADS & ANCIENT BASIN (110x35 = 3520px x 1120px)
    // ----------------------------------------------------
    const crossroads2 = new Room('crossroads_02', 'Lower Crossroads & Ancient Basin', 'ancient_basin', 110, 35);
    crossroads2.fillFrame(STONE);
    crossroads2.fillBox(1, 31, 108, 3, STONE);

    crossroads2.npcs.push(
      new NPC(650, 968, 'Cloth', "Ha! Let the beasts come! My mighty club is ready for whatever lurks in these dark depths!", { type: 'cloth' })
    );

    crossroads2.benches.push(new Bench(400, 936, 'crossroads_02'));
    crossroads2.collectibles.push(new AbilityUnlock(1800, 936, 'desolateDive', 'Desolate Dive (Spell)'));
    crossroads2.addEnemy(new HuskSentinel(1200, 890));
    crossroads2.stagStations.push(new StagStation(1500, 964, 'crossroads', 'Crossroads Basin Station', 'crossroads_02'));

    crossroads2.addEnemy(new Crawlid(500, 930));
    crossroads2.addEnemy(new HuskSentinel(1200, 920));

    crossroads2.addDoor({
      x: 1880, y: 0, width: 160, height: 100,
      targetRoomId: 'crossroads_01', targetX: 2000, targetY: 920
    });
    crossroads2.addDoor({
      x: 0, y: 920, width: 70, height: 90,
      targetRoomId: 'greenpath_01', targetX: 4000, targetY: 920
    });
    crossroads2.addDoor({
      x: 3450, y: 920, width: 70, height: 90,
      targetRoomId: 'crystal_peak', targetX: 80, targetY: 920
    });
    crossroads2.addDoor({
      x: 2680, y: 980, width: 160, height: 140,
      targetRoomId: 'city_of_tears', targetX: 540, targetY: 120
    });
    crossroads2.addDoor({
      x: 1000, y: 980, width: 160, height: 140,
      targetRoomId: 'the_abyss', targetX: 800, targetY: 100
    });
    this.rooms['crossroads_02'] = crossroads2;

    // ----------------------------------------------------
    // ROOM 5: BOSS ARENA - ANCESTRAL MOUND / FALSE KNIGHT (60x22 = 1920px x 704px)
    // ----------------------------------------------------
    const falseKnightArena = new Room('boss_false_knight', 'Ancestral Mound - False Knight', 'ancestral_mound', 60, 22);
    falseKnightArena.fillFrame(STONE);
    falseKnightArena.fillBox(1, 18, 58, 3, STONE);

    falseKnightArena.addEnemy(new FalseKnight(1200, 450));
    falseKnightArena.addEnemy(new Crawlid(300, 510));
    falseKnightArena.addEnemy(new Crawlid(1600, 510));


    falseKnightArena.addDoor({
      x: 0, y: 520, width: 70, height: 90,
      targetRoomId: 'crossroads_01', targetX: 3700, targetY: 920
    });
    falseKnightArena.addDoor({
      x: 1840, y: 520, width: 70, height: 90,
      targetRoomId: 'crossroads_02', targetX: 200, targetY: 920
    });
    this.rooms['boss_false_knight'] = falseKnightArena;

    // ----------------------------------------------------
    // ROOM 6: CRYSTAL PEAK MINES (115x35 = 3680px x 1120px)
    // ----------------------------------------------------
    const crystalPeak = new Room('crystal_peak', 'Crystal Peak Mines', 'crystal_peak', 115, 35);
    crystalPeak.fillFrame(CRYSTAL_STONE);
    crystalPeak.fillBox(1, 31, 113, 3, CRYSTAL_STONE);

    crystalPeak.collectibles.push(new AbilityUnlock(2200, 936, 'wallJump', 'Mantis Claw (Wall Jump)'));

    crystalPeak.addEnemy(new Vengefly(600, 400));
    crystalPeak.addEnemy(new Crawlid(1400, 930));

    crystalPeak.addDoor({
      x: 0, y: 920, width: 70, height: 90,
      targetRoomId: 'crossroads_02', targetX: 3380, targetY: 920
    });
    crystalPeak.addDoor({
      x: 3600, y: 100, width: 70, height: 90,
      targetRoomId: 'city_of_tears', targetX: 3000, targetY: 920
    });
    this.rooms['crystal_peak'] = crystalPeak;

    // ----------------------------------------------------
    // ROOM 7: GREENPATH CAVERNS 1 (130x35 = 4160px x 1120px)
    // ----------------------------------------------------
    const greenpath1 = new Room('greenpath_01', 'Greenpath Caverns', 'greenpath', 130, 35);
    greenpath1.fillFrame(MOSS_STONE);
    greenpath1.fillBox(1, 31, 40, 3, MOSS_STONE);
    greenpath1.fillBox(41, 31, 48, 3, ACID);
    greenpath1.fillBox(89, 31, 40, 3, MOSS_STONE);

    greenpath1.stagStations.push(new StagStation(3800, 964, 'greenpath', 'Greenpath Canopy Station', 'greenpath_01'));
    greenpath1.npcs.push(
      new NPC(1100, 968, 'Cornifer', "Hmm hmm hmm... Greetings! I am Cornifer, charting these lush moss caverns. Keep your maps close, wanderer!", { type: 'cornifer' })
    );
    greenpath1.addEnemy(new Crawlid(600, 930));

    greenpath1.addDoor({
      x: 4090, y: 920, width: 70, height: 90,
      targetRoomId: 'crossroads_02', targetX: 80, targetY: 920
    });
    greenpath1.addDoor({
      x: 0, y: 920, width: 70, height: 90,
      targetRoomId: 'greenpath_02', targetX: 3880, targetY: 920
    });
    this.rooms['greenpath_01'] = greenpath1;

    // ----------------------------------------------------
    // ROOM 8: GREENPATH CANOPY & FUNGAL WASTES (125x35 = 4000px x 1120px)
    // ----------------------------------------------------
    const greenpath2 = new Room('greenpath_02', 'Greenpath Canopy & Fungal Wastes', 'fungal_wastes', 125, 35);
    greenpath2.fillFrame(MOSS_STONE);
    greenpath2.fillBox(1, 31, 123, 3, MOSS_STONE);

    greenpath2.collectibles.push(new AbilityUnlock(1400, 936, 'dash', 'Mothwing Cloak (Dash)'));

    greenpath2.addEnemy(new HuskSentinel(800, 920));

    greenpath2.addDoor({
      x: 3930, y: 920, width: 70, height: 90,
      targetRoomId: 'greenpath_01', targetX: 80, targetY: 920
    });
    greenpath2.addDoor({
      x: 0, y: 920, width: 70, height: 90,
      targetRoomId: 'boss_hornet', targetX: 80, targetY: 540
    });
    greenpath2.addDoor({
      x: 2200, y: 980, width: 160, height: 140,
      targetRoomId: 'mantis_village', targetX: 100, targetY: 650
    });
    this.rooms['greenpath_02'] = greenpath2;

    // ----------------------------------------------------
    // ROOM 9: BOSS ARENA - HORNET SANCTUARY (65x24 = 2080px x 768px)
    // ----------------------------------------------------
    const hornetArena = new Room('boss_hornet', 'Greenpath Sanctuary - Hornet', 'hornet_sanctuary', 65, 24);
    hornetArena.fillFrame(MOSS_STONE);
    hornetArena.fillBox(1, 20, 63, 3, MOSS_STONE);

    hornetArena.addEnemy(new Hornet(1400, 500));

    hornetArena.addDoor({
      x: 0, y: 540, width: 70, height: 90,
      targetRoomId: 'greenpath_02', targetX: 100, targetY: 920
    });
    hornetArena.addDoor({
      x: 2000, y: 540, width: 70, height: 90,
      targetRoomId: 'fog_canyon', targetX: 800, targetY: 120
    });
    this.rooms['boss_hornet'] = hornetArena;

    // ----------------------------------------------------
    // ROOM 10: FOG CANYON (110x35 = 3520px x 1120px)
    // ----------------------------------------------------
    const fogCanyon = new Room('fog_canyon', 'Fog Canyon Archives', 'fog_canyon', 110, 35);
    fogCanyon.fillFrame(MOSS_STONE);
    fogCanyon.fillBox(1, 31, 50, 3, MOSS_STONE);
    fogCanyon.fillBox(51, 31, 10, 3, ACID);
    fogCanyon.fillBox(61, 31, 48, 3, MOSS_STONE);

    // Platforming bypass over secret Void Gate
    fogCanyon.fillBox(70, 22, 12, 1, MOSS_STONE);
    fogCanyon.fillBox(74, 16, 6, 1, MOSS_STONE);
    fogCanyon.voidGates.push(new VoidGate(2400, 800, 32, 192));

    fogCanyon.addDoor({
      x: 480, y: 0, width: 160, height: 100,
      targetRoomId: 'greenpath_01', targetX: 1740, targetY: 920
    });
    fogCanyon.addDoor({
      x: 3450, y: 920, width: 70, height: 90,
      targetRoomId: 'city_of_tears', targetX: 80, targetY: 920
    });
    this.rooms['fog_canyon'] = fogCanyon;

    // ----------------------------------------------------
    // ROOM 11: CITY OF TEARS OUTSKIRTS (135x35 = 4320px x 1120px)
    // ----------------------------------------------------
    const cityOfTears = new Room('city_of_tears', 'City of Tears Outskirts', 'city_of_tears', 135, 35);
    cityOfTears.fillFrame(CITY_STONE);
    cityOfTears.fillBox(1, 31, 133, 3, CITY_STONE);

    // Grand Elevator Shaft to Crossroads (x = 440 to 640)
    cityOfTears.fillBox(13, 1, 2, 29, CITY_STONE); // Left shaft wall
    cityOfTears.fillBox(20, 1, 2, 29, CITY_STONE); // Right shaft wall
    cityOfTears.fillBox(15, 24, 5, 1, CITY_STONE); // Platform level 1 (y = 768)
    cityOfTears.fillBox(15, 18, 5, 1, CITY_STONE); // Platform level 2 (y = 576)
    cityOfTears.fillBox(15, 12, 5, 1, CITY_STONE); // Platform level 3 (y = 384)
    cityOfTears.fillBox(15, 6, 5, 1, CITY_STONE);  // Platform level 4 (y = 192)

    // Spires & Ascending Platforms to Crystal Peak (x = 2800 to 3100)
    cityOfTears.fillBox(88, 25, 8, 1, CITY_STONE);
    cityOfTears.fillBox(91, 19, 7, 1, CITY_STONE);
    cityOfTears.fillBox(89, 13, 7, 1, CITY_STONE);
    cityOfTears.fillBox(92, 7, 6, 1, CITY_STONE);

    cityOfTears.benches.push(new Bench(2200, 968, 'city_of_tears'));
    cityOfTears.stagStations.push(new StagStation(2100, 964, 'city_of_tears', 'City of Tears Central Station', 'city_of_tears'));

    cityOfTears.npcs.push(
      new NPC(2300, 968, 'Lemm', "Welcome to the capital of Hallownest, wanderer. The rain never stops falling upon these spires.", { type: 'elderbug' })
    );

    cityOfTears.addEnemy(new HuskSentinel(700, 920));
    cityOfTears.addEnemy(new HuskSentinel(1600, 920));
    cityOfTears.addEnemy(new HuskSentinel(3400, 920));

    // Return Door to Lower Crossroads & Ancient Basin (Elevator Shaft Top)
    cityOfTears.addDoor({
      x: 480, y: 0, width: 160, height: 100,
      targetRoomId: 'crossroads_02', targetX: 2680, targetY: 900
    });

    // Return Door to Crystal Peak (Spire Top)
    cityOfTears.addDoor({
      x: 2940, y: 0, width: 160, height: 100,
      targetRoomId: 'crystal_peak', targetX: 3550, targetY: 180
    });

    // West Door to Fog Canyon
    cityOfTears.addDoor({
      x: 0, y: 920, width: 70, height: 90,
      targetRoomId: 'fog_canyon', targetX: 3380, targetY: 920
    });

    // East Door to Deepnest
    cityOfTears.addDoor({
      x: 4240, y: 920, width: 70, height: 90,
      targetRoomId: 'deepnest', targetX: 3700, targetY: 920
    });

    // East Door to Soul Sanctum
    cityOfTears.addDoor({
      x: 4240, y: 300, width: 70, height: 90,
      targetRoomId: 'soul_sanctum', targetX: 80, targetY: 620
    });

    // Floor Grate Door to Royal Waterways
    cityOfTears.addDoor({
      x: 1600, y: 980, width: 160, height: 140,
      targetRoomId: 'royal_waterways', targetX: 1400, targetY: 100
    });
    this.rooms['city_of_tears'] = cityOfTears;

    // ----------------------------------------------------
    // ROOM 12: DEEPNEST CAVERNS (120x35 = 3840px x 1120px)
    // ----------------------------------------------------
    const deepnest = new Room('deepnest', 'Deepnest Spider Caverns', 'deepnest', 120, 35);
    deepnest.fillFrame(DEEP_STONE);
    deepnest.fillBox(1, 31, 118, 3, DEEP_STONE);

    deepnest.collectibles.push(new AbilityUnlock(1200, 936, 'shadowDash', 'Shade Cloak (Shadow Dash)'));
    deepnest.stagStations.push(new StagStation(600, 964, 'deepnest', 'Deepnest Distant Village Station', 'deepnest'));

    deepnest.voidGates.push(new VoidGate(1800, 800, 32, 192));

    deepnest.addDoor({
      x: 3760, y: 920, width: 70, height: 90,
      targetRoomId: 'city_of_tears', targetX: 4100, targetY: 920
    });
    deepnest.addDoor({
      x: 0, y: 920, width: 70, height: 90,
      targetRoomId: 'mantis_village', targetX: 2550, targetY: 650
    });
    deepnest.addDoor({
      x: 2400, y: 980, width: 160, height: 140,
      targetRoomId: 'the_abyss', targetX: 3350, targetY: 920
    });
    this.rooms['deepnest'] = deepnest;

    // ----------------------------------------------------
    // ROOM 13: SOUL SANCTUM (80x25 = 2560px x 800px)
    // ----------------------------------------------------
    const soulSanctum = new Room('soul_sanctum', 'Soul Sanctum - Soul Master', 'soul_sanctum', 80, 25);
    soulSanctum.fillFrame(CITY_STONE);
    soulSanctum.fillBox(1, 21, 78, 3, CITY_STONE);
    soulSanctum.fillBox(20, 16, 12, 1, CITY_STONE);
    soulSanctum.fillBox(48, 16, 12, 1, CITY_STONE);
    soulSanctum.fillBox(34, 11, 12, 1, CITY_STONE);

    soulSanctum.benches.push(new Bench(400, 640, 'soul_sanctum'));
    soulSanctum.addEnemy(new SoulMaster(1600, 420));

    soulSanctum.addDoor({
      x: 0, y: 620, width: 70, height: 90,
      targetRoomId: 'city_of_tears', targetX: 4160, targetY: 300
    });
    soulSanctum.addDoor({
      x: 2480, y: 620, width: 70, height: 90,
      targetRoomId: 'royal_waterways', targetX: 100, targetY: 700
    });
    this.rooms['soul_sanctum'] = soulSanctum;

    // ----------------------------------------------------
    // ROOM 14: MANTIS VILLAGE & THRONE (85x26 = 2720px x 832px)
    // ----------------------------------------------------
    const mantisVillage = new Room('mantis_village', 'Mantis Village & Throne - Mantis Lords', 'mantis_village', 85, 26);
    mantisVillage.fillFrame(MOSS_STONE);
    mantisVillage.fillBox(1, 22, 83, 3, MOSS_STONE);
    mantisVillage.fillBox(16, 17, 10, 1, MOSS_STONE);
    mantisVillage.fillBox(58, 17, 10, 1, MOSS_STONE);

    mantisVillage.benches.push(new Bench(350, 672, 'mantis_village'));
    mantisVillage.addEnemy(new MantisGuard(700, 660));
    mantisVillage.addEnemy(new MantisLords(1600, 500));

    mantisVillage.addDoor({
      x: 0, y: 650, width: 70, height: 90,
      targetRoomId: 'greenpath_02', targetX: 2200, targetY: 900
    });
    mantisVillage.addDoor({
      x: 2640, y: 650, width: 70, height: 90,
      targetRoomId: 'deepnest', targetX: 80, targetY: 920
    });
    this.rooms['mantis_village'] = mantisVillage;

    // ----------------------------------------------------
    // ROOM 15: ROYAL WATERWAYS (95x28 = 3040px x 896px)
    // ----------------------------------------------------
    const royalWaterways = new Room('royal_waterways', 'Royal Waterways - Dung Defender', 'royal_waterways', 95, 28);
    royalWaterways.fillFrame(STONE);
    royalWaterways.fillBox(1, 24, 93, 3, STONE);
    royalWaterways.fillBox(24, 18, 14, 1, STONE);
    royalWaterways.fillBox(56, 18, 14, 1, STONE);

    royalWaterways.benches.push(new Bench(450, 736, 'royal_waterways'));
    royalWaterways.addEnemy(new DungDefender(1750, 620));

    royalWaterways.addDoor({
      x: 0, y: 700, width: 70, height: 90,
      targetRoomId: 'soul_sanctum', targetX: 2400, targetY: 620
    });
    royalWaterways.addDoor({
      x: 2960, y: 700, width: 70, height: 90,
      targetRoomId: 'the_abyss', targetX: 100, targetY: 800
    });
    royalWaterways.addDoor({
      x: 1400, y: 0, width: 160, height: 100,
      targetRoomId: 'city_of_tears', targetX: 1600, targetY: 900
    });
    this.rooms['royal_waterways'] = royalWaterways;

    // ----------------------------------------------------
    // ROOM 16: THE ABYSS & ANCIENT BASIN DEPTHS (110x35 = 3520px x 1120px)
    // ----------------------------------------------------
    const theAbyss = new Room('the_abyss', 'The Ancient Abyss & Void Depths', 'the_abyss', 110, 35);
    theAbyss.fillFrame(DEEP_STONE);
    theAbyss.fillBox(1, 31, 108, 3, DEEP_STONE);

    theAbyss.benches.push(new Bench(1600, 968, 'the_abyss'));
    theAbyss.stagStations.push(new StagStation(1750, 964, 'the_abyss', 'Abyss Ancient Terminal', 'the_abyss'));
    theAbyss.collectibles.push(new AbilityUnlock(2800, 936, 'shadowDash', 'Shade Cloak (Shadow Dash)'));

    theAbyss.addDoor({
      x: 0, y: 800, width: 70, height: 90,
      targetRoomId: 'royal_waterways', targetX: 2880, targetY: 700
    });
    theAbyss.addDoor({
      x: 800, y: 0, width: 160, height: 100,
      targetRoomId: 'crossroads_02', targetX: 1000, targetY: 900
    });
    theAbyss.addDoor({
      x: 3440, y: 920, width: 70, height: 90,
      targetRoomId: 'deepnest', targetX: 2350, targetY: 920
    });
    this.rooms['the_abyss'] = theAbyss;

    this.currentRoom = this.rooms['dirtmouth_01'];
  }

  loadRoom(roomId) {
    if (this.rooms[roomId]) {
      this.currentRoom = this.rooms[roomId];
      return true;
    }
    return false;
  }

  draw(ctx, camera) {
    if (!this.currentRoom) return;
    const view = camera.getView();
    const tileSize = Physics.TILE_SIZE;

    // Background Color & Ambience per Biome
    if (this.currentRoom.biome === 'kings_pass') {
      ctx.fillStyle = '#080d1a';
    } else if (this.currentRoom.biome === 'dirtmouth') {
      ctx.fillStyle = '#060912';
    } else if (this.currentRoom.biome === 'crossroads') {
      ctx.fillStyle = '#070c18';
    } else if (this.currentRoom.biome === 'ancestral_mound') {
      ctx.fillStyle = '#120a1c';
    } else if (this.currentRoom.biome === 'ancient_basin') {
      ctx.fillStyle = '#030308';
    } else if (this.currentRoom.biome === 'greenpath') {
      ctx.fillStyle = '#06140c';
    } else if (this.currentRoom.biome === 'fungal_wastes') {
      ctx.fillStyle = '#1a180a';
    } else if (this.currentRoom.biome === 'hornet_sanctuary') {
      ctx.fillStyle = '#0a1c10';
    } else if (this.currentRoom.biome === 'fog_canyon') {
      ctx.fillStyle = '#061a1a';
    } else if (this.currentRoom.biome === 'crystal_peak') {
      ctx.fillStyle = '#18081c';
    } else if (this.currentRoom.biome === 'city_of_tears') {
      ctx.fillStyle = '#071220';
    } else if (this.currentRoom.biome === 'deepnest') {
      ctx.fillStyle = '#040406';
    } else if (this.currentRoom.biome === 'soul_sanctum') {
      ctx.fillStyle = '#121026';
    } else if (this.currentRoom.biome === 'mantis_village') {
      ctx.fillStyle = '#141f16';
    } else if (this.currentRoom.biome === 'royal_waterways') {
      ctx.fillStyle = '#0e1814';
    } else if (this.currentRoom.biome === 'the_abyss') {
      ctx.fillStyle = '#020204';
    }
    ctx.fillRect(0, 0, view.width, view.height);

    // Parallax Mountain / Cavern Silhouettes
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    const paraX = (view.x * 0.2) % 300;
    for (let i = -1; i < Math.ceil(view.width / 300) + 2; i++) {
      ctx.beginPath();
      ctx.arc(i * 300 - paraX, view.height, 160, 0, Math.PI, true);
      ctx.fill();
    }
    ctx.restore();

    // Render Tile Grid
    const startTx = Math.max(0, Math.floor(view.x / tileSize));
    const endTx = Math.min(this.currentRoom.widthTiles - 1, Math.ceil((view.x + view.width) / tileSize));
    const startTy = Math.max(0, Math.floor(view.y / tileSize));
    const endTy = Math.min(this.currentRoom.heightTiles - 1, Math.ceil((view.y + view.height) / tileSize));

    for (let ty = startTy; ty <= endTy; ty++) {
      for (let tx = startTx; tx <= endTx; tx++) {
        const tile = this.currentRoom.getTile(tx, ty);
        if (!tile) continue;

        const screenX = Math.round(tx * tileSize - view.x);
        const screenY = Math.round(ty * tileSize - view.y);

        if (tile.hazard || tile.type === 'spike') {
          ctx.fillStyle = tile.color || '#aa2222';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          ctx.fillStyle = '#ff4444';
          for (let s = 0; s < 4; s++) {
            ctx.beginPath();
            ctx.moveTo(screenX + s * 8, screenY + tileSize);
            ctx.lineTo(screenX + s * 8 + 4, screenY);
            ctx.lineTo(screenX + (s + 1) * 8, screenY + tileSize);
            ctx.closePath();
            ctx.fill();
          }
        } else if (tile.acid || tile.type === 'acid') {
          ctx.fillStyle = tile.color || '#24a058';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          ctx.fillStyle = 'rgba(100, 255, 160, 0.4)';
          ctx.fillRect(screenX, screenY, tileSize, 4);
        } else {
          ctx.fillStyle = tile.color;
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.strokeRect(screenX, screenY, tileSize, tileSize);
        }
      }
    }

    // Render Glowing Doorway Archways
    for (const door of this.currentRoom.doors) {
      const screenX = Math.round(door.x - view.x);
      const screenY = Math.round(door.y - view.y);

      ctx.save();
      ctx.fillStyle = 'rgba(120, 210, 255, 0.15)';
      ctx.strokeStyle = 'rgba(140, 220, 255, 0.5)';
      ctx.lineWidth = 2;

      ctx.fillRect(screenX, screenY, door.width, door.height);
      ctx.strokeRect(screenX, screenY, door.width, door.height);

      ctx.fillStyle = '#88d6ff';
      ctx.font = '11px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText('PASSAGE', screenX + door.width / 2, screenY + door.height / 2);
      ctx.restore();
    }
  }
}
