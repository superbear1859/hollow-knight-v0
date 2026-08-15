export class StagUI {
  constructor() {
    this.isOpen = false;
    this.currentStationId = 'dirtmouth';
    this.selectedIndex = 0;
    this.stations = [
      { id: 'dirtmouth', name: 'Dirtmouth Town Station', roomId: 'dirtmouth_01', x: 600, y: 600 },
      { id: 'crossroads', name: 'Crossroads Basin Station', roomId: 'crossroads_02', x: 1500, y: 944 },
      { id: 'greenpath', name: 'Greenpath Canopy Station', roomId: 'greenpath_01', x: 3800, y: 944 },
      { id: 'city_of_tears', name: 'City of Tears Central Station', roomId: 'city_of_tears', x: 2100, y: 944 },
      { id: 'deepnest', name: 'Deepnest Distant Village Station', roomId: 'deepnest', x: 600, y: 944 },
      { id: 'the_abyss', name: 'Abyss Ancient Terminal Station', roomId: 'the_abyss', x: 1750, y: 944 }
    ];
  }

  open(currentStationId) {
    this.isOpen = true;
    this.currentStationId = currentStationId;
    this.selectedIndex = Math.max(0, this.stations.findIndex(s => s.id === currentStationId));
  }

  close() {
    this.isOpen = false;
  }

  draw(ctx, width, height, input, soundManager, onTravel) {
    if (!this.isOpen) return;

    ctx.save();

    // Dark Blur Overlay
    ctx.fillStyle = 'rgba(6, 10, 18, 0.92)';
    ctx.fillRect(0, 0, width, height);

    // Title Header
    ctx.fillStyle = '#ffcf40';
    ctx.font = '700 26px Cinzel Decorative, serif';
    ctx.textAlign = 'center';
    ctx.fillText('LAST STAG FAST-TRAVEL NETWORK', width / 2, 55);

    ctx.fillStyle = '#88a6cc';
    ctx.font = '13px Cinzel, serif';
    ctx.fillText('Select a Stag Station destination across Hallownest', width / 2, 80);

    // Station Selection List
    const startY = 130;
    const itemH = 50;
    const itemW = 540;
    const itemX = (width - itemW) / 2;

    this.stations.forEach((st, idx) => {
      const y = startY + idx * (itemH + 12);
      const isSelected = idx === this.selectedIndex;
      const isCurrent = st.id === this.currentStationId;

      ctx.save();
      ctx.fillStyle = isSelected ? 'rgba(40, 80, 130, 0.85)' : 'rgba(15, 24, 40, 0.7)';
      ctx.strokeStyle = isSelected ? '#ffcf40' : (isCurrent ? '#88d6ff' : '#304058');
      ctx.lineWidth = isSelected ? 2.5 : 1.5;

      ctx.fillRect(itemX, y, itemW, itemH);
      ctx.strokeRect(itemX, y, itemW, itemH);

      ctx.fillStyle = isSelected ? '#ffffff' : (isCurrent ? '#88d6ff' : '#a0b0cc');
      ctx.font = '700 15px Cinzel, serif';
      ctx.textAlign = 'left';
      ctx.fillText(st.name, itemX + 25, y + 30);

      if (isCurrent) {
        ctx.fillStyle = '#ffcf40';
        ctx.font = '700 12px Cinzel, serif';
        ctx.textAlign = 'right';
        ctx.fillText('✦ YOU ARE HERE', itemX + itemW - 25, y + 30);
      } else if (isSelected) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 12px Cinzel, serif';
        ctx.textAlign = 'right';
        ctx.fillText('PRESS [JUMP / ENTER] TO TRAVEL ►', itemX + itemW - 25, y + 30);
      }

      ctx.restore();

      // Check Mouse Hover & Clicks
      if (input && input.mousePos) {
        const mx = input.mousePos.x;
        const my = input.mousePos.y;
        if (mx >= itemX && mx <= itemX + itemW && my >= y && my <= y + itemH) {
          if (this.selectedIndex !== idx) {
            this.selectedIndex = idx;
            if (soundManager && soundManager.playSlash) soundManager.playSlash();
          }
          if (input.mouseClicked && onTravel) {
            onTravel(st);
          }
        }
      }
    });

    // Navigation Controls Legend
    ctx.fillStyle = '#a0b0cc';
    ctx.font = '13px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Use [W / S / UP / DOWN] to navigate  •  [SPACE / ENTER] to travel  •  [ESC / P] to exit', width / 2, height - 30);

    ctx.restore();

    // Key Input Handling
    if (input) {
      if (input.isJustPressed('up')) {
        this.selectedIndex = (this.selectedIndex - 1 + this.stations.length) % this.stations.length;
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      }
      if (input.isJustPressed('down')) {
        this.selectedIndex = (this.selectedIndex + 1) % this.stations.length;
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      }
      if ((input.isJustPressed('jump') || input.isJustPressed('interact')) && onTravel) {
        onTravel(this.stations[this.selectedIndex]);
      }
    }
  }
}
