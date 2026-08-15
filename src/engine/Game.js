import { InputHandler } from './InputHandler.js';
import { Camera } from './Camera.js';
import { Particles } from './Particles.js';
import { SoundManager } from './SoundManager.js';
import { Physics } from './Physics.js';
import { World } from '../game/World.js';
import { Player } from '../game/Player.js';
import { HUD } from '../ui/HUD.js';
import { MapUI } from '../ui/MapUI.js';
import { Shop } from '../game/Shop.js';
import { DialogueUI } from '../ui/DialogueUI.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { StagUI } from '../ui/StagUI.js';
import { AbilityCheatUI } from '../ui/AbilityCheatUI.js';
import { SaveSystem } from '../game/SaveSystem.js';
import { GeoCoin, AbilityUnlock } from '../game/Collectible.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.width = 960;
    this.height = 540;
    this.resizeCanvas();

    this.input = new InputHandler();
    this.camera = new Camera(this.width, this.height);
    this.particles = new Particles();
    this.sound = new SoundManager();
    this.world = new World();
    this.hud = new HUD();
    this.mapUI = new MapUI();
    this.shopUI = new Shop();
    this.dialogueUI = new DialogueUI();
    this.inventoryUI = new InventoryUI();
    this.stagUI = new StagUI();
    this.abilityCheatUI = new AbilityCheatUI();

    this.state = 'GAMEPLAY'; // GAMEPLAY, PAUSED, DIALOGUE, SHOP, BENCH, MAP, STAG, CHEAT_MENU
    this.visitedRooms = new Set(['dirtmouth_01']);
    this.bossesDefeated = { falseKnight: false, hornet: false };

    // Load Save or Create Fresh Player
    const saveData = SaveSystem.load();
    const spawnX = saveData.lastBenchX || 700;
    const spawnY = saveData.lastBenchY || 580;
    this.player = new Player(spawnX, spawnY);
    this.player.geo = saveData.geo;
    this.player.maxMasks = saveData.maxMasks;
    this.player.masks = saveData.masks;
    this.player.soul = saveData.soul;
    this.player.abilities = { ...saveData.unlockedAbilities };
    this.player.charmsOwned = [...saveData.charmsOwned];
    this.player.equippedCharms = [...saveData.charmsEquipped];
    this.player.notchCount = saveData.notchCount;

    if (saveData.visitedRooms) {
      saveData.visitedRooms.forEach(r => this.visitedRooms.add(r));
    }
    this.bossesDefeated = saveData.bossesDefeated || { falseKnight: false, hornet: false };

    this.world.loadRoom(saveData.lastBenchRoom || 'dirtmouth_01');
    this.camera.setBounds(0, 0, this.world.currentRoom.width, this.world.currentRoom.height);
    this.camera.snapTo(spawnX, spawnY);

    this.lastTime = 0;
    this.bindEvents();
  }

  resizeCanvas() {
    const INTERNAL_WIDTH = 960;
    const INTERNAL_HEIGHT = 540;
    this.canvas.width = INTERNAL_WIDTH;
    this.canvas.height = INTERNAL_HEIGHT;
    this.width = INTERNAL_WIDTH;
    this.height = INTERNAL_HEIGHT;
    if (this.camera) {
      this.camera.width = INTERNAL_WIDTH;
      this.camera.height = INTERNAL_HEIGHT;
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    window.addEventListener('keydown', () => {
      this.sound.init();
    });
    window.addEventListener('click', () => {
      this.sound.init();
    });
  }

  start() {
    requestAnimationFrame((t) => this.loop(t));
  }

  startNewGame() {
    SaveSystem.reset();
    const initData = SaveSystem.getInitialData();

    this.player = new Player(320, 580);
    this.player.geo = initData.geo;
    this.player.maxMasks = initData.maxMasks;
    this.player.masks = initData.masks;
    this.player.soul = initData.soul;
    this.player.abilities = { ...initData.unlockedAbilities };
    this.player.charmsOwned = [...initData.charmsOwned];
    this.player.equippedCharms = [...initData.charmsEquipped];
    this.player.notchCount = initData.notchCount;

    this.visitedRooms = new Set(['dirtmouth_01']);
    this.bossesDefeated = { falseKnight: false, hornet: false };

    this.world.buildWorld();
    this.world.loadRoom('dirtmouth_01');
    this.camera.setBounds(0, 0, this.world.currentRoom.width, this.world.currentRoom.height);
    this.camera.snapTo(320, 580);

    this.state = 'GAMEPLAY';
    this.sound.playBenchBell();
  }

  travelViaStag(targetStation) {
    if (!targetStation) return;
    this.sound.playBenchBell();
    this.particles.spawnShockwave(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 90, '#d4af37');

    this.transitionRoom(targetStation.roomId, targetStation.x, targetStation.y - 10);
    this.closeAllMenus();
  }

  teleportToRoom(roomId) {
    if (!this.world.rooms[roomId]) return;
    const room = this.world.rooms[roomId];

    const safeSpawns = {
      kings_pass: { x: 400, y: 600 },
      dirtmouth_01: { x: 700, y: 580 },
      crossroads_01: { x: 300, y: 900 },
      boss_false_knight: { x: 300, y: 480 },
      crystal_peak: { x: 400, y: 900 },
      crossroads_02: { x: 1600, y: 900 },
      greenpath_01: { x: 300, y: 900 },
      greenpath_02: { x: 400, y: 900 },
      boss_hornet: { x: 400, y: 480 },
      fog_canyon: { x: 300, y: 900 },
      city_of_tears: { x: 2200, y: 900 },
      deepnest: { x: 600, y: 900 }
    };

    const spawn = safeSpawns[roomId] || { x: room.width / 2, y: room.height - 180 };
    this.transitionRoom(roomId, spawn.x, spawn.y);
    this.sound.playBenchBell();
    this.closeAllMenus();
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    this.input.update();
    requestAnimationFrame((t) => this.loop(t));
  }

  closeAllMenus() {
    this.dialogueUI.close();
    this.shopUI.close();
    this.inventoryUI.close();
    this.mapUI.close();
    if (this.stagUI) this.stagUI.close();
    if (this.abilityCheatUI) this.abilityCheatUI.close();
    this.state = 'GAMEPLAY';
  }

  update(dt) {
    // Secret Cheat Code Trigger: "superbear185941"
    if (this.input.cheatCodeTriggered) {
      this.input.cheatCodeTriggered = false;
      this.closeAllMenus();
      this.abilityCheatUI.open(this.player);
      this.state = 'CHEAT_MENU';
      this.sound.playBossRoar();
      this.particles.spawnShockwave(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 160, '#ffcf40');
    }

    if (this.abilityCheatUI.isOpen) {
      return;
    }

    // Toggle Map
    if (this.input.isJustPressed('map')) {
      if (this.mapUI.isOpen) {
        this.closeAllMenus();
      } else {
        this.closeAllMenus();
        this.mapUI.toggle();
        this.state = 'MAP';
      }
      return;
    }

    // Stag UI Update
    if (this.stagUI && this.stagUI.isOpen) {
      if (this.input.isJustPressed('pause') || this.input.isJustPressed('exit')) {
        this.closeAllMenus();
      }
      return;
    }

    // Dialogue State Update
    if (this.dialogueUI.isOpen) {
      this.dialogueUI.update(dt);
      if (
        this.input.isJustPressed('interact') ||
        this.input.isJustPressed('jump') ||
        this.input.isJustPressed('pause') ||
        this.input.isJustPressed('exit')
      ) {
        this.closeAllMenus();
      }
      return;
    }

    // Shop State Update
    if (this.shopUI.isOpen) {
      if (this.input.isJustPressed('up')) {
        this.shopUI.selectedIndex = Math.max(0, this.shopUI.selectedIndex - 1);
      }
      if (this.input.isJustPressed('down')) {
        this.shopUI.selectedIndex = Math.min(this.shopUI.items.length - 1, this.shopUI.selectedIndex + 1);
      }
      if (this.input.isJustPressed('jump')) {
        this.shopUI.buyItem(this.player, this.sound);
      }
      if (this.input.isJustPressed('pause') || this.input.isJustPressed('exit')) {
        this.closeAllMenus();
      }
      return;
    }

    // Inventory State Update
    if (this.inventoryUI.isOpen) {
      if (this.input.isJustPressed('up')) {
        this.inventoryUI.selectedIndex = Math.max(0, this.inventoryUI.selectedIndex - 1);
      }
      if (this.input.isJustPressed('down')) {
        const count = (this.player.charmsOwned || []).length;
        this.inventoryUI.selectedIndex = Math.min(count - 1, this.inventoryUI.selectedIndex + 1);
      }
      if (this.input.isJustPressed('jump')) {
        this.inventoryUI.toggleCharm(this.player);
      }
      if (this.input.isJustPressed('pause') || this.input.isJustPressed('exit')) {
        this.closeAllMenus();
      }
      return;
    }

    // Map State Update
    if (this.mapUI.isOpen) {
      if (this.input.isJustPressed('pause') || this.input.isJustPressed('exit')) {
        this.closeAllMenus();
      }
      return;
    }

    // Gameplay Pause / Open Inventory Trigger
    if (this.input.isJustPressed('pause')) {
      this.inventoryUI.open();
      this.state = 'BENCH';
      return;
    }

    // ----------------------------------------------------
    // GAMEPLAY STATE UPDATE
    // ----------------------------------------------------
    const room = this.world.currentRoom;
    this.sound.setBiome(room.biome);

    // Update Player & Physics
    this.player.update(dt, this.input, this.sound, this.particles, room, this.camera);
    this.camera.follow(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, dt);

    // Desolate Dive Impact Shockwave & AoE Destruction
    if (this.player.didDiveImpact) {
      this.player.didDiveImpact = false;
      const impactX = this.player.x + this.player.width / 2;
      const impactY = this.player.y + this.player.height;

      this.camera.shake(4, 0.18);
      this.sound.playBossRoar();
      this.particles.spawnShockwave(impactX, impactY, 160, '#ffffff');
      this.particles.spawnHitSparks(impactX, impactY, 24, '#88d6ff');

      // AoE Damage to Nearby Enemies
      if (room.enemies) {
        for (const enemy of room.enemies) {
          if (!enemy.active || enemy.isDead) continue;
          const edx = (enemy.x + enemy.width / 2) - impactX;
          const edy = (enemy.y + enemy.height / 2) - impactY;
          if (Math.hypot(edx, edy) <= 150) {
            const defeated = enemy.takeDamage(25, impactX, this.sound, this.particles, this.player);
            if (defeated) {
              const geoVal = typeof enemy.getGeoReward === 'function' ? enemy.getGeoReward() : (enemy.geoReward || 4);
              const coins = GeoCoin.createMultiDenominations(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, geoVal);
              room.collectibles.push(...coins);
            }
          }
        }
      }

      // AoE Destruction of Nearby Breakable Walls & Floors
      if (room.walls) {
        for (const wall of room.walls) {
          if (!wall.active || wall.isDestroyed) continue;
          const wdx = (wall.x + wall.width / 2) - impactX;
          const wdy = (wall.y + wall.height / 2) - impactY;
          if (Math.hypot(wdx, wdy) <= 150) {
            wall.takeDamage(5, this.sound, this.particles, room);
          }
        }
      }
    }

    // Howling Wraiths Upward Eruption & AoE Damage
    if (this.player.didShriekImpact) {
      this.player.didShriekImpact = false;
      const impactX = this.player.x + this.player.width / 2;
      const impactY = this.player.y;

      this.camera.shake(3, 0.15);
      this.sound.playBossRoar();
      this.particles.spawnShockwave(impactX, impactY - 40, 140, '#ffffff');
      this.particles.spawnHitSparks(impactX, impactY - 60, 24, '#88d6ff');

      // Upward AoE Damage to Nearby & Flying Enemies
      if (room.enemies) {
        for (const enemy of room.enemies) {
          if (!enemy.active || enemy.isDead) continue;
          const enemyCenterX = enemy.x + enemy.width / 2;
          const enemyCenterY = enemy.y + enemy.height / 2;
          const isHorizNear = Math.abs(enemyCenterX - impactX) <= 90;
          const isVertAbove = enemyCenterY <= impactY + 40 && enemyCenterY >= impactY - 200;

          if (isHorizNear && isVertAbove) {
            const defeated = enemy.takeDamage(30, impactX, this.sound, this.particles, this.player);
            if (defeated) {
              const geoVal = typeof enemy.getGeoReward === 'function' ? enemy.getGeoReward() : (enemy.geoReward || 4);
              const coins = GeoCoin.createMultiDenominations(enemyCenterX, enemyCenterY, geoVal);
              room.collectibles.push(...coins);
            }
          }
        }
      }
    }

    // Update Interactive Entities (Platforms, Walls, Void Gates)
    if (room.platforms) {
      for (const platform of room.platforms) {
        platform.update(dt, this.player, this.particles, this.sound);
      }
    }
    if (room.walls) {
      for (const wall of room.walls) {
        wall.update(dt);
      }
    }
    if (room.voidGates) {
      for (const gate of room.voidGates) {
        gate.update(dt, this.particles);
      }
    }

    // Player Environment & Hazard Attack Collisions (Pogo Jumping)
    if (this.player.isAttacking && this.player.attackHitbox) {
      const isDownAttack = this.player.attackDirection === 'down';
      const hitbox = this.player.attackHitbox;
      const hitCenterX = hitbox.x + hitbox.width / 2;
      const hitCenterY = hitbox.y + hitbox.height / 2;

      // 1. Down-slash over Acid
      if (isDownAttack && Physics.checkBoundsAcid(hitbox, room)) {
        this.player.pogoBounce();
        this.sound.playPogo();
        this.particles.spawnShockwave(hitCenterX, hitCenterY, 40, '#24a058');
        this.particles.spawnHitSparks(hitCenterX, hitCenterY, 8, '#40ff80');
      }
      // 2. Down-slash over Spikes
      else if (isDownAttack && Physics.checkBoundsHazard(hitbox, room)) {
        this.player.pogoBounce();
        this.sound.playPogo();
        this.particles.spawnHitSparks(hitCenterX, hitCenterY, 10, '#ffaa44');
      }

      // 3. Attack vs Crumbling Platforms
      if (room.platforms) {
        for (const platform of room.platforms) {
          if (platform.active && platform.solid && Physics.rectIntersect(hitbox, platform.getBounds())) {
            if (isDownAttack) {
              this.player.pogoBounce();
              this.sound.playPogo();
              this.particles.spawnHitSparks(hitCenterX, platform.y, 6, '#aaaaaa');
            }
            platform.onStepOn();
          }
        }
      }

      // 4. Attack vs Breakable Walls
      if (room.walls) {
        for (const wall of room.walls) {
          if (wall.active && wall.solid && Physics.rectIntersect(hitbox, wall.getBounds())) {
            if (isDownAttack) {
              this.player.pogoBounce();
              this.sound.playPogo();
            }
            wall.takeDamage(1, this.sound, this.particles, room);
          }
        }
      }
    }

    // Update Particles
    this.particles.update(dt);
    this.particles.spawnAmbientSpores(this.camera.bounds, 1);

    // Check Room Door Transitions (Blocked during active boss fight!)
    const activeBoss = room.enemies ? room.enemies.find(e => e.active && e.isBoss && !e.isDead) : null;
    if (!activeBoss && room.doors) {
      for (const door of room.doors) {
        if (Physics.rectIntersect(this.player.getBounds(), door)) {
          this.transitionRoom(door.targetRoomId, door.targetX, door.targetY);
          break;
        }
      }
    }

    // Check NPC Interactions & Updates
    if (room.npcs) {
      for (const npc of room.npcs) {
        if (typeof npc.update === 'function') {
          npc.update(dt, this.player);
        }
        const isNear = typeof npc.isPlayerNear === 'function'
          ? npc.isPlayerNear(this.player)
          : (Math.abs((this.player.x + this.player.width / 2) - npc.x) < 50 && Math.abs((this.player.y + this.player.height / 2) - npc.y) < 50);

        if (isNear && this.input.isJustPressed('interact')) {
          if (npc.isShop) {
            this.shopUI.open();
            this.state = 'SHOP';
          } else {
            this.dialogueUI.open(npc.name, npc.dialogue);
            this.state = 'DIALOGUE';
          }
        }
      }
    }

    // Check Bench Rest Interaction
    for (const bench of room.benches) {
      if (bench.isPlayerNear(this.player) && this.input.isJustPressed('interact')) {
        bench.rest(this.player, this.sound, this.particles, SaveSystem, this);
        this.inventoryUI.open();
        this.state = 'BENCH';
      }
    }

    // Check Stag Station Fast Travel Interaction
    if (room.stagStations) {
      for (const station of room.stagStations) {
        if (station.isPlayerNear(this.player) && this.input.isJustPressed('interact')) {
          this.sound.playBenchBell();
          this.stagUI.open(station.stationId);
          this.state = 'STAG';
        }
      }
    }

    // Check Collectible Pickups
    for (let i = room.collectibles.length - 1; i >= 0; i--) {
      const item = room.collectibles[i];
      item.update(dt, this.player, this.sound, this.particles, room);
      if (!item.active) {
        room.collectibles.splice(i, 1);
      }
    }

    // Enemy AI & Combat Collisions
    for (let i = room.enemies.length - 1; i >= 0; i--) {
      const enemy = room.enemies[i];

      // Enemy Defeat & Boss Rewards
      if (enemy.isDead && !enemy.rewardSpawned) {
        enemy.rewardSpawned = true;
        const geoVal = typeof enemy.getGeoReward === 'function' ? enemy.getGeoReward() : (enemy.geoReward || 4);
        const coins = GeoCoin.createMultiDenominations(
          enemy.x + enemy.width / 2,
          enemy.y + enemy.height / 2,
          geoVal
        );
        room.collectibles.push(...coins);

        if (enemy.isBoss) {
          if (enemy.bossName.includes('FALSE KNIGHT')) {
            this.bossesDefeated.falseKnight = true;
            if (!this.player.abilities.vengefulSpirit) {
              const spellPedestal = new AbilityUnlock(1680, 520, 'vengefulSpirit', 'Vengeful Spirit (Spell)');
              room.collectibles.push(spellPedestal);
              this.sound.playBossRoar();
              this.particles.spawnShockwave(1680, 520, 140, '#88d6ff');
              this.particles.spawnHitSparks(1680, 520, 24, '#ffffff');
            }
          }
          if (enemy.bossName.includes('HORNET')) {
            this.bossesDefeated.hornet = true;
            if (!this.player.abilities.howlingWraiths) {
              const wraithPedestal = new AbilityUnlock(400, 606, 'howlingWraiths', 'Howling Wraiths (Spell)');
              room.collectibles.push(wraithPedestal);
              this.sound.playBossRoar();
              this.particles.spawnShockwave(400, 606, 140, '#ffffff');
              this.particles.spawnHitSparks(400, 606, 24, '#88d6ff');
            }
            if (!this.player.abilities.superDash) {
              const superDashPedestal = new AbilityUnlock(550, 606, 'superDash', 'Crystal Heart (Super Dash - Hold [F])');
              room.collectibles.push(superDashPedestal);
              this.particles.spawnShockwave(550, 606, 140, '#ff66cc');
              this.particles.spawnHitSparks(550, 606, 24, '#ff66cc');
            }
          }
        }
      }

      if (!enemy.active) continue;

      // Update Active Enemy AI & Physics
      enemy.update(dt, this.player, room, this.sound, this.particles, this.camera);

      // Player Attack vs Enemy Hitbox
      if (this.player.isAttacking && this.player.attackHitbox && Physics.rectIntersect(this.player.attackHitbox, enemy.getBounds())) {
        const isDownAttack = this.player.attackDirection === 'down';
        const defeated = enemy.takeDamage(1, this.player.x, this.sound, this.particles, this.player);

        if (isDownAttack) {
          this.player.pogoBounce();
          this.sound.playPogo();
        }
      }

      // Enemy Collision vs Player
      if (enemy.active && !enemy.isDead && Physics.rectIntersect(enemy.getBounds(), this.player.getBounds())) {
        this.player.takeDamage(1, enemy.x, this.sound, this.particles, this.camera);
      }
    }

    // Player Death Respawn Check
    if (this.player.masks <= 0) {
      this.sound.playBossRoar();
      const saveData = SaveSystem.load();
      this.world.loadRoom(saveData.lastBenchRoom || 'dirtmouth_01');
      this.player.x = saveData.lastBenchX || 700;
      this.player.y = saveData.lastBenchY || 580;
      this.player.masks = this.player.maxMasks;
      this.player.soul = this.player.maxSoul;
      if (this.world && typeof this.world.respawnEnemies === 'function') {
        this.world.respawnEnemies();
      }
      this.camera.setBounds(0, 0, this.world.currentRoom.width, this.world.currentRoom.height);
      this.camera.snapTo(this.player.x, this.player.y);
    }
  }

  transitionRoom(roomId, spawnX, spawnY) {
    if (this.world.loadRoom(roomId)) {
      this.visitedRooms.add(roomId);
      const room = this.world.currentRoom;
      this.player.x = spawnX;
      this.player.y = spawnY;
      this.player.lastSafeX = spawnX;
      this.player.lastSafeY = spawnY;
      this.player.vx = 0;
      this.player.vy = 0;

      // Spawn Vengeful Spirit Pedestal ONLY if False Knight has been defeated and ability is not yet unlocked
      if (roomId === 'boss_false_knight' && this.bossesDefeated.falseKnight && !this.player.abilities.vengefulSpirit) {
        const hasPedestal = room.collectibles.some(c => c.abilityKey === 'vengefulSpirit');
        if (!hasPedestal) {
          room.collectibles.push(new AbilityUnlock(1680, 520, 'vengefulSpirit', 'Vengeful Spirit (Spell)'));
        }
      }

      // Spawn Howling Wraiths & Crystal Heart Pedestals ONLY if Hornet has been defeated and abilities are not yet unlocked
      if (roomId === 'boss_hornet' && this.bossesDefeated.hornet) {
        if (!this.player.abilities.howlingWraiths) {
          const hasPedestal = room.collectibles.some(c => c.abilityKey === 'howlingWraiths');
          if (!hasPedestal) {
            room.collectibles.push(new AbilityUnlock(400, 606, 'howlingWraiths', 'Howling Wraiths (Spell)'));
          }
        }
        if (!this.player.abilities.superDash) {
          const hasPedestal = room.collectibles.some(c => c.abilityKey === 'superDash');
          if (!hasPedestal) {
            room.collectibles.push(new AbilityUnlock(550, 606, 'superDash', 'Crystal Heart (Super Dash - Hold [F])'));
          }
        }
      }

      this.camera.setBounds(0, 0, room.width, room.height);
      this.camera.snapTo(spawnX, spawnY);
      this.sound.playSlash();
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const room = this.world.currentRoom;

    // 1. Draw World Tiles & Parallax
    this.world.draw(this.ctx, this.camera);

    // 1b. Draw Platforms, Breakable Walls & Void Gates
    if (room.platforms) {
      for (const platform of room.platforms) {
        platform.draw(this.ctx, this.camera);
      }
    }
    if (room.walls) {
      for (const wall of room.walls) {
        wall.draw(this.ctx, this.camera);
      }
    }
    if (room.voidGates) {
      for (const gate of room.voidGates) {
        gate.draw(this.ctx, this.camera);
      }
    }

    // 2. Draw NPCs, Benches & Stag Stations
    for (const npc of room.npcs) {
      if (typeof npc.draw === 'function') {
        const isNear = typeof npc.isPlayerNear === 'function' ? npc.isPlayerNear(this.player) : false;
        npc.draw(this.ctx, this.camera, isNear);
      } else {
        const view = this.camera.getView();
        this.ctx.fillStyle = '#f0c040';
        this.ctx.font = '12px Cinzel, serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${npc.name} [E]`, npc.x - view.x, npc.y - view.y - 10);
      }
    }

    for (const bench of room.benches) {
      bench.draw(this.ctx, this.camera, bench.isPlayerNear(this.player));
    }

    if (room.stagStations) {
      for (const station of room.stagStations) {
        station.draw(this.ctx, this.camera, station.isPlayerNear(this.player));
      }
    }

    // 3. Draw Collectibles
    for (const item of room.collectibles) {
      item.draw(this.ctx, this.camera);
    }

    // 4. Draw Enemies & Bosses
    let currentBoss = null;
    for (const enemy of room.enemies) {
      if (enemy.active) {
        enemy.draw(this.ctx, this.camera);
        if (enemy.isBoss && !enemy.isDead) currentBoss = enemy;
      }
    }

    // Draw Locked Iron Portcullis Gates over Exits during Boss Fight
    if (currentBoss && room.doors) {
      for (const door of room.doors) {
        const view = this.camera.getView();
        const screenX = Math.round(door.x - view.x);
        const screenY = Math.round(door.y - view.y);

        this.ctx.save();
        // Heavy Iron Gate Bars Background
        this.ctx.fillStyle = 'rgba(12, 16, 24, 0.92)';
        this.ctx.fillRect(screenX, screenY, door.width, door.height);

        this.ctx.strokeStyle = '#e63946';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(screenX, screenY, door.width, door.height);

        // Vertical Grate Bars
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 2.5;
        for (let bx = screenX + 8; bx < screenX + door.width; bx += 14) {
          this.ctx.beginPath();
          this.ctx.moveTo(bx, screenY);
          this.ctx.lineTo(bx, screenY + door.height);
          this.ctx.stroke();
        }

        // Glowing Red Lock Rune Symbol
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = '700 12px Cinzel, serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🔒 LOCKED', screenX + door.width / 2, screenY + door.height / 2 + 4);

        this.ctx.restore();
      }
    }

    // 5. Draw Player & Particles
    this.player.draw(this.ctx, this.camera);
    this.particles.draw(this.ctx, this.camera);

    // 6. Draw HUD & UI Overlays
    this.hud.draw(this.ctx, this.player, currentBoss, this.input, this.sound, this.particles, room);
    this.mapUI.draw(this.ctx, this.width, this.height, room.id, this.visitedRooms, this.player.hasCharm('WAYWARD_COMPASS'), this.input, (targetId) => this.teleportToRoom(targetId));
    this.shopUI.draw(this.ctx, this.width, this.height, this.player, this.input);
    this.dialogueUI.draw(this.ctx, this.width, this.height, this.input);
    this.inventoryUI.draw(this.ctx, this.width, this.height, this.player, this.state === 'BENCH', this.input);
    if (this.stagUI && this.stagUI.isOpen) {
      this.stagUI.draw(this.ctx, this.width, this.height, this.input, this.sound, (st) => this.travelViaStag(st));
    }
    if (this.abilityCheatUI && this.abilityCheatUI.isOpen) {
      this.abilityCheatUI.draw(this.ctx, this.width, this.height, this.input, this.sound, SaveSystem);
    }

    // Fallback safety state reset
    if (!this.dialogueUI.isOpen && !this.shopUI.isOpen && !this.inventoryUI.isOpen && !this.mapUI.isOpen && (!this.stagUI || !this.stagUI.isOpen) && (!this.abilityCheatUI || !this.abilityCheatUI.isOpen) && this.state !== 'GAMEPLAY') {
      this.state = 'GAMEPLAY';
    }
  }
}
