import { Entity } from '../entities/Entity.js';

export class StagStation extends Entity {
  constructor(x, y, stationId, name, roomId) {
    super(x, y, 32, 28);
    this.stationId = stationId;
    this.name = name;
    this.roomId = roomId;
    this.interactRadius = 80;
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

    // Sleek Compact Wrought Iron Post
    ctx.fillStyle = '#181e2b';
    ctx.strokeStyle = '#c5a038';
    ctx.lineWidth = 1.5;

    // Post Pillar
    ctx.fillRect(screenX + 12, screenY + 10, 8, 18);
    ctx.strokeRect(screenX + 12, screenY + 10, 8, 18);

    // Golden Bell Top Dome
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(screenX + this.width / 2, screenY + 9, 7, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Small Bell Ringing Base
    ctx.fillStyle = '#ffcf40';
    ctx.fillRect(screenX + this.width / 2 - 8, screenY + 9, 16, 3);

    // Interactive Proximity Banner (Sleek & Compact)
    if (isPlayerNear) {
      ctx.fillStyle = 'rgba(10, 16, 28, 0.9)';
      ctx.strokeStyle = '#ffcf40';
      ctx.lineWidth = 1.2;
      const promptW = 140;
      const promptH = 20;
      const promptX = screenX + this.width / 2 - promptW / 2;
      const promptY = screenY - 18;

      ctx.fillRect(promptX, promptY, promptW, promptH);
      ctx.strokeRect(promptX, promptY, promptW, promptH);

      ctx.fillStyle = '#ffcf40';
      ctx.font = '700 10px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🔔 STAG [E / DOWN]`, screenX + this.width / 2, promptY + 14);
    }

    ctx.restore();
  }
}
