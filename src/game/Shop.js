import { CHARMS } from './Charms.js';

export class Shop {
  constructor() {
    this.isOpen = false;
    this.items = [
      { charmId: 'WAYWARD_COMPASS', price: 120 },
      { charmId: 'LONGNAIL', price: 220 },
      { charmId: 'QUICK_FOCUS', price: 300 },
      { charmId: 'SOUL_CATCHER', price: 250 },
      { charmId: 'DASHMASTER', price: 280 }
    ];
    this.selectedIndex = 0;
  }

  open() {
    this.isOpen = true;
    this.selectedIndex = 0;
  }

  close() {
    this.isOpen = false;
  }

  buyItem(player, soundManager) {
    const item = this.items[this.selectedIndex];
    if (!item) return;

    if (!player.charmsOwned) player.charmsOwned = ['WAYWARD_COMPASS'];

    if (player.charmsOwned.includes(item.charmId)) {
      return; // Already owned
    }

    if (player.geo >= item.price) {
      player.geo -= item.price;
      player.charmsOwned.push(item.charmId);
      soundManager.playGeo();
      soundManager.playBenchBell();
    }
  }

  draw(ctx, width, height, player, input) {
    if (!this.isOpen) return;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 18, 0.94)';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#ffcf40';
    ctx.font = '26px Cinzel Decorative, serif';
    ctx.textAlign = 'center';
    ctx.fillText("SLY'S SHOP - DIRTMOUTH", width / 2, 55);

    ctx.fillStyle = '#b0c4de';
    ctx.font = '14px Cinzel, serif';
    ctx.fillText(`Your Geo: ${player.geo} Geo`, width / 2, 85);

    // Top Right Close Button [✕ Close Shop]
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

    // Item List
    const startY = 135;
    const itemHeight = 65;

    this.items.forEach((item, idx) => {
      const charm = CHARMS[item.charmId];
      const y = startY + idx * itemHeight;
      const isSelected = idx === this.selectedIndex;
      const isOwned = (player.charmsOwned || []).includes(item.charmId);

      ctx.fillStyle = isSelected ? 'rgba(40, 60, 90, 0.85)' : 'rgba(20, 28, 42, 0.6)';
      ctx.strokeStyle = isSelected ? '#ffcf40' : 'rgba(120, 160, 200, 0.2)';
      ctx.lineWidth = isSelected ? 2 : 1;

      ctx.fillRect(width / 2 - 270, y - 20, 540, 56);
      ctx.strokeRect(width / 2 - 270, y - 20, 540, 56);

      // Icon & Name
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Cinzel, serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${charm.icon} ${charm.name}`, width / 2 - 250, y + 10);

      // Description
      ctx.fillStyle = '#a0b0cc';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(charm.desc, width / 2 - 250, y + 26);

      // Price / Owned
      ctx.textAlign = 'right';
      if (isOwned) {
        ctx.fillStyle = '#88d6ff';
        ctx.fillText('PURCHASED', width / 2 + 250, y + 14);
      } else {
        ctx.fillStyle = player.geo >= item.price ? '#ffcf40' : '#ff5555';
        ctx.fillText(`${item.price} Geo`, width / 2 + 250, y + 14);
      }
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Select [W/S / Arrows]  |  Buy [Space / Enter]  |  Exit [Esc / E / Q]', width / 2, height - 35);

    ctx.restore();

    // Mouse click check for close button or items
    if (input && input.mouseClicked) {
      const mx = input.mousePos.x;
      const my = input.mousePos.y;

      if (mx >= closeBtnX && mx <= closeBtnX + closeBtnW && my >= closeBtnY && my <= closeBtnY + closeBtnH) {
        this.close();
      } else {
        this.items.forEach((item, idx) => {
          const y = startY + idx * itemHeight;
          if (mx >= width / 2 - 270 && mx <= width / 2 + 270 && my >= y - 20 && my <= y + 36) {
            this.selectedIndex = idx;
            this.buyItem(player, player.soundManager || { playGeo: () => {}, playBenchBell: () => {} });
          }
        });
      }
    }
  }
}
