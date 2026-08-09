import { Entity } from '../entities/Entity.js';

export class StagStation extends Entity {
  constructor(x, y, stationId, name, roomId) {
    super(x, y, 64, 48);
    this.stationId = stationId;
    this.name = name;
    this.roomId = roomId;
    this.interactRadius = 140;
    this.active = true;
  }

  isPlayerNear(player) {
    if (!player) return false;
    const dx = Math.abs((player.x + player.width / 2) - (this.x + this.width / 2));
    const dy = Math.abs((player.y + player.height / 2) - (this.y + this.height / 2));
    return dx < this.interactRadius && dy < this.interactRadius;
  }

  draw(ctx, camera, isPlayerNear) {
    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();

    // Stag Station Iron Arch & Bell Structure
    ctx.fillStyle = '#1c2434';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;

    ctx.fillRect(screenX, screenY + 10, this.width, this.height - 10);
    ctx.strokeRect(screenX, screenY + 10, this.width, this.height - 10);

    // Glowing Golden Bell Icon
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(screenX + this.width / 2, screenY + 24, 12, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#101726';
    ctx.font = '700 11px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('STAG', screenX + this.width / 2, screenY + 42);

    // Interactive Proximity Banner
    if (isPlayerNear) {
      ctx.fillStyle = 'rgba(10, 16, 28, 0.9)';
      ctx.strokeStyle = '#ffcf40';
      ctx.lineWidth = 1.5;
      const promptW = 190;
      const promptH = 26;
      const promptX = screenX + this.width / 2 - promptW / 2;
      const promptY = screenY - 24;

      ctx.fillRect(promptX, promptY, promptW, promptH);
      ctx.strokeRect(promptX, promptY, promptW, promptH);

      ctx.fillStyle = '#ffcf40';
      ctx.font = '700 11px Cinzel, serif';
      ctx.fillText(`🔔 CALL STAG [E / DOWN]`, screenX + this.width / 2, promptY + 17);
    }

    ctx.restore();
  }
}
