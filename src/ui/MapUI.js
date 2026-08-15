export class MapUI {
  constructor() {
    this.isOpen = false;
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  close() {
    this.isOpen = false;
  }

  draw(ctx, width, height, currentRoomId, visitedRooms, hasWaywardCompass, input, onTeleport) {
    if (!this.isOpen) return;

    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 16, 0.95)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffcf40';
    ctx.font = '700 26px Cinzel Decorative, serif';
    ctx.textAlign = 'center';
    ctx.fillText('HALLOWNEST METROIDVANIA MAP', width / 2, 42);

    ctx.fillStyle = '#88a6cc';
    ctx.font = '13px Cinzel, serif';
    ctx.fillText('Click any room node to fast-travel & explore abilities', width / 2, 65);

    // Top Right Close Button [✕ Close Map]
    const closeBtnX = width - 140;
    const closeBtnY = 16;
    const closeBtnW = 110;
    const closeBtnH = 34;

    ctx.fillStyle = 'rgba(180, 40, 40, 0.85)';
    ctx.strokeStyle = '#ffcf40';
    ctx.lineWidth = 1.5;
    ctx.fillRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    ctx.strokeRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('✕ Exit [Esc/M]', closeBtnX + closeBtnW / 2, closeBtnY + 21);

    const cx = width / 2;

    // 16 Room Node Positions with Ability & Gate Indicators
    const mapNodes = [
      { id: 'kings_pass', name: "King's Pass", x: cx - 240, y: 100, color: '#3a4a5e', info: 'Tutorial Caverns' },
      { id: 'dirtmouth_01', name: 'Dirtmouth Town', x: cx, y: 100, color: '#4a607a', info: 'Bench Sanctuary' },
      { id: 'crossroads_01', name: 'Upper Crossroads', x: cx, y: 175, color: '#3a5078', info: 'Ancestral Path' },
      { id: 'boss_false_knight', name: 'Ancestral Mound', x: cx + 240, y: 175, color: '#7a3038', info: '🔮 Boss: False Knight' },
      { id: 'crystal_peak', name: 'Crystal Peak Mines', x: cx + 260, y: 255, color: '#5a205c', info: '🧗 Mantis Claw (Wall Jump)' },
      { id: 'crossroads_02', name: 'Lower Crossroads', x: cx, y: 255, color: '#3a5078', info: 'Stag Station & Bench' },
      { id: 'greenpath_01', name: 'Greenpath Caverns', x: cx - 240, y: 255, color: '#2a6a48', info: 'Acid Pogo Gaps' },
      { id: 'greenpath_02', name: 'Fungal Wastes', x: cx - 380, y: 255, color: '#2a6a48', info: '🦋 Mothwing Cloak (Dash)' },
      { id: 'boss_hornet', name: 'Hornet Sanctuary', x: cx - 380, y: 340, color: '#9a2a38', info: '🗡️ Boss: Hornet' },
      { id: 'mantis_village', name: 'Mantis Village', x: cx - 380, y: 430, color: '#244830', info: '👑 Boss: Mantis Lords' },
      { id: 'fog_canyon', name: 'Fog Canyon Archives', x: cx - 240, y: 340, color: '#2a5a58', info: 'Acid Chasms' },
      { id: 'deepnest', name: 'Deepnest Caverns', x: cx - 240, y: 430, color: '#241a2c', info: '🌑 Shade Cloak (Shadow Dash)' },
      { id: 'city_of_tears', name: 'City of Tears', x: cx + 80, y: 340, color: '#204064', info: '600px Wall Climb Shaft' },
      { id: 'soul_sanctum', name: 'Soul Sanctum', x: cx + 260, y: 340, color: '#3a2058', info: '✨ Boss: Soul Master' },
      { id: 'royal_waterways', name: 'Royal Waterways', x: cx + 80, y: 430, color: '#283c2a', info: '💩 Boss: Dung Defender' },
      { id: 'the_abyss', name: 'The Ancient Abyss', x: cx - 80, y: 490, color: '#10141a', info: 'Void Heart & Terminal' }
    ];

    // Node Connections
    const connections = [
      ['kings_pass', 'dirtmouth_01'],
      ['dirtmouth_01', 'crossroads_01'],
      ['crossroads_01', 'boss_false_knight'],
      ['boss_false_knight', 'crossroads_02'],
      ['crossroads_01', 'crossroads_02'],
      ['crossroads_02', 'crystal_peak'],
      ['crystal_peak', 'city_of_tears'],
      ['crossroads_02', 'greenpath_01'],
      ['greenpath_01', 'greenpath_02'],
      ['greenpath_02', 'boss_hornet'],
      ['greenpath_02', 'mantis_village'],
      ['mantis_village', 'deepnest'],
      ['boss_hornet', 'fog_canyon'],
      ['greenpath_01', 'fog_canyon'],
      ['fog_canyon', 'deepnest'],
      ['deepnest', 'city_of_tears'],
      ['fog_canyon', 'city_of_tears'],
      ['crossroads_02', 'city_of_tears'],
      ['city_of_tears', 'soul_sanctum'],
      ['soul_sanctum', 'royal_waterways'],
      ['city_of_tears', 'royal_waterways'],
      ['royal_waterways', 'the_abyss'],
      ['crossroads_02', 'the_abyss'],
      ['deepnest', 'the_abyss']
    ];

    // Draw Line Connections
    ctx.strokeStyle = 'rgba(140, 180, 230, 0.45)';
    ctx.lineWidth = 2.5;

    connections.forEach(([fromId, toId]) => {
      const n1 = mapNodes.find(n => n.id === fromId);
      const n2 = mapNodes.find(n => n.id === toId);
      if (n1 && n2) {
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
      }
    });

    // Render Nodes & Check Mouse Interactivity
    let hoveredNode = null;

    mapNodes.forEach(node => {
      const isVisited = visitedRooms.has(node.id);
      const isCurrent = node.id === currentRoomId;

      const nW = 160;
      const nH = 38;

      const leftX = node.x - nW / 2;
      const topY = node.y - nH / 2;

      // Mouse Hover Check
      let isHovered = false;
      if (input && input.mousePos) {
        const mx = input.mousePos.x;
        const my = input.mousePos.y;
        if (mx >= leftX && mx <= leftX + nW && my >= topY && my <= topY + nH) {
          isHovered = true;
          hoveredNode = node;
        }
      }

      ctx.fillStyle = isCurrent ? 'rgba(50, 90, 140, 0.95)' : (isHovered ? 'rgba(40, 70, 110, 0.9)' : node.color);
      ctx.strokeStyle = isCurrent ? '#ffcf40' : (isHovered ? '#88d6ff' : '#405878');
      ctx.lineWidth = isCurrent ? 3 : (isHovered ? 2.5 : 1.5);

      ctx.fillRect(leftX, topY, nW, nH);
      ctx.strokeRect(leftX, topY, nW, nH);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 12px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, node.x, node.y - 3);

      ctx.fillStyle = '#ffcf40';
      ctx.font = '10px Cinzel, serif';
      ctx.fillText(node.info, node.x, node.y + 12);

      if (isCurrent && hasWaywardCompass) {
        ctx.fillStyle = '#ffcf40';
        ctx.font = '12px serif';
        ctx.fillText('🧭 YOU ARE HERE', node.x, topY - 8);
      }
    });

    ctx.fillStyle = '#a0b0cc';
    ctx.font = '13px Cinzel, serif';
    ctx.fillText('Press [M / Tab / Esc] or Click any room node to Teleport', width / 2, height - 20);

    ctx.restore();

    // Handle Mouse Clicks
    if (input && input.mouseClicked) {
      const mx = input.mousePos.x;
      const my = input.mousePos.y;

      if (mx >= closeBtnX && mx <= closeBtnX + closeBtnW && my >= closeBtnY && my <= closeBtnY + closeBtnH) {
        this.close();
        return;
      }

      if (hoveredNode && onTeleport) {
        onTeleport(hoveredNode.id);
        this.close();
      }
    }
  }
}
