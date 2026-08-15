function safeRoundRect(ctx, x, y, w, h, r = 4) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else if (typeof ctx.rect === 'function') {
    ctx.rect(x, y, w, h);
  } else if (typeof ctx.fillRect === 'function') {
    ctx.fillRect(x, y, w, h);
  }
}

export class NPC {
  constructor(x, y, name, dialogue, options = {}) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.dialogue = dialogue;
    this.isShop = options.isShop || false;
    this.type = options.type || name.toLowerCase();
    this.width = options.width || 36;
    this.height = options.height || 48;

    this.animTimer = Math.random() * 10;
    this.facing = options.facing || 1;
  }

  update(dt, player) {
    this.animTimer += dt;
    if (player) {
      const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
      if (Math.abs(dx) < 180) {
        this.facing = dx > 0 ? 1 : -1;
      }
    }
  }

  isPlayerNear(player) {
    if (!player) return false;
    const dx = Math.abs((player.x + player.width / 2) - (this.x + this.width / 2));
    const dy = Math.abs((player.y + player.height / 2) - (this.y + this.height / 2));
    return dx < 65 && dy < 60;
  }

  draw(ctx, camera, playerNear = false) {
    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    const breath = Math.sin(this.animTimer * 2.5) * 1.5;

    ctx.save();
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);

    // Draw specific NPC character sprite
    switch (this.type) {
      case 'elderbug':
        this.drawElderbug(ctx, breath);
        break;
      case 'sly':
        this.drawSly(ctx, breath);
        break;
      case 'quirrel':
        this.drawQuirrel(ctx, breath);
        break;
      case 'cornifer':
        this.drawCornifer(ctx, breath);
        break;
      case 'cloth':
        this.drawCloth(ctx, breath);
        break;
      default:
        this.drawElderbug(ctx, breath);
        break;
    }

    ctx.restore();

    // Interaction Prompt & Speech Indicator
    if (playerNear) {
      const promptY = screenY - 20 + Math.sin(this.animTimer * 4) * 2;
      const promptText = this.isShop ? `${this.name} [E] Shop` : `${this.name} [E] Talk`;

      ctx.save();
      // Glow background badge
      ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
      ctx.strokeStyle = '#f0c040';
      ctx.lineWidth = 1.2;
      const textWidth = ctx.measureText ? ctx.measureText(promptText).width : 80;
      const pad = 8;
      const badgeX = screenX + this.width / 2 - textWidth / 2 - pad;
      const badgeY = promptY - 14;

      ctx.beginPath();
      safeRoundRect(ctx, badgeX, badgeY, textWidth + pad * 2, 20, 4);
      ctx.fill();
      ctx.stroke();

      // Golden Text
      ctx.fillStyle = '#f0c040';
      ctx.font = '11px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText(promptText, screenX + this.width / 2, promptY);

      // Speech icon bubble
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(screenX + this.width / 2, promptY - 22, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ----------------------------------------------------------------
  // ELDERBUG - The gentle town elder of Dirtmouth
  // ----------------------------------------------------------------
  drawElderbug(ctx, breath) {
    ctx.save();
    if (this.facing < 0) ctx.scale(-1, 1);

    // Dirtmouth Street Lantern Post (Behind Elderbug)
    ctx.strokeStyle = '#222836';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-24, 24);
    ctx.lineTo(-24, -36);
    ctx.lineTo(-14, -38);
    ctx.stroke();

    // Glowing Amber Streetlight Lantern
    ctx.fillStyle = 'rgba(255, 190, 80, 0.2)';
    ctx.beginPath();
    ctx.arc(-14, -30, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.arc(-14, -30, 6, 0, Math.PI * 2);
    ctx.fill();

    // Walking Stick / Cane
    ctx.strokeStyle = '#5a4632';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(14, 24);
    ctx.lineTo(12, -4);
    ctx.arc(9, -6, 4, 0, Math.PI, true);
    ctx.stroke();

    // Weathered Charcoal & Grey Cloak
    ctx.fillStyle = '#3a4252';
    ctx.beginPath();
    ctx.moveTo(-14, -8 + breath);
    ctx.lineTo(14, -8 + breath);
    ctx.lineTo(16, 24);
    ctx.lineTo(-16, 24);
    ctx.closePath();
    ctx.fill();

    // White Bug Mask
    ctx.fillStyle = '#e8ecf4';
    ctx.beginPath();
    ctx.ellipse(0, -16 + breath, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Curved Beetle Horns
    ctx.strokeStyle = '#e8ecf4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, -26 + breath);
    ctx.quadraticCurveTo(-16, -38 + breath, -12, -44 + breath);
    ctx.moveTo(6, -26 + breath);
    ctx.quadraticCurveTo(16, -38 + breath, 12, -44 + breath);
    ctx.stroke();

    // Gentle Bug Eyes
    ctx.fillStyle = '#0a0d14';
    ctx.beginPath();
    ctx.ellipse(4, -16 + breath, 2.5, 4, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ----------------------------------------------------------------
  // SLY - The Rotund Shopkeeper & Great Nailsage
  // ----------------------------------------------------------------
  drawSly(ctx, breath) {
    ctx.save();
    if (this.facing < 0) ctx.scale(-1, 1);

    // Merchant Shop Stall Table / Rug
    ctx.fillStyle = '#1c2230';
    ctx.fillRect(-28, 14, 56, 10);
    ctx.strokeStyle = '#c89e3a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-28, 14, 56, 10);

    // Glowing Charm Displays on Counter
    ctx.fillStyle = '#40e0d0';
    ctx.beginPath();
    ctx.arc(-16, 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6080';
    ctx.beginPath();
    ctx.arc(16, 10, 4, 0, Math.PI * 2);
    ctx.fill();

    // Oversized Merchant Backpack (Stuffed with scrolls and blankets)
    ctx.fillStyle = '#4a3828';
    ctx.beginPath();
    safeRoundRect(ctx, -22, -18 + breath, 16, 26, 4);
    ctx.fill();

    ctx.fillStyle = '#7a6048';
    ctx.fillRect(-24, -22 + breath, 20, 6); // Rolled blanket

    // Small Round Olive Body / Robe
    ctx.fillStyle = '#48583c';
    ctx.beginPath();
    ctx.arc(2, 6 + breath, 13, 0, Math.PI * 2);
    ctx.fill();

    // White Round Insect Mask
    ctx.fillStyle = '#f0f4fa';
    ctx.beginPath();
    ctx.ellipse(4, -8 + breath, 10, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Large Expressive Eyes
    ctx.fillStyle = '#080a10';
    ctx.beginPath();
    ctx.ellipse(6, -8 + breath, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cute Bug Antennae
    ctx.strokeStyle = '#f0f4fa';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(1, -16 + breath);
    ctx.lineTo(-3, -24 + breath);
    ctx.moveTo(7, -16 + breath);
    ctx.lineTo(11, -24 + breath);
    ctx.stroke();

    // Sparkly Geo Coin toss animation
    const coinY = -24 + Math.sin(this.animTimer * 5) * 8;
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.arc(12, coinY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ----------------------------------------------------------------
  // QUIRREL - The Inquisitive Explorer
  // ----------------------------------------------------------------
  drawQuirrel(ctx, breath) {
    ctx.save();
    if (this.facing < 0) ctx.scale(-1, 1);

    // Sheathed Nail on Back
    ctx.strokeStyle = '#ccd8eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, 16);
    ctx.lineTo(8, -26);
    ctx.stroke();

    // Blue Adventurer's Cloak & Scarf
    ctx.fillStyle = '#2c5282';
    ctx.beginPath();
    ctx.moveTo(-12, -4 + breath);
    ctx.lineTo(12, -4 + breath);
    ctx.lineTo(14, 24);
    ctx.lineTo(-14, 24);
    ctx.closePath();
    ctx.fill();

    // Flowing Scarf
    ctx.fillStyle = '#3182ce';
    ctx.beginPath();
    ctx.arc(0, -6 + breath, 8, 0, Math.PI);
    ctx.fill();

    // Quirrel's Pillbug Mask / Monomon Shell Hat
    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.ellipse(0, -18 + breath, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // White Bug Face Mask
    ctx.fillStyle = '#f0f4fa';
    ctx.beginPath();
    ctx.ellipse(0, -12 + breath, 9, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inquisitive Eyes
    ctx.fillStyle = '#0a0d14';
    ctx.beginPath();
    ctx.ellipse(3, -12 + breath, 2.2, 3.5, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ----------------------------------------------------------------
  // CORNIFER - The Cartographer
  // ----------------------------------------------------------------
  drawCornifer(ctx, breath) {
    ctx.save();
    if (this.facing < 0) ctx.scale(-1, 1);

    // Scattered Map Parchment Sheets on Ground
    ctx.fillStyle = '#e8dcc4';
    ctx.fillRect(-28, 20, 14, 4);
    ctx.fillRect(16, 20, 16, 4);
    ctx.fillRect(-8, 22, 18, 3);

    // Giant Explorer Backpack with Map Scrolls
    ctx.fillStyle = '#5c4028';
    ctx.beginPath();
    safeRoundRect(ctx, -24, -20 + breath, 18, 32, 4);
    ctx.fill();

    // Rolled Map Scrolls sticking out of backpack
    ctx.fillStyle = '#e8dcc4';
    ctx.fillRect(-22, -32 + breath, 6, 14);
    ctx.fillRect(-14, -28 + breath, 6, 10);

    // Large Rounded Blue/Green Beetle Body
    ctx.fillStyle = '#2d5a68';
    ctx.beginPath();
    ctx.ellipse(0, 4 + breath, 15, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // White Mask with Spectacles / Glasses
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath();
    ctx.ellipse(6, -12 + breath, 10, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glasses Frame
    ctx.strokeStyle = '#c89e3a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(8, -12 + breath, 4, 0, Math.PI * 2);
    ctx.stroke();

    // Black Eye behind glasses
    ctx.fillStyle = '#080a10';
    ctx.beginPath();
    ctx.arc(8, -12 + breath, 2, 0, Math.PI * 2);
    ctx.fill();

    // Writing Quill in Hand
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(12, 0 + breath);
    ctx.lineTo(20, -10 + breath);
    ctx.stroke();

    // Map sheet in hands
    ctx.fillStyle = '#f0e6d2';
    ctx.fillRect(8, 2 + breath, 12, 10);

    ctx.restore();
  }

  // ----------------------------------------------------------------
  // CLOTH - The Cicada Warrior
  // ----------------------------------------------------------------
  drawCloth(ctx, breath) {
    ctx.save();
    if (this.facing < 0) ctx.scale(-1, 1);

    // Heavy Wooden Log Club on Back
    ctx.fillStyle = '#6b4c30';
    ctx.fillRect(-18, -34, 10, 48);

    // Tan / Burlap Sack Helmet
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    safeRoundRect(ctx, -10, -26 + breath, 20, 22, 6);
    ctx.fill();

    // Eye Slits on Sack
    ctx.fillStyle = '#10141a';
    ctx.beginPath();
    ctx.ellipse(2, -16 + breath, 2.5, 4, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Cicada Warrior Body & Tunic
    ctx.fillStyle = '#b85a28';
    ctx.beginPath();
    ctx.moveTo(-12, -4 + breath);
    ctx.lineTo(12, -4 + breath);
    ctx.lineTo(14, 24);
    ctx.lineTo(-14, 24);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
