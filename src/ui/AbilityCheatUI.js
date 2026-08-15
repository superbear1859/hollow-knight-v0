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
      { id: 'howlingWraiths', name: 'Howling Wraiths (Spell)', desc: 'Release a towering upward eruption of screaming soul phantoms (Costs 3 Soul)' },
      { id: 'superDash', name: 'Crystal Heart (Super Dash - Hold [F])', desc: 'Hold [F] to charge and fly forward horizontally without stopping' },
      { id: 'doubleJump', name: 'Monarch Wings (Double Jump)', desc: 'Leap a second time in mid-air with glowing radiant wings' },
      { id: 'soulOrbs', name: 'Soul Spiral (Orbiting Soul Orbs)', desc: '2 revolving soul orbs that deal 4 chip damage and launch tracking soul bolts on spell cast' },
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
    ctx.fillStyle = 'rgba(6, 10, 18, 0.95)';
    ctx.fillRect(0, 0, width, height);

    // Golden Halo Glow Effect
    const glowGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 350);
    glowGrad.addColorStop(0, 'rgba(255, 207, 64, 0.12)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // Title Header
    ctx.fillStyle = '#ffcf40';
    ctx.font = '700 20px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦ ANCIENT ABILITY SELECTOR ✦', width / 2, 32);

    ctx.fillStyle = '#88d6ff';
    ctx.font = '700 11px Cinzel, serif';
    ctx.fillText('SECRET CHEAT CODE DETECTED: "superbear185941"', width / 2, 52);

    ctx.fillStyle = '#a0b4cc';
    ctx.font = '11px Cinzel, serif';
    ctx.fillText('Toggle unlocked abilities or click Accept below to resume', width / 2, 68);

    // Ability Options List (Fits perfectly within 540px height!)
    const startY = 82;
    const itemH = 36;
    const spacing = 5;
    const itemW = 580;
    const itemX = (width - itemW) / 2;

    this.options.forEach((opt, idx) => {
      const y = startY + idx * (itemH + spacing);
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
        ctx.fillStyle = isSelected ? 'rgba(36, 180, 98, 0.95)' : 'rgba(20, 90, 50, 0.8)';
        ctx.strokeStyle = isSelected ? '#55ffaa' : '#24a058';
        ctx.lineWidth = isSelected ? 2.5 : 2.0;
      } else if (opt.id === 'unlockAll') {
        ctx.fillStyle = isSelected ? 'rgba(180, 140, 30, 0.9)' : 'rgba(70, 55, 15, 0.7)';
        ctx.strokeStyle = isSelected ? '#ffdf66' : '#d4af37';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
      } else {
        ctx.fillStyle = isSelected ? 'rgba(40, 80, 130, 0.9)' : 'rgba(15, 24, 40, 0.75)';
        ctx.strokeStyle = isSelected ? '#ffcf40' : (isUnlocked ? '#88d6ff' : '#304058');
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
      }

      ctx.fillRect(itemX, y, itemW, itemH);
      ctx.strokeRect(itemX, y, itemW, itemH);

      // Label & Description
      ctx.fillStyle = isSelected ? '#ffffff' : (isUnlocked ? '#e0f0ff' : '#a0b0cc');
      ctx.font = opt.id === 'confirm' || opt.id === 'unlockAll' ? '700 13px Cinzel, serif' : '700 12px Cinzel, serif';
      ctx.textAlign = 'left';
      ctx.fillText(opt.name, itemX + 16, y + (opt.id === 'confirm' || opt.id === 'unlockAll' ? 22 : 16));

      if (opt.desc && opt.id !== 'confirm' && opt.id !== 'unlockAll') {
        ctx.fillStyle = isSelected ? '#d0e4ff' : '#7084a0';
        ctx.font = '10px Cinzel, serif';
        ctx.fillText(opt.desc, itemX + 16, y + 29);
      }

      // Toggle Badge Status
      if (opt.id !== 'unlockAll' && opt.id !== 'confirm') {
        ctx.fillStyle = isUnlocked ? '#24a058' : '#3a4454';
        ctx.strokeStyle = isUnlocked ? '#55ff99' : '#607088';
        ctx.lineWidth = 1.5;

        const badgeW = 90;
        const badgeH = 20;
        const badgeX = itemX + itemW - badgeW - 12;
        const badgeY = y + (itemH - badgeH) / 2;

        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        ctx.fillStyle = isUnlocked ? '#ffffff' : '#a0b0cc';
        ctx.font = '700 10px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText(isUnlocked ? '✓ UNLOCKED' : '🔒 LOCKED', badgeX + badgeW / 2, badgeY + 14);
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
            input.mouseClicked = false;
            this.executeOption(opt, soundManager, saveSystem);
          }
        }
      }
    });

    // Instructions Legend
    ctx.fillStyle = '#a0b0cc';
    ctx.font = '11px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click option / Accept button  •  [W / S / UP / DOWN] select  •  [ENTER / SPACE] toggle  •  [ESC] return', width / 2, height - 12);

    ctx.restore();

    // Keyboard Input Actions (Dedicated menu navigation isolated from gameplay inputs)
    if (input) {
      if (input.isJustPressed('up')) {
        this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      }
      if (input.isJustPressed('down')) {
        this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      }
      // Enter / Space / Z key press explicitly triggers selected option
      const isEnterPressed = input.justPressedKeys['Enter'] || input.justPressedKeys['KeyEnter'];
      const isSpacePressed = input.justPressedKeys['Space'] || input.justPressedKeys[' '];
      const isZPressed = input.justPressedKeys['KeyZ'] || input.justPressedKeys['z'];

      if (isEnterPressed || isSpacePressed || isZPressed) {
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
      this.player.abilities.howlingWraiths = true;
      this.player.abilities.superDash = true;
      this.player.abilities.doubleJump = true;
      this.player.abilities.soulOrbs = true;
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
