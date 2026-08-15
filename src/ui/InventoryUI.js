import { CHARMS } from '../game/Charms.js';

export class InventoryUI {
  constructor() {
    this.isOpen = false;
    this.currentTab = 'EQUIPMENT'; // 'EQUIPMENT', 'CHARMS', 'ABILITIES', 'RELICS'
    this.tabs = ['EQUIPMENT', 'CHARMS', 'ABILITIES', 'RELICS'];
    this.selectedIndex = 0;
    this.upgradeFeedback = '';
    this.upgradeFeedbackTimer = 0;
  }

  open(initialTab = 'EQUIPMENT') {
    this.isOpen = true;
    this.currentTab = initialTab;
    this.selectedIndex = 0;
    this.upgradeFeedback = '';
    this.upgradeFeedbackTimer = 0;
  }

  close() {
    this.isOpen = false;
  }

  toggleTab(dir = 1) {
    const curIdx = this.tabs.indexOf(this.currentTab);
    const nextIdx = (curIdx + dir + this.tabs.length) % this.tabs.length;
    this.currentTab = this.tabs[nextIdx];
    this.selectedIndex = 0;
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

  handleUpgrade(player, soundManager, particles, saveSystem) {
    if (!player) return;
    if (player.nailLevel >= 5) {
      this.upgradeFeedback = 'NAIL IS ALREADY FORGED TO MAXIMUM (PURE NAIL)!';
      this.upgradeFeedbackTimer = 2.0;
      return;
    }

    const cost = player.getNailUpgradeCost();
    if (!cost) return;

    if (player.geo < cost.geo) {
      this.upgradeFeedback = `NOT ENOUGH GEO! NEED ${cost.geo} GEO (HAVE ${player.geo})`;
      this.upgradeFeedbackTimer = 2.0;
      if (soundManager && soundManager.playHit) soundManager.playHit();
      return;
    }

    if ((player.paleOre || 0) < cost.ore) {
      this.upgradeFeedback = `NOT ENOUGH PALE ORE! NEED ${cost.ore} PALE ORE (HAVE ${player.paleOre || 0})`;
      this.upgradeFeedbackTimer = 2.0;
      if (soundManager && soundManager.playHit) soundManager.playHit();
      return;
    }

    const success = player.upgradeNail(soundManager, particles);
    if (success) {
      this.upgradeFeedback = `✦ FORGED ${player.getNailName().toUpperCase()}! (STRENGTH: ${player.getNailDamage()} DAMAGE) ✦`;
      this.upgradeFeedbackTimer = 3.0;
      if (saveSystem && saveSystem.save) {
        saveSystem.save({
          nailLevel: player.nailLevel,
          paleOre: player.paleOre,
          geo: player.geo,
          unlockedAbilities: player.abilities,
          equippedCharms: player.equippedCharms
        });
      }
    }
  }

  draw(ctx, width, height, player, atBench, input, soundManager, particles, saveSystem) {
    if (!this.isOpen || !player) return;

    if (this.upgradeFeedbackTimer > 0) {
      this.upgradeFeedbackTimer -= 0.016;
    }

    ctx.save();
    // 1. Dark Atmospheric Hallownest Obsidian Backdrop
    ctx.fillStyle = 'rgba(6, 9, 15, 0.96)';
    ctx.fillRect(0, 0, width, height);

    // Decorative Ornamental Frame
    ctx.strokeStyle = 'rgba(218, 165, 32, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // 2. Title & Navigation Tabs Header
    ctx.fillStyle = '#eaf4ff';
    ctx.font = '24px Cinzel Decorative, serif';
    ctx.textAlign = 'center';
    ctx.fillText('HALLOWNEST INVENTORY', width / 2, 48);

    // Tab Buttons Bar
    const tabY = 82;
    const tabNames = [
      { id: 'EQUIPMENT', label: '⚔ NAIL & FORGE' },
      { id: 'CHARMS', label: '🛡 CHARMS' },
      { id: 'ABILITIES', label: '✦ ABILITIES' },
      { id: 'RELICS', label: '💎 RELICS & ITEMS' }
    ];

    const tabWidth = 160;
    const totalTabsW = tabNames.length * tabWidth;
    const startTabX = (width - totalTabsW) / 2;

    tabNames.forEach((t, i) => {
      const tx = startTabX + i * tabWidth;
      const isActive = this.currentTab === t.id;

      ctx.fillStyle = isActive ? 'rgba(40, 70, 110, 0.9)' : 'rgba(16, 24, 38, 0.7)';
      ctx.strokeStyle = isActive ? '#ffcf40' : 'rgba(100, 140, 180, 0.3)';
      ctx.lineWidth = isActive ? 2 : 1;

      ctx.fillRect(tx + 4, tabY - 18, tabWidth - 8, 34);
      ctx.strokeRect(tx + 4, tabY - 18, tabWidth - 8, 34);

      ctx.fillStyle = isActive ? '#ffffff' : '#88a0c0';
      ctx.font = isActive ? 'bold 13px Cinzel, serif' : '13px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.label, tx + tabWidth / 2, tabY + 4);
    });

    // Close Button [✕ Exit]
    const closeBtnX = width - 140;
    const closeBtnY = 22;
    const closeBtnW = 110;
    const closeBtnH = 32;

    ctx.fillStyle = 'rgba(180, 40, 40, 0.85)';
    ctx.strokeStyle = '#ffcf40';
    ctx.lineWidth = 1.5;
    ctx.fillRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    ctx.strokeRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('✕ Exit [Esc/E]', closeBtnX + closeBtnW / 2, closeBtnY + 21);

    // Render Tab Content
    if (this.currentTab === 'EQUIPMENT') {
      this.drawEquipmentTab(ctx, width, height, player, soundManager, particles, saveSystem);
    } else if (this.currentTab === 'CHARMS') {
      this.drawCharmsTab(ctx, width, height, player, atBench);
    } else if (this.currentTab === 'ABILITIES') {
      this.drawAbilitiesTab(ctx, width, height, player);
    } else if (this.currentTab === 'RELICS') {
      this.drawRelicsTab(ctx, width, height, player);
    }

    // Feedback Banner
    if (this.upgradeFeedbackTimer > 0 && this.upgradeFeedback) {
      const bannerY = height - 70;
      ctx.fillStyle = 'rgba(20, 35, 55, 0.95)';
      ctx.strokeStyle = '#ffcf40';
      ctx.lineWidth = 2;
      ctx.fillRect(width / 2 - 320, bannerY - 18, 640, 36);
      ctx.strokeRect(width / 2 - 320, bannerY - 18, 640, 36);

      ctx.fillStyle = '#fffae0';
      ctx.font = 'bold 14px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.upgradeFeedback, width / 2, bannerY + 6);
    }

    // Bottom Navigation Help Footer
    ctx.fillStyle = '#88a4c8';
    ctx.font = '12px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Switch Tabs [Tab / Q / E]  |  Navigate [W/S / Arrows]  |  Upgrade / Equip [Space / Enter]  |  Close [Esc / I]', width / 2, height - 20);

    ctx.restore();

    // Mouse Click & Interaction Handler
    if (input && input.mouseClicked) {
      const mx = input.mousePos.x;
      const my = input.mousePos.y;

      // Close button check
      if (mx >= closeBtnX && mx <= closeBtnX + closeBtnW && my >= closeBtnY && my <= closeBtnY + closeBtnH) {
        this.close();
        return;
      }

      // Tab selection click
      tabNames.forEach((t, i) => {
        const tx = startTabX + i * tabWidth;
        if (mx >= tx + 4 && mx <= tx + tabWidth - 4 && my >= tabY - 18 && my <= tabY + 16) {
          this.currentTab = t.id;
          this.selectedIndex = 0;
        }
      });

      // Upgrade Button Click
      if (this.currentTab === 'EQUIPMENT') {
        const rightX = width / 2 + 20;
        const rightY = 135;
        const btnX = rightX + 35;
        const btnY = rightY + 240;
        const btnW = 250;
        const btnH = 48;
        if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
          this.handleUpgrade(player, soundManager, particles, saveSystem);
        }
      } else if (this.currentTab === 'CHARMS' && atBench) {
        const owned = player.charmsOwned || ['WAYWARD_COMPASS'];
        const startY = 165;
        owned.forEach((charmId, idx) => {
          const y = startY + idx * 56;
          if (mx >= width / 2 - 290 && mx <= width / 2 + 290 && my >= y - 18 && my <= y + 30) {
            this.selectedIndex = idx;
            this.toggleCharm(player);
          }
        });
      }
    }
  }

  drawEquipmentTab(ctx, width, height, player, soundManager, particles, saveSystem) {
    const nailName = player.getNailName();
    const nailDmg = player.getNailDamage();
    const nailLevel = player.nailLevel || 1;
    const upgradeCost = player.getNailUpgradeCost();

    // Left Column: Current Nail Display Box
    const leftX = width / 2 - 340;
    const leftY = 135;
    const leftW = 320;
    const leftH = 340;

    ctx.fillStyle = 'rgba(16, 24, 38, 0.8)';
    ctx.strokeStyle = 'rgba(218, 165, 32, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(leftX, leftY, leftW, leftH);
    ctx.strokeRect(leftX, leftY, leftW, leftH);

    ctx.fillStyle = '#ffcf40';
    ctx.font = 'bold 18px Cinzel Decorative, serif';
    ctx.textAlign = 'center';
    ctx.fillText('EQUIPPED NAIL', leftX + leftW / 2, leftY + 35);

    // Shimmering Pure Nail Canvas Graphic
    const nailGlowX = leftX + leftW / 2;
    const nailGlowY = leftY + 115;

    const bladeGrad = ctx.createLinearGradient(nailGlowX - 10, nailGlowY - 45, nailGlowX + 10, nailGlowY + 45);
    bladeGrad.addColorStop(0, '#ffffff');
    bladeGrad.addColorStop(0.5, '#c0d4ec');
    bladeGrad.addColorStop(1, '#607898');

    ctx.save();
    // Radiant Blade Aura
    ctx.shadowColor = '#88d6ff';
    ctx.shadowBlur = 16;

    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(nailGlowX, nailGlowY - 50);
    ctx.lineTo(nailGlowX + 14, nailGlowY + 15);
    ctx.lineTo(nailGlowX + 6, nailGlowY + 22);
    ctx.lineTo(nailGlowX + 6, nailGlowY + 45);
    ctx.lineTo(nailGlowX - 6, nailGlowY + 45);
    ctx.lineTo(nailGlowX - 6, nailGlowY + 22);
    ctx.lineTo(nailGlowX - 14, nailGlowY + 15);
    ctx.closePath();
    ctx.fill();

    // Crossguard
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(nailGlowX - 18, nailGlowY + 20, 36, 6);
    ctx.restore();

    // Current Nail Details
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText(nailName, leftX + leftW / 2, leftY + 200);

    ctx.fillStyle = '#88d6ff';
    ctx.font = '14px Cinzel, serif';
    ctx.fillText(`Nail Strength Level: ${nailLevel} / 5`, leftX + leftW / 2, leftY + 230);
    ctx.fillText(`Strike Damage: ${nailDmg} Damage`, leftX + leftW / 2, leftY + 255);

    ctx.fillStyle = '#a0b8d0';
    ctx.font = '12px Cinzel, serif';
    ctx.fillText(`Carried Geo: ${player.geo}  |  Pale Ore: ${player.paleOre || 0}`, leftX + leftW / 2, leftY + 300);

    // Right Column: Nailsmith Forge & Upgrade Station Box
    const rightX = width / 2 + 20;
    const rightY = 135;
    const rightW = 320;
    const rightH = 340;

    ctx.fillStyle = 'rgba(16, 24, 38, 0.8)';
    ctx.strokeStyle = 'rgba(218, 165, 32, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(rightX, rightY, rightW, rightH);
    ctx.strokeRect(rightX, rightY, rightW, rightH);

    ctx.fillStyle = '#ffcf40';
    ctx.font = 'bold 18px Cinzel Decorative, serif';
    ctx.textAlign = 'center';
    ctx.fillText('NAILSMITH FORGE', rightX + rightW / 2, rightY + 35);

    if (upgradeCost) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px Cinzel, serif';
      ctx.fillText(`Next Upgrade: ${upgradeCost.nextName}`, rightX + rightW / 2, rightY + 80);

      ctx.fillStyle = '#88ffaa';
      ctx.font = '14px Cinzel, serif';
      ctx.fillText(`Upgrades Damage: ${nailDmg} ➔ ${upgradeCost.nextDamage} Damage`, rightX + rightW / 2, rightY + 110);

      // Requirements
      ctx.fillStyle = player.geo >= upgradeCost.geo ? '#ffcf40' : '#ff6666';
      ctx.font = '14px Cinzel, serif';
      ctx.fillText(`• Required Geo: ${upgradeCost.geo} (You have: ${player.geo})`, rightX + rightW / 2, rightY + 155);

      ctx.fillStyle = (player.paleOre || 0) >= upgradeCost.ore ? '#88d6ff' : '#ff6666';
      ctx.fillText(`• Required Pale Ore: ${upgradeCost.ore} (You have: ${player.paleOre || 0})`, rightX + rightW / 2, rightY + 185);

      // Upgrade Button Box
      const btnX = rightX + 35;
      const btnY = rightY + 240;
      const btnW = 250;
      const btnH = 48;

      const canAfford = player.geo >= upgradeCost.geo && (player.paleOre || 0) >= upgradeCost.ore;

      ctx.fillStyle = canAfford ? 'rgba(30, 90, 60, 0.9)' : 'rgba(50, 50, 60, 0.7)';
      ctx.strokeStyle = canAfford ? '#88ffaa' : '#888888';
      ctx.lineWidth = 2;
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.fillStyle = canAfford ? '#ffffff' : '#aaaaaa';
      ctx.font = 'bold 15px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚒ FORGE & UPGRADE NAIL', btnX + btnW / 2, btnY + 30);
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px Cinzel, serif';
      ctx.fillText('MASTER FORGE COMPLETE', rightX + rightW / 2, rightY + 140);

      ctx.fillStyle = '#e0f0ff';
      ctx.font = '13px Cinzel, serif';
      ctx.fillText('The Pure Nail represents the absolute pinnacle', rightX + rightW / 2, rightY + 180);
      ctx.fillText('of Hallownest craftsmanship.', rightX + rightW / 2, rightY + 205);
      ctx.fillText(`(Maximum Damage: ${nailDmg})`, rightX + rightW / 2, rightY + 235);
    }
  }

  drawCharmsTab(ctx, width, height, player, atBench) {
    const notchCapacity = player.notchCount || 3;
    const currentCost = (player.equippedCharms || []).reduce((sum, id) => sum + (CHARMS[id]?.cost || 0), 0);

    ctx.fillStyle = '#ffcf40';
    ctx.font = '14px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Charm Notches Equipped: ${currentCost} / ${notchCapacity}`, width / 2, 130);

    const owned = player.charmsOwned || ['WAYWARD_COMPASS'];
    const startY = 165;

    owned.forEach((charmId, idx) => {
      const charm = CHARMS[charmId];
      if (!charm) return;
      const y = startY + idx * 56;
      const isSelected = idx === this.selectedIndex;
      const isEquipped = (player.equippedCharms || []).includes(charmId);

      ctx.fillStyle = isSelected ? 'rgba(40, 70, 110, 0.9)' : 'rgba(20, 28, 42, 0.65)';
      ctx.strokeStyle = isSelected ? '#ffcf40' : 'rgba(120, 160, 200, 0.25)';
      ctx.lineWidth = isSelected ? 2 : 1;

      ctx.fillRect(width / 2 - 290, y - 18, 580, 48);
      ctx.strokeRect(width / 2 - 290, y - 18, 580, 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Cinzel, serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${charm.icon} ${charm.name} (${charm.cost} Notch)`, width / 2 - 270, y + 12);

      ctx.textAlign = 'right';
      if (isEquipped) {
        ctx.fillStyle = '#88ffaa';
        ctx.fillText('✓ EQUIPPED', width / 2 + 270, y + 12);
      } else {
        ctx.fillStyle = '#708098';
        ctx.fillText('UNEQUIPPED', width / 2 + 270, y + 12);
      }
    });

    ctx.fillStyle = '#a0c0e0';
    ctx.font = '13px Cinzel, serif';
    ctx.textAlign = 'center';
    if (atBench) {
      ctx.fillText('Press [Space / Enter] to Equip or Unequip selected charm', width / 2, height - 85);
    } else {
      ctx.fillText('Rest at any Bench to change equipped Charms', width / 2, height - 85);
    }
  }

  drawAbilitiesTab(ctx, width, height, player) {
    const abilityList = [
      { key: 'dash', name: 'Mothwing Cloak (Dash)', desc: 'Dash horizontally on ground or mid-air (Press [C] / [L])' },
      { key: 'shadowDash', name: 'Shade Cloak (Shadow Dash)', desc: 'Phase through enemies, attacks, and dark Void Gates' },
      { key: 'wallJump', name: 'Mantis Claw (Wall Jump)', desc: 'Cling to and jump off vertical stone cavern walls' },
      { key: 'doubleJump', name: 'Monarch Wings (Double Jump)', desc: 'Leap a second time in mid-air with radiant butterfly wings' },
      { key: 'superDash', name: 'Crystal Heart (Super Dash)', desc: 'Hold [F] to charge and fly indefinitely across open air' },
      { key: 'soulOrbs', name: 'Soul Spiral (Orbiting Soul Orbs)', desc: '2 revolving soul orbs that deal 4 contact chip damage & launch tracking soul bolts' },
      { key: 'vengefulSpirit', name: 'Vengeful Spirit (Spell)', desc: 'Cast a forward blast of pure soul energy (Press [Q], Costs 3 Soul)' },
      { key: 'desolateDive', name: 'Desolate Dive (Spell)', desc: 'Slam downward with massive explosive AoE shockwaves (Press [Down + Q])' },
      { key: 'howlingWraiths', name: 'Howling Wraiths (Spell)', desc: 'Towering upward eruption of screaming soul phantoms (Press [Up + Q])' }
    ];

    const startY = 145;
    abilityList.forEach((ab, idx) => {
      const isUnlocked = !!(player.abilities && player.abilities[ab.key]);
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cardX = width / 2 - 340 + col * 350;
      const cardY = startY + row * 68;

      ctx.fillStyle = isUnlocked ? 'rgba(20, 36, 56, 0.85)' : 'rgba(15, 18, 24, 0.5)';
      ctx.strokeStyle = isUnlocked ? '#88d6ff' : 'rgba(70, 80, 95, 0.3)';
      ctx.lineWidth = isUnlocked ? 1.5 : 1;

      ctx.fillRect(cardX, cardY, 330, 58);
      ctx.strokeRect(cardX, cardY, 330, 58);

      ctx.fillStyle = isUnlocked ? '#ffffff' : '#667080';
      ctx.font = 'bold 13px Cinzel, serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${isUnlocked ? '✦' : '🔒'} ${ab.name}`, cardX + 12, cardY + 22);

      ctx.fillStyle = isUnlocked ? '#9ac8eb' : '#4a5464';
      ctx.font = '11px Cinzel, serif';
      ctx.fillText(ab.desc, cardX + 12, cardY + 42);
    });
  }

  drawRelicsTab(ctx, width, height, player) {
    const relics = [
      { name: 'Geo Coins', val: `${player.geo} Geo`, icon: '🪙', desc: 'Hallownest currency used for purchases & nail upgrades' },
      { name: 'Pale Ore', val: `${player.paleOre || 0} Ore`, icon: '💎', desc: 'Rare pale mineral used by Nailsmiths to forge blades' },
      { name: 'Simple Keys', val: `${player.simpleKeys || 0}`, icon: '🗝️', desc: 'Unlocks rusted gates and hatches throughout the kingdom' },
      { name: 'Rancid Eggs', val: `${player.rancidEggs || 0}`, icon: '🥚', desc: 'Pungent relics of Jinn and Confessor Jiji' },
      { name: 'Hallownest Seals', val: `${player.hallownestSeals || 0}`, icon: '📜', desc: 'Relics of the ancient kingdom, highly prized by Relic Seekers' },
      { name: 'King\'s Idols', val: `${player.kingsIdols || 0}`, icon: '👑', desc: 'Rare statues sculpted in the likeness of the Pale King' }
    ];

    const startY = 150;
    relics.forEach((r, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cardX = width / 2 - 340 + col * 350;
      const cardY = startY + row * 90;

      ctx.fillStyle = 'rgba(20, 30, 48, 0.85)';
      ctx.strokeStyle = 'rgba(218, 165, 32, 0.4)';
      ctx.lineWidth = 1.5;

      ctx.fillRect(cardX, cardY, 330, 75);
      ctx.strokeRect(cardX, cardY, 330, 75);

      ctx.fillStyle = '#ffcf40';
      ctx.font = 'bold 15px Cinzel, serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${r.icon} ${r.name}`, cardX + 15, cardY + 28);

      ctx.fillStyle = '#88ffaa';
      ctx.textAlign = 'right';
      ctx.fillText(r.val, cardX + 315, cardY + 28);

      ctx.fillStyle = '#a0b4cc';
      ctx.font = '11px Cinzel, serif';
      ctx.textAlign = 'left';
      ctx.fillText(r.desc, cardX + 15, cardY + 54);
    });
  }
}

