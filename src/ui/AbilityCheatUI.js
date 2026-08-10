export class AbilityCheatUI {
  constructor() {
    this.isOpen = false;
    this.selectedIndex = 0;
    this.player = null;
    this.options = [
      { id: 'dash', name: 'Mothwing Cloak (Dash)', desc: 'Dash forward horizontally on ground or in mid-air' },
      { id: 'shadowDash', name: 'Shade Cloak (Shadow Dash)', desc: 'Phase through enemies, attacks, and dark Void Gates' },
      { id: 'wallJump', name: 'Mantis Claw (Wall Jump)', desc: 'Climb and leap off vertical cavern walls' },
      { id: 'vengefulSpirit', name: 'Vengeful Spirit (Spell)', desc: 'Cast a blast of soul energy forward (Costs 3 Soul)' },
      { id: 'desolateDive', name: 'Desolate Dive (Spell)', desc: 'Slam downward to create a massive AoE shockwave explosion (Costs 3 Soul)' },
      { id: 'unlockAll', name: '✦ UNLOCK ALL ABILITIES ✦', desc: 'Instantly grant all Metroidvania movement & spell powers' },
      { id: 'confirm', name: '✓ APPLY & RETURN TO GAME', desc: 'Save selected abilities and resume exploration' }
    ];
  }

  open(player) {
    this.isOpen = true;
    this.player = player;
    this.selectedIndex = 0;
  }

  close() {
    this.isOpen = false;
  }

  draw(ctx, width, height, input, soundManager, saveSystem) {
    if (!this.isOpen || !this.player) return;

    ctx.save();

    // Dark Gold Glassmorphism Backdrop
    ctx.fillStyle = 'rgba(6, 10, 18, 0.94)';
    ctx.fillRect(0, 0, width, height);

    // Golden Halo Glow Effect
    const glowGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 350);
    glowGrad.addColorStop(0, 'rgba(255, 207, 64, 0.12)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // Title Header
    ctx.fillStyle = '#ffcf40';
    ctx.font = '700 24px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦ ANCIENT ABILITY SELECTOR ✦', width / 2, 50);

    ctx.fillStyle = '#88d6ff';
    ctx.font = '700 12px Cinzel, serif';
    ctx.fillText('SECRET CHEAT CODE DETECTED: "superbear185941"', width / 2, 74);

    ctx.fillStyle = '#a0b4cc';
    ctx.font = '12px Cinzel, serif';
    ctx.fillText('Toggle your unlocked abilities below', width / 2, 94);

    // Ability Options List
    const startY = 118;
    const itemH = 46;
    const itemW = 560;
    const itemX = (width - itemW) / 2;

    this.options.forEach((opt, idx) => {
      const y = startY + idx * (itemH + 8);
      const isSelected = idx === this.selectedIndex;

      let isUnlocked = false;
      if (opt.id === 'unlockAll' || opt.id === 'confirm') {
        isUnlocked = false;
      } else {
        isUnlocked = !!this.player.abilities[opt.id];
      }

      ctx.save();

      // Item Box Styling
      if (opt.id === 'confirm') {
        ctx.fillStyle = isSelected ? 'rgba(36, 160, 88, 0.85)' : 'rgba(20, 70, 45, 0.6)';
        ctx.strokeStyle = isSelected ? '#55ff99' : '#24a058';
      } else if (opt.id === 'unlockAll') {
        ctx.fillStyle = isSelected ? 'rgba(180, 140, 30, 0.85)' : 'rgba(70, 55, 15, 0.6)';
        ctx.strokeStyle = isSelected ? '#ffdf66' : '#d4af37';
      } else {
        ctx.fillStyle = isSelected ? 'rgba(40, 80, 130, 0.85)' : 'rgba(15, 24, 40, 0.7)';
        ctx.strokeStyle = isSelected ? '#ffcf40' : (isUnlocked ? '#88d6ff' : '#304058');
      }
      ctx.lineWidth = isSelected ? 2.5 : 1.5;

      ctx.fillRect(itemX, y, itemW, itemH);
      ctx.strokeRect(itemX, y, itemW, itemH);

      // Label & Description
      ctx.fillStyle = isSelected ? '#ffffff' : (isUnlocked ? '#e0f0ff' : '#a0b0cc');
      ctx.font = '700 14px Cinzel, serif';
      ctx.textAlign = 'left';
      ctx.fillText(opt.name, itemX + 20, y + 20);

      ctx.fillStyle = isSelected ? '#d0e4ff' : '#7084a0';
      ctx.font = '11px Cinzel, serif';
      ctx.fillText(opt.desc, itemX + 20, y + 36);

      // Toggle Badge Status
      if (opt.id !== 'unlockAll' && opt.id !== 'confirm') {
        ctx.fillStyle = isUnlocked ? '#24a058' : '#3a4454';
        ctx.strokeStyle = isUnlocked ? '#55ff99' : '#607088';
        ctx.lineWidth = 1.5;

        const badgeW = 96;
        const badgeH = 24;
        const badgeX = itemX + itemW - badgeW - 16;
        const badgeY = y + (itemH - badgeH) / 2;

        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        ctx.fillStyle = isUnlocked ? '#ffffff' : '#a0b0cc';
        ctx.font = '700 11px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText(isUnlocked ? '✓ UNLOCKED' : '🔒 LOCKED', badgeX + badgeW / 2, badgeY + 16);
      }

      ctx.restore();

      // Mouse Hover & Click Detection
      if (input && input.mousePos) {
        const mx = input.mousePos.x;
        const my = input.mousePos.y;
        if (mx >= itemX && mx <= itemX + itemW && my >= y && my <= y + itemH) {
          if (this.selectedIndex !== idx) {
            this.selectedIndex = idx;
            if (soundManager && soundManager.playSlash) soundManager.playSlash();
          }
          if (input.mouseClicked) {
            this.executeOption(opt, soundManager, saveSystem);
          }
        }
      }
    });

    // Instructions Legend
    ctx.fillStyle = '#a0b0cc';
    ctx.font = '12px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Use [W / S / UP / DOWN] to select  •  [SPACE / ENTER] to toggle  •  [ESC] to return', width / 2, height - 20);

    ctx.restore();

    // Keyboard Input Actions
    if (input) {
      if (input.isJustPressed('up')) {
        this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      }
      if (input.isJustPressed('down')) {
        this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      }
      if (input.isJustPressed('jump') || input.isJustPressed('interact')) {
        this.executeOption(this.options[this.selectedIndex], soundManager, saveSystem);
      }
      if (input.isJustPressed('pause') || input.isJustPressed('exit')) {
        this.close();
      }
    }
  }

  executeOption(opt, soundManager, saveSystem) {
    if (opt.id === 'unlockAll') {
      this.player.abilities.dash = true;
      this.player.abilities.shadowDash = true;
      this.player.abilities.wallJump = true;
      this.player.abilities.vengefulSpirit = true;
      this.player.abilities.desolateDive = true;
      if (soundManager && soundManager.playBenchBell) soundManager.playBenchBell();
    } else if (opt.id === 'confirm') {
      if (soundManager && soundManager.playBenchBell) soundManager.playBenchBell();
      this.close();
    } else {
      this.player.abilities[opt.id] = !this.player.abilities[opt.id];
      if (soundManager && soundManager.playSlash) soundManager.playSlash();
    }

    if (saveSystem && saveSystem.save) {
      saveSystem.save({
        unlockedAbilities: this.player.abilities,
        geo: this.player.geo,
        masks: this.player.masks,
        maxMasks: this.player.maxMasks,
        soul: this.player.soul
      });
    }
  }
}
