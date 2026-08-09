export class HUD {
  constructor() {
    this.healFlashTimers = [0, 0, 0, 0, 0, 0, 0, 0];
    this.lastMaskCount = 5;
  }

  draw(ctx, player, currentBoss, input, soundManager, particles, currentRoom) {
    ctx.save();

    // Check if player just healed a mask to trigger HUD relighting animation
    if (player.masks > this.lastMaskCount) {
      const healedIdx = player.masks - 1;
      if (healedIdx >= 0 && healedIdx < this.healFlashTimers.length) {
        this.healFlashTimers[healedIdx] = 0.6; // 0.6 second bright relighting flash
      }
    }
    this.lastMaskCount = player.masks;

    // Decay flash timers
    for (let i = 0; i < this.healFlashTimers.length; i++) {
      if (this.healFlashTimers[i] > 0) {
        this.healFlashTimers[i] -= 0.016;
      }
    }

    // 1. Soul Vessel Orb (Top Left)
    const vesselX = 45;
    const vesselY = 45;
    const vesselRadius = 26;

    // Glowing Soul Aura
    ctx.fillStyle = 'rgba(120, 210, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(vesselX, vesselY, vesselRadius + 6, 0, Math.PI * 2);
    ctx.fill();

    // Outer Orb Glass Frame
    ctx.fillStyle = '#0f1726';
    ctx.strokeStyle = '#a0c4e8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(vesselX, vesselY, vesselRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Liquid Soul Level (Glowing White/Cyan)
    const soulRatio = Math.max(0, Math.min(1, player.soul / player.maxSoul));
    if (soulRatio > 0) {
      ctx.fillStyle = '#eaf4ff';
      ctx.beginPath();
      ctx.arc(vesselX, vesselY, vesselRadius * soulRatio, 0, Math.PI * 2);
      ctx.fill();

      // Inner soul sheen
      ctx.fillStyle = 'rgba(120, 210, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(vesselX - 4, vesselY - 4, (vesselRadius * soulRatio) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Health Masks (Glowing White Bone Masks)
    const maskStartX = 85;
    const maskY = 32;
    const maskSize = 22;

    for (let i = 0; i < player.maxMasks; i++) {
      const x = maskStartX + i * (maskSize + 10);
      const isFull = i < player.masks;
      const flashTimer = this.healFlashTimers[i] || 0;

      ctx.save();

      // Relighting Flash Aura on Heal
      if (flashTimer > 0) {
        const flashAlpha = flashTimer / 0.6;
        ctx.fillStyle = `rgba(180, 235, 255, ${flashAlpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(x + maskSize / 2, maskY + maskSize / 2, maskSize * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isFull) {
        // Bright Glowing White Bone Mask
        ctx.fillStyle = flashTimer > 0 ? '#ffffff' : '#f5f7fa';
        ctx.strokeStyle = flashTimer > 0 ? '#88d6ff' : '#c0d0e4';
        ctx.lineWidth = flashTimer > 0 ? 3 : 2;

        ctx.beginPath();
        ctx.ellipse(x + maskSize / 2, maskY + maskSize / 2, maskSize / 2, maskSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Hollow Black Eye Sockets
        ctx.fillStyle = '#05060a';
        ctx.beginPath();
        ctx.ellipse(x + 7, maskY + 11, 2.5, 3.5, 0.1, 0, Math.PI * 2);
        ctx.ellipse(x + 15, maskY + 11, 2.5, 3.5, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // White Mask Horn Details
        ctx.fillStyle = flashTimer > 0 ? '#ffffff' : '#f5f7fa';
        ctx.beginPath();
        ctx.moveTo(x + 3, maskY + 4);
        ctx.quadraticCurveTo(x - 2, maskY - 4, x + 5, maskY + 1);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + 19, maskY + 4);
        ctx.quadraticCurveTo(x + 24, maskY - 4, x + 17, maskY + 1);
        ctx.fill();
      } else {
        // Dark Broken Mask Frame
        ctx.fillStyle = 'rgba(20, 26, 38, 0.7)';
        ctx.strokeStyle = 'rgba(90, 110, 140, 0.4)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.ellipse(x + maskSize / 2, maskY + maskSize / 2, maskSize / 2, maskSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Broken Crack Graphic
        ctx.strokeStyle = 'rgba(120, 140, 170, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + maskSize / 2, maskY + 4);
        ctx.lineTo(x + maskSize / 2 - 3, maskY + 12);
        ctx.lineTo(x + maskSize / 2 + 2, maskY + 18);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Interactive On-Screen [❤ HEAL (H)] Button
    const healBtnX = maskStartX + player.maxMasks * (maskSize + 10) + 10;
    const healBtnY = 24;
    const healBtnW = 85;
    const healBtnH = 28;

    ctx.fillStyle = 'rgba(30, 60, 95, 0.75)';
    ctx.strokeStyle = '#88d6ff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(healBtnX, healBtnY, healBtnW, healBtnH);
    ctx.strokeRect(healBtnX, healBtnY, healBtnW, healBtnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('❤ Heal [H]', healBtnX + healBtnW / 2, healBtnY + 18);

    // Interactive On-Screen [✨ SPELL (Q)] Button
    const spellBtnX = healBtnX + healBtnW + 10;
    const spellBtnY = 24;
    const spellBtnW = 95;
    const spellBtnH = 28;

    ctx.fillStyle = player.abilities?.vengefulSpirit ? 'rgba(30, 85, 120, 0.85)' : 'rgba(20, 30, 45, 0.6)';
    ctx.strokeStyle = player.abilities?.vengefulSpirit ? '#ffcf40' : '#405878';
    ctx.lineWidth = 1.5;
    ctx.fillRect(spellBtnX, spellBtnY, spellBtnW, spellBtnH);
    ctx.strokeRect(spellBtnX, spellBtnY, spellBtnW, spellBtnH);

    ctx.fillStyle = player.abilities?.vengefulSpirit ? '#ffffff' : '#7085a0';
    ctx.font = '12px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Spell [Q]', spellBtnX + spellBtnW / 2, spellBtnY + 18);

    // 3. Geo Counter (Top Right)
    ctx.fillStyle = '#ffcf40';
    ctx.font = '700 18px Cinzel, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`❖ ${player.geo}`, 45, 95);

    // 4. Boss Health Bar (Bottom Center)
    if (currentBoss && !currentBoss.isDead) {
      const barW = 400;
      const barH = 14;
      const barX = (ctx.canvas.width - barW) / 2;
      const barY = ctx.canvas.height - 50;

      ctx.fillStyle = 'rgba(10, 14, 22, 0.85)';
      ctx.strokeStyle = 'rgba(180, 200, 230, 0.4)';
      ctx.lineWidth = 2;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeRect(barX, barY, barW, barH);

      const hpRatio = Math.max(0, currentBoss.hp / currentBoss.maxHp);
      ctx.fillStyle = '#c81e3a';
      ctx.fillRect(barX + 2, barY + 2, (barW - 4) * hpRatio, barH - 4);

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Cinzel Decorative, serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentBoss.bossName, ctx.canvas.width / 2, barY - 10);
    }

    ctx.restore();

    // Check Click on HUD Heal & Spell Buttons
    if (input && input.mouseClicked) {
      const mx = input.mousePos.x;
      const my = input.mousePos.y;
      if (mx >= healBtnX && mx <= healBtnX + healBtnW && my >= healBtnY && my <= healBtnY + healBtnH) {
        player.performHeal(soundManager || { playHealComplete: () => {} }, particles || { spawnShockwave: () => {}, spawnHitSparks: () => {} });
      } else if (mx >= spellBtnX && mx <= spellBtnX + spellBtnW && my >= spellBtnY && my <= spellBtnY + spellBtnH) {
        player.castSpell(soundManager || { playBossRoar: () => {} }, particles || { spawnShockwave: () => {}, spawnHitSparks: () => {} }, currentRoom);
      }
    }
  }
}
