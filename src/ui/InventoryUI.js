import { CHARMS } from '../game/Charms.js';

export class InventoryUI {
  constructor() {
    this.isOpen = false;
    this.selectedIndex = 0;
  }

  open() {
    this.isOpen = true;
    this.selectedIndex = 0;
  }

  close() {
    this.isOpen = false;
  }

  toggleCharm(player) {
    const owned = player.charmsOwned || ['WAYWARD_COMPASS'];
    const charmId = owned[this.selectedIndex];
    if (!charmId) return;

    const charm = CHARMS[charmId];
    if (!charm) return;

    if (!player.equippedCharms) player.equippedCharms = [];

    const isEquipped = player.equippedCharms.includes(charmId);

    if (isEquipped) {
      player.equippedCharms = player.equippedCharms.filter(id => id !== charmId);
    } else {
      const currentCost = player.equippedCharms.reduce((sum, id) => sum + (CHARMS[id]?.cost || 0), 0);
      const notchCapacity = player.notchCount || 3;

      if (currentCost + charm.cost <= notchCapacity) {
        player.equippedCharms.push(charmId);
      }
    }
  }

  draw(ctx, width, height, player, atBench, input) {
    if (!this.isOpen) return;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 18, 0.94)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#eaf4ff';
    ctx.font = '26px Cinzel Decorative, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHARMS & ABILITIES', width / 2, 55);

    const notchCapacity = player.notchCount || 3;
    const currentCost = (player.equippedCharms || []).reduce((sum, id) => sum + (CHARMS[id]?.cost || 0), 0);
    ctx.fillStyle = '#b0c4de';
    ctx.font = '14px Cinzel, serif';
    ctx.fillText(`Notches Used: ${currentCost} / ${notchCapacity}`, width / 2, 85);

    // Top Right Close Button [✕ Exit Menu]
    const closeBtnX = width - 150;
    const closeBtnY = 25;
    const closeBtnW = 120;
    const closeBtnH = 36;

    ctx.fillStyle = 'rgba(180, 40, 40, 0.8)';
    ctx.strokeStyle = '#ffcf40';
    ctx.lineWidth = 1.5;
    ctx.fillRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    ctx.strokeRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('✕ Exit [Esc/E]', closeBtnX + closeBtnW / 2, closeBtnY + 23);

    const owned = player.charmsOwned || ['WAYWARD_COMPASS'];
    const startY = 135;

    owned.forEach((charmId, idx) => {
      const charm = CHARMS[charmId];
      if (!charm) return;
      const y = startY + idx * 60;
      const isSelected = idx === this.selectedIndex;
      const isEquipped = (player.equippedCharms || []).includes(charmId);

      ctx.fillStyle = isSelected ? 'rgba(40, 60, 90, 0.85)' : 'rgba(20, 28, 42, 0.6)';
      ctx.strokeStyle = isSelected ? '#ffcf40' : 'rgba(120, 160, 200, 0.2)';
      ctx.lineWidth = isSelected ? 2 : 1;

      ctx.fillRect(width / 2 - 270, y - 20, 540, 50);
      ctx.strokeRect(width / 2 - 270, y - 20, 540, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Cinzel, serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${charm.icon} ${charm.name} (${charm.cost} Notch)`, width / 2 - 250, y + 10);

      ctx.textAlign = 'right';
      if (isEquipped) {
        ctx.fillStyle = '#88d6ff';
        ctx.fillText('EQUIPPED', width / 2 + 250, y + 10);
      } else {
        ctx.fillStyle = '#607088';
        ctx.fillText('UNEQUIPPED', width / 2 + 250, y + 10);
      }
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Cinzel, serif';
    ctx.textAlign = 'center';
    if (atBench) {
      ctx.fillText('Select [W/S / Arrows]  |  Equip/Unequip [Space / Enter]  |  Exit [Esc / E / Q]', width / 2, height - 35);
    } else {
      ctx.fillText('Rest at a Bench to equip Charms  |  Exit [Esc / E / Q]', width / 2, height - 35);
    }

    ctx.restore();

    // Mouse click check
    if (input && input.mouseClicked) {
      const mx = input.mousePos.x;
      const my = input.mousePos.y;

      if (mx >= closeBtnX && mx <= closeBtnX + closeBtnW && my >= closeBtnY && my <= closeBtnY + closeBtnH) {
        this.close();
      } else if (atBench) {
        owned.forEach((charmId, idx) => {
          const y = startY + idx * 60;
          if (mx >= width / 2 - 270 && mx <= width / 2 + 270 && my >= y - 20 && my <= y + 30) {
            this.selectedIndex = idx;
            this.toggleCharm(player);
          }
        });
      }
    }
  }
}
