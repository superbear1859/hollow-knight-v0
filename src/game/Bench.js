import { Physics } from '../engine/Physics.js';

export class Bench {
  constructor(x, y, roomId) {
    this.x = x;
    this.y = y;
    this.width = 48;
    this.height = 24;
    this.roomId = roomId;
  }

  isPlayerNear(player) {
    return Math.abs((player.x + player.width / 2) - (this.x + this.width / 2)) < 40 &&
           Math.abs((player.y + player.height) - (this.y + this.height)) < 30;
  }

  rest(player, soundManager, particles, saveSystem, game) {
    player.masks = player.maxMasks;
    player.soul = player.maxSoul;

    soundManager.playBenchBell();
    particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 80, '#b0e2ff');

    if (game && game.world && typeof game.world.respawnEnemies === 'function') {
      game.world.respawnEnemies();
    }

    const saveData = {
      geo: player.geo,
      maxMasks: player.maxMasks,
      masks: player.masks,
      soul: player.soul,
      maxSoul: player.maxSoul,
      unlockedAbilities: player.abilities,
      charmsOwned: player.charmsOwned || ['WAYWARD_COMPASS'],
      charmsEquipped: player.equippedCharms,
      notchCount: player.notchCount || 3,
      visitedRooms: Array.from(game.visitedRooms || ['dirtmouth_01']),
      bossesDefeated: game.bossesDefeated || { falseKnight: false, hornet: false },
      lastBenchRoom: this.roomId,
      lastBenchX: this.x + 12,
      lastBenchY: this.y - 10
    };

    saveSystem.save(saveData);
  }

  draw(ctx, camera, playerNear) {
    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();

    // Wrought Iron Bench frame
    ctx.fillStyle = '#222938';
    ctx.fillRect(screenX, screenY + 12, 48, 12);
    ctx.fillStyle = '#404e68';
    ctx.fillRect(screenX + 4, screenY + 8, 40, 4);

    // Bench legs
    ctx.fillStyle = '#141822';
    ctx.fillRect(screenX + 4, screenY + 18, 6, 12);
    ctx.fillRect(screenX + 38, screenY + 18, 6, 12);

    if (playerNear) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText('[E] Rest at Bench', screenX + 24, screenY - 10);
    }

    ctx.restore();
  }
}
