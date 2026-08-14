import { Physics } from '../engine/Physics.js';
import { Crawlid } from '../entities/Crawlid.js';
import { Vengefly } from '../entities/Vengefly.js';
import { HuskSentinel } from '../entities/HuskSentinel.js';
import { MantisGuard } from '../entities/MantisGuard.js';
import { FalseKnight } from '../entities/FalseKnight.js';
import { Hornet } from '../entities/Hornet.js';
import { CrumblingPlatform } from '../entities/CrumblingPlatform.js';
import { BreakableWall } from '../entities/BreakableWall.js';
import { VoidGate } from '../entities/VoidGate.js';
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
      { x: 550, y: 600, name: 'Elderbug', dialogue: "Welcome to Dirtmouth, traveler. Passages lead into the howling cliffs and caverns..." },
      { x: 1400, y: 600, name: 'Sly', dialogue: "Ho ho! Looking to spend your Geo on fine Charms?", isShop: true }
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

    cityOfTears.benches.push(new Bench(2200, 968, 'city_of_tears'));
    cityOfTears.stagStations.push(new StagStation(2100, 964, 'city_of_tears', 'City of Tears Central Station', 'city_of_tears'));

    cityOfTears.addEnemy(new HuskSentinel(700, 920));

    cityOfTears.addDoor({
      x: 0, y: 920, width: 70, height: 90,
      targetRoomId: 'fog_canyon', targetX: 3380, targetY: 920
    });
    cityOfTears.addDoor({
      x: 4240, y: 920, width: 70, height: 90,
      targetRoomId: 'deepnest', targetX: 3700, targetY: 920
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
    this.rooms['deepnest'] = deepnest;

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
