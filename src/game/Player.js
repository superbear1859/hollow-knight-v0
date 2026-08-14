import { Entity } from '../entities/Entity.js';
import { Physics } from '../engine/Physics.js';
import { SpellProjectile } from '../entities/SpellProjectile.js';

export class Player extends Entity {
  constructor(x, y) {
    super(x, y, 22, 34);
    this.boxOffsetX = 5;
    this.boxOffsetY = 4;

    // Stats (9 Max Soul Vessel Capacity: 3 Soul per Heal / Spell)
    this.maxMasks = 5;
    this.masks = 5;
    this.soul = 0;
    this.maxSoul = 9;
    this.geo = 0;

    // Movement Tuning
    this.moveSpeed = 210;
    this.jumpForce = -570;
    this.wallSlideSpeed = 90;

    // Jump Responsiveness Buffers
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;

    // Dash (Mothwing Cloak & 1.0s Shade Cloak Cooldown)
    this.dashSpeed = 520;
    this.dashDuration = 0.22;
    this.dashTimer = 0;
    this.dashCooldown = 0.6;
    this.dashCooldownTimer = 0;
    this.shadowDashCooldown = 1.0;
    this.shadowDashCooldownTimer = 0;
    this.isDashing = false;
    this.isShadowDash = false;
    this.dashDirX = 1;
    this.dashDirY = 0;
    this.hasAirDashed = false;

    // Desolate Dive & Howling Wraiths Spells
    this.isDiving = false;
    this.didDiveImpact = false;
    this.isShrieking = false;
    this.shriekTimer = 0;
    this.didShriekImpact = false;

    // Wall Jump
    this.isWallSliding = false;
    this.wallJumpTimer = 0;

    // Combat & Attack
    this.attackTimer = 0;
    this.attackCooldown = 0.35;
    this.isAttacking = false;
    this.attackDirection = 'horizontal';
    this.attackHitbox = null;

    // Spells
    this.spellProjectiles = [];

    // Invulnerability
    this.invulnerable = false;
    this.invulnerableTimer = 0;

    // Focus Healing
    this.isFocusing = false;
    this.healCooldownTimer = 0;
    this.focusPrompt = '';
    this.focusPromptTimer = 0;

    // Crystal Heart (Super Dash)
    this.isChargingSuperDash = false;
    this.superDashChargeTimer = 0;
    this.isSuperDashing = false;
    this.superDashDir = 1;

    // Unlocked Abilities
    this.abilities = {
      dash: false,
      shadowDash: false,
      wallJump: false,
      vengefulSpirit: false,
      desolateDive: false,
      howlingWraiths: false,
      superDash: false
    };

    // Charms & Modifiers
    this.equippedCharms = [];

    // Animation Timer & Character Poses
    this.animTimer = 0;

    // Hazard Safe Respawn Position
    this.lastSafeX = x;
    this.lastSafeY = y;
  }

  hasCharm(charmId) {
    return this.equippedCharms && this.equippedCharms.includes(charmId);
  }

  addSoul(amount = 1) {
    const gained = this.hasCharm('SOUL_CATCHER') ? 2 : (amount || 1);
    this.soul = Math.min(this.maxSoul, (this.soul || 0) + gained);
  }

  update(dt, input, soundManager, particles, tilemap, camera) {
    super.update(dt);
    this.animTimer += dt;

    if (this.focusPromptTimer > 0) this.focusPromptTimer -= dt;
    if (this.healCooldownTimer > 0) this.healCooldownTimer -= dt;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) {
        this.invulnerable = false;
      }
    }

    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;
    if (this.shadowDashCooldownTimer > 0) this.shadowDashCooldownTimer -= dt;
    if (this.wallJumpTimer > 0) this.wallJumpTimer -= dt;

    if (this.shriekTimer > 0) {
      this.shriekTimer -= dt;
      if (this.shriekTimer <= 0) {
        this.isShrieking = false;
      }
    }

    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.attackHitbox = null;
      }
    }

    // Update Active Spell Projectiles
    if (this.spellProjectiles) {
      for (let i = this.spellProjectiles.length - 1; i >= 0; i--) {
        const proj = this.spellProjectiles[i];
        proj.update(dt, tilemap, soundManager, particles);
        if (!proj.active) {
          this.spellProjectiles.splice(i, 1);
        }
      }
    }

    // Handle Desolate Dive Downward Slam State
    if (this.isDiving) {
      this.vy = 880;
      this.vx = 0;
      if (particles && particles.spawnHitSparks) {
        particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height, 2, '#88d6ff');
      }
      Physics.checkTileCollision(this, tilemap, dt);
      if (this.grounded) {
        this.isDiving = false;
        this.didDiveImpact = true;
        this.invulnerable = true;
        this.invulnerableTimer = 0.8;
      }
      return;
    }

    // Handle Crystal Heart Super Dash Flight State (Hold [F] Release Action)
    if (this.isSuperDashing) {
      this.vx = this.superDashDir * 750; // High speed jet flight!
      this.vy = 0; // Zero gravity flight
      this.invulnerable = true;
      this.invulnerableTimer = 0.2; // Invulnerable to damage while Super Dashing!

      if (particles && particles.spawnHitSparks && Math.random() < 0.6) {
        particles.spawnHitSparks(this.x + (this.superDashDir > 0 ? 0 : this.width), this.y + this.height / 2, 2, '#ff66cc');
      }

      // Cancel Super Dash on Jump key [Space/Z/J/Enter] or Up Arrow [Up/W]
      const isUpPressed = input && (input.isDown('up') || input.isJustPressed('up'));
      const isJumpPressed = input && (input.isDown('jump') || input.isJustPressed('jump'));

      if (isUpPressed || isJumpPressed) {
        this.isSuperDashing = false;
        this.vy = -180; // Cancel flight with slight lift
        if (soundManager && soundManager.playSlash) soundManager.playSlash();
      }

      Physics.checkTileCollision(this, tilemap, dt);

      // Cancel Super Dash if player hits a wall in front
      if (this.onLeftWall || this.onRightWall) {
        this.isSuperDashing = false;
        this.vx = 0;
        if (soundManager && soundManager.playHit) soundManager.playHit();
        if (particles && particles.spawnHitSparks) {
          particles.spawnHitSparks(this.x + (this.onLeftWall ? 0 : this.width), this.y + this.height / 2, 16, '#ff66cc');
        }
        if (camera && camera.shake) camera.shake(4, 0.18);
      }
      return;
    }

    // Handle Dash State
    if (this.isDashing) {
      this.dashTimer -= dt;
      if (!this.grounded && !this.isWallSliding) {
        this.hasAirDashed = true; // Consumes air dash for any airborne frame (up, down, or sideways)
      }
      if (this.dashDirY !== 0) {
        this.vx = this.dashDirX * this.dashSpeed;
        this.vy = this.dashDirY * this.dashSpeed;
      } else {
        this.vx = this.dashDirX * this.dashSpeed;
        this.vy = 0;
      }
      particles.spawnDust(this.x + this.width / 2, this.y + (this.dashDirY > 0 ? 0 : this.height), 2);

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.isShadowDash = false;
        this.dashDirX = this.facing;
        this.dashDirY = 0;
      }
      Physics.checkTileCollision(this, tilemap, dt);
      return;
    }

    // Horizontal Controls
    if (this.wallJumpTimer <= 0) {
      let moveDir = 0;
      if (input.isDown('left')) moveDir -= 1;
      if (input.isDown('right')) moveDir += 1;

      if (moveDir !== 0) {
        this.vx = moveDir * this.moveSpeed;
        this.facing = moveDir;
      } else {
        this.vx = 0;
      }
    }

    // Check Wall Slide & Tile Collisions
    this.onLeftWall = false;
    this.onRightWall = false;
    Physics.checkTileCollision(this, tilemap, dt);

    // Wall Slide Logic (Requires Mantis Claw)
    const inAir = !this.grounded;
    const touchingWall = (this.onLeftWall || this.onRightWall);
    const pushingWall = (this.onLeftWall && input.isDown('left')) || (this.onRightWall && input.isDown('right'));

    if (this.abilities.wallJump && inAir && touchingWall && (pushingWall || this.vy > 0)) {
      this.isWallSliding = true;
      this.facing = this.onLeftWall ? 1 : -1; // Point AWAY from the wall while clinging to it!
      if (this.vy > this.wallSlideSpeed) {
        this.vy = this.wallSlideSpeed; // Controlled slow slide down wall (90px/s)
      }
      if (particles && Math.random() < 0.4) {
        const dustX = this.onLeftWall ? this.x + 2 : this.x + this.width - 2;
        particles.spawnDust(dustX, this.y + this.height * 0.6, 1);
      }
    } else {
      this.isWallSliding = false;
    }

    // Track Safe Ground Checkpoints
    if (this.grounded && tilemap) {
      const bounds = this.getBounds();
      const isSpikes = Physics.checkBoundsHazard(bounds, tilemap);
      const isAcid = Physics.checkBoundsAcid(bounds, tilemap);
      const onCrumbling = tilemap.platforms && tilemap.platforms.some(p => p.active && p.solid && p.state === 'SHAKING');

      if (!isSpikes && !isAcid && !onCrumbling) {
        this.lastSafeX = this.x;
        this.lastSafeY = this.y;
      }
    }

    // Hazard & Acid Collision Respawn Check
    if (tilemap) {
      const bounds = this.getBounds();
      if (Physics.checkBoundsHazard(bounds, tilemap) || Physics.checkBoundsAcid(bounds, tilemap)) {
        this.triggerHazardRespawn(soundManager, particles, camera);
        return;
      }
    }

    // Grounded / Coyote Time / Wall Slide Management
    if (this.grounded || this.isWallSliding) {
      this.coyoteTimer = 0.12; // 120ms coyote time window
      this.hasAirDashed = false; // Reset midair dash state upon touching ground or wall sliding!
    } else {
      if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
    }

    // Jump Input Buffering
    if (input.isJustPressed('jump')) {
      this.jumpBufferTimer = 0.15; // 150ms jump buffering window
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
    }

    // Execute Jump / Wall Jump
    if (this.jumpBufferTimer > 0) {
      const onWall = (this.onLeftWall || this.onRightWall) && !this.grounded;
      if (onWall && this.abilities.wallJump) {
        const wallDir = this.onLeftWall ? 1 : -1;
        this.vy = -450; // Strong upward jump lift
        this.vx = wallDir * 340; // Strong diagonal push-off momentum away from the wall!
        this.facing = wallDir; // Point away from wall in leap direction
        this.wallJumpTimer = 0.24; // 240ms steering lockout away from wall
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        soundManager.playSlash();
        particles.spawnDust(this.x + (this.onLeftWall ? 0 : this.width), this.y + this.height / 2, 8);
      } else if (this.grounded || this.coyoteTimer > 0) {
        this.vy = this.jumpForce;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        soundManager.playSlash();
        particles.spawnDust(this.x + this.width / 2, this.y + this.height, 6);
      }
    }

    // Variable Jump Height
    if (!input.isDown('jump') && this.vy < -150) {
      this.vy = -150;
    }

    // Dash Trigger (Single Midair Dash Limit & Cooldowns)
    const canDash = this.abilities.dash && this.dashCooldownTimer <= 0 && !this.hasAirDashed;
    if (input.isJustPressed('dash') && canDash) {
      this.isDashing = true;
      this.dashTimer = this.dashDuration;
      if (!this.grounded && !this.isWallSliding) {
        this.hasAirDashed = true; // Lock further air dashes until landing or wall sliding
      }
      const cooldown = this.hasCharm('DASHMASTER') ? this.dashCooldown * 0.5 : this.dashCooldown;
      this.dashCooldownTimer = cooldown;

      // Dashmaster Directional Controls (Upward / Downward / Horizontal)
      if (this.hasCharm('DASHMASTER')) {
        const isDown = input && input.isDown('down');
        const isUp = input && input.isDown('up');

        if (isDown && !this.grounded) {
          this.dashDirX = 0;
          this.dashDirY = 1;
        } else if (isUp) {
          this.dashDirX = 0;
          this.dashDirY = -1;
        } else {
          this.dashDirX = this.facing;
          this.dashDirY = 0;
        }
      } else {
        this.dashDirX = this.facing;
        this.dashDirY = 0;
      }

      this.vx = this.dashDirX * this.dashSpeed;
      this.vy = this.dashDirY * this.dashSpeed;

      const canShadowDash = this.abilities.shadowDash && this.shadowDashCooldownTimer <= 0;
      this.isShadowDash = canShadowDash;
      if (this.isShadowDash) {
        this.shadowDashCooldownTimer = this.shadowDashCooldown; // 1.0 second Shade Cloak cooldown
        this.invulnerable = true;
        this.invulnerableTimer = this.dashDuration + 0.15; // 0.37s total invulnerability window
      }
      soundManager.playDash();
    }

    // Super Dash Charge Trigger (Hold [F] key on ground or while wall sliding)
    const canChargeSuperDash = this.abilities.superDash && (this.grounded || this.isWallSliding);
    const isSuperDashKeyDown = input && (input.isDown('superDash') || input.isDown('f') || input.isDown('KeyF'));

    if (canChargeSuperDash && isSuperDashKeyDown && !this.isDashing && !this.isDiving && !this.isShrieking) {
      if (!this.isChargingSuperDash) {
        this.isChargingSuperDash = true;
        this.superDashChargeTimer = 0;
      }
      this.superDashChargeTimer += dt;
      this.vx = 0; // Freeze horizontal movement while charging
      if (this.isWallSliding) this.vy = 0; // Freeze wall slide fall while charging!

      // Spawn glowing pink crystal charge particles
      if (particles && particles.spawnHitSparks && Math.random() < 0.4) {
        const cx = this.x + (this.onLeftWall ? 0 : (this.onRightWall ? this.width : this.width / 2));
        particles.spawnHitSparks(cx, this.y + this.height / 2, 2, '#ff66cc');
      }
    } else if (this.isChargingSuperDash) {
      // Key released or no longer grounded/wall-sliding
      if (this.superDashChargeTimer >= 0.35) {
        // Launch Super Dash!
        this.isSuperDashing = true;
        this.isChargingSuperDash = false;
        this.superDashDir = this.isWallSliding ? (this.onLeftWall ? 1 : -1) : this.facing;
        this.facing = this.superDashDir;
        this.vx = this.superDashDir * 750;
        this.vy = 0;
        this.invulnerable = true;
        this.invulnerableTimer = 0.3;
        if (soundManager && soundManager.playDash) soundManager.playDash();
        if (particles && particles.spawnShockwave) {
          particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 80, '#ff66cc');
        }
      } else {
        // Released too early (cancel charge)
        this.isChargingSuperDash = false;
        this.superDashChargeTimer = 0;
      }
    }

    // Spell Cast Trigger (Vengeful Spirit vs Desolate Dive vs Howling Wraiths)
    if (input.isJustPressed('spell')) {
      this.castSpell(soundManager, particles, tilemap, input);
    }

    // Nail Attack
    const cooldown = this.hasCharm('QUICK_SLASH') ? this.attackCooldown * 0.6 : this.attackCooldown;
    if (input.isJustPressed('attack') && this.attackTimer <= 0) {
      this.performAttack(input, soundManager, particles);
    }

    // Instant / Responsive Focus Healing
    if ((input.isJustPressed('focus') || input.isDown('focus')) && this.healCooldownTimer <= 0) {
      this.performHeal(soundManager, particles);
    }
  }

  takeDamage(damage = 1, sourceX, soundManager, particles, camera) {
    if (this.invulnerable || (this.isDashing && this.isShadowDash) || this.isDiving) return;

    this.masks = Math.max(0, this.masks - 1);
    this.invulnerable = true;
    this.invulnerableTimer = 1.3;

    const knockDir = sourceX ? (this.x < sourceX ? -1 : 1) : -this.facing;
    this.vx = knockDir * 240;
    this.vy = -260;

    if (soundManager && soundManager.playHurt) soundManager.playHurt();
    if (particles && particles.spawnHitSparks) particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 12, '#ff4444');
    if (camera && camera.shake) camera.shake(2, 0.12);
  }

  castSpell(soundManager, particles, tilemap, input) {
    const isDownPressed = input && (input.isDown('down') || input.isDown('s') || input.isDown('ArrowDown') || input.isDown('KeyS'));
    const isUpPressed = input && (input.isDown('up') || input.isDown('w') || input.isDown('ArrowUp') || input.isDown('KeyW'));

    if (isUpPressed) {
      // Trigger Howling Wraiths Upward Eruption Spell
      if (!this.abilities.howlingWraiths) {
        this.focusPrompt = 'HOWLING WRAITHS LOCKED';
        this.focusPromptTimer = 0.8;
        return;
      }

      const soulCost = this.hasCharm('SPELL_TWISTER') ? 2 : 3;
      if (this.soul < soulCost) {
        this.focusPrompt = 'NEED 3 SOUL!';
        this.focusPromptTimer = 0.8;
        return;
      }

      this.soul -= soulCost;
      this.isShrieking = true;
      this.shriekTimer = 0.4;
      this.didShriekImpact = true;
      this.vy = -140; // Upward float lift

      if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
      if (particles && particles.spawnShockwave) {
        particles.spawnShockwave(this.x + this.width / 2, this.y - 15, 100, '#ffffff');
      }
      return;
    }

    if (isDownPressed) {
      // Trigger Desolate Dive Spell
      if (!this.abilities.desolateDive) {
        this.focusPrompt = 'DESOLATE DIVE LOCKED';
        this.focusPromptTimer = 0.8;
        return;
      }

      const soulCost = this.hasCharm('SPELL_TWISTER') ? 2 : 3;
      if (this.soul < soulCost) {
        this.focusPrompt = 'NEED 3 SOUL!';
        this.focusPromptTimer = 0.8;
        return;
      }

      this.soul -= soulCost;
      this.isDiving = true;
      this.vy = 880;
      this.vx = 0;
      this.invulnerable = true;
      this.invulnerableTimer = 1.0;

      if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
      if (particles && particles.spawnShockwave) {
        particles.spawnShockwave(this.x + this.width / 2, this.y + 10, 80, '#ffffff');
      }
      return;
    }

    // Default Vengeful Spirit Spell
    if (!this.abilities.vengefulSpirit) {
      this.focusPrompt = 'VENGEFUL SPIRIT LOCKED';
      this.focusPromptTimer = 0.8;
      return;
    }

    const soulCost = this.hasCharm('SPELL_TWISTER') ? 2 : 3;
    if (this.soul < soulCost) {
      this.focusPrompt = 'NEED 3 SOUL!';
      this.focusPromptTimer = 0.8;
      return;
    }

    this.soul -= soulCost;
    const projX = this.x + (this.facing > 0 ? this.width + 5 : -48);
    const projY = this.y + 2;
    const proj = new SpellProjectile(projX, projY, this.facing);

    if (!this.spellProjectiles) this.spellProjectiles = [];
    this.spellProjectiles.push(proj);

    if (soundManager && soundManager.playBossRoar) soundManager.playBossRoar();
    if (particles && particles.spawnShockwave) {
      particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 70, '#88d6ff');
    }
  }

  triggerHazardRespawn(soundManager, particles, camera) {
    if (this.invulnerable || (this.isDashing && this.isShadowDash) || this.isDiving) return;

    this.masks = Math.max(0, this.masks - 1);
    this.x = this.lastSafeX;
    this.y = this.lastSafeY;
    this.vx = 0;
    this.vy = 0;
    this.invulnerable = true;
    this.invulnerableTimer = 1.4;

    if (soundManager && soundManager.playHurt) soundManager.playHurt();
    if (particles && particles.spawnHitSparks) particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 12, '#ff4444');
    if (camera && camera.shake) camera.shake(3, 0.15);
  }

  performHeal(soundManager, particles) {
    if (this.masks >= this.maxMasks) {
      this.focusPrompt = 'FULL HEALTH (5/5)';
      this.focusPromptTimer = 0.6;
      this.healCooldownTimer = 0.4;
      return;
    }

    const healCost = 3;
    if (this.soul < healCost) {
      this.focusPrompt = 'NEED 3 SOUL!';
      this.focusPromptTimer = 0.6;
      this.healCooldownTimer = 0.4;
      return;
    }

    this.soul -= healCost;
    this.masks = Math.min(this.maxMasks, this.masks + 1);
    this.healCooldownTimer = 0.6; // 600ms focus heal hold cooldown

    if (soundManager && soundManager.playHealComplete) soundManager.playHealComplete();
    if (particles && particles.spawnShockwave) {
      particles.spawnShockwave(this.x + this.width / 2, this.y + this.height / 2, 60, '#ffffff');
      particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 10, '#88d6ff');
    }
  }

  pogoBounce() {
    this.vy = -380; // Energetic upward pogo bounce
    this.coyoteTimer = 0.12;
  }

  performAttack(input, soundManager, particles) {
    const isLongnail = this.hasCharm('LONGNAIL') || this.hasCharm('MARK_OF_PRIDE');
    const attackReach = isLongnail ? 120 : 95; // 95px horizontal reach
    const attackThickness = 22; // Sleek 22px thickness

    this.isAttacking = true;
    const cooldown = this.hasCharm('QUICK_SLASH') ? this.attackCooldown * 0.6 : this.attackCooldown;
    this.attackTimer = cooldown;

    if (input.isDown('up')) {
      this.attackDirection = 'up';
      this.attackHitbox = {
        x: this.x - (attackReach - this.width) / 2,
        y: this.y - attackReach,
        width: attackReach,
        height: attackReach
      };
    } else if (input.isDown('down') && !this.grounded) {
      this.attackDirection = 'down';
      this.attackHitbox = {
        x: this.x - (attackReach - this.width) / 2,
        y: this.y + this.height,
        width: attackReach,
        height: attackReach
      };
    } else {
      this.attackDirection = 'horizontal';
      const attackX = this.facing > 0 ? this.x + this.width : this.x - attackReach;
      this.attackHitbox = {
        x: attackX,
        y: this.y + (this.height - attackThickness) / 2,
        width: attackReach,
        height: attackThickness
      };
    }

    if (soundManager && soundManager.playSlash) soundManager.playSlash();
    if (particles && particles.spawnSlash) particles.spawnSlash(this.x + this.width / 2, this.y + this.height / 2, this.facing, this.attackDirection);
  }

  draw(ctx, camera) {
    const view = camera.getView();
    const screenX = Math.round(this.x - view.x);
    const screenY = Math.round(this.y - view.y);

    ctx.save();

    // Draw Active Spell Projectiles
    if (this.spellProjectiles) {
      for (const proj of this.spellProjectiles) {
        proj.draw(ctx, camera);
      }
    }

    // Howling Wraiths Upward Eruption & Screaming Ghost Spirits
    if (this.isShrieking) {
      const centerX = screenX + 11;
      const startY = screenY + 5;
      const topY = screenY - 160;

      // 1. Outer Ethereal Energy Flame Plume (Bezier Curve)
      const grad = ctx.createLinearGradient(centerX, startY, centerX, topY);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.3, 'rgba(140, 220, 255, 0.85)');
      grad.addColorStop(0.7, 'rgba(40, 100, 180, 0.65)');
      grad.addColorStop(1, 'rgba(10, 25, 55, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(centerX - 15, startY);
      ctx.bezierCurveTo(centerX - 35, startY - 50, centerX - 55, topY + 40, centerX - 45, topY);
      ctx.lineTo(centerX + 45, topY);
      ctx.bezierCurveTo(centerX + 55, topY + 40, centerX + 35, startY - 50, centerX + 15, startY);
      ctx.closePath();
      ctx.fill();

      // Bright Core Beam
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.moveTo(centerX - 8, startY);
      ctx.bezierCurveTo(centerX - 18, startY - 40, centerX - 30, topY + 30, centerX - 22, topY);
      ctx.lineTo(centerX + 22, topY);
      ctx.bezierCurveTo(centerX + 30, topY + 30, centerX + 18, startY - 40, centerX + 8, startY);
      ctx.closePath();
      ctx.fill();

      // 2. Screaming Ghost Spirit Masks (3 Ethereal Phantoms ascending)
      const ghosts = [
        { yOffset: 35, scale: 0.8, xShift: -12 },
        { yOffset: 85, scale: 1.1, xShift: 10 },
        { yOffset: 135, scale: 1.3, xShift: -5 }
      ];

      ghosts.forEach(g => {
        const gy = startY - g.yOffset;
        const gx = centerX + g.xShift;
        const s = g.scale;

        // Spirit Ghost Mask Head
        ctx.fillStyle = 'rgba(240, 250, 255, 0.92)';
        ctx.beginPath();
        ctx.ellipse(gx, gy, 9 * s, 11 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Gaping Screaming Mouth & Eye Sockets
        ctx.fillStyle = '#050a15';
        ctx.beginPath();
        ctx.ellipse(gx - 3.5 * s, gy - 2 * s, 2 * s, 3.5 * s, -0.15, 0, Math.PI * 2);
        ctx.ellipse(gx + 3.5 * s, gy - 2 * s, 2 * s, 3.5 * s, 0.15, 0, Math.PI * 2);
        ctx.ellipse(gx, gy + 4 * s, 2.8 * s, 4.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ethereal Horns / Wisps
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.8 * s;
        ctx.beginPath();
        ctx.moveTo(gx - 6 * s, gy - 7 * s);
        ctx.quadraticCurveTo(gx - 14 * s, gy - 18 * s, gx - 4 * s, gy - 22 * s);
        ctx.moveTo(gx + 6 * s, gy - 7 * s);
        ctx.quadraticCurveTo(gx + 14 * s, gy - 18 * s, gx + 4 * s, gy - 22 * s);
        ctx.stroke();
      });

      // 3. Jagged Spirit Energy Tendrils
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const tY = startY - (i * 45 + 20);
        ctx.beginPath();
        ctx.moveTo(centerX - 25, tY);
        ctx.lineTo(centerX - 10, tY - 15);
        ctx.lineTo(centerX + 15, tY - 10);
        ctx.lineTo(centerX + 30, tY - 25);
        ctx.stroke();
      }
    }

    // Desolate Dive Radiant Glowing Energy Aura
    if (this.isDiving) {
      ctx.fillStyle = 'rgba(180, 235, 255, 0.6)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(screenX + 11, screenY + 17, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Crystal Heart Super Dash Charge & Jet Flight Effects
    if (this.isChargingSuperDash) {
      ctx.fillStyle = 'rgba(255, 100, 200, 0.45)';
      ctx.strokeStyle = '#ff99dd';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(screenX + 11, screenY + 17, 26 + Math.sin(Date.now() / 40) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (this.isSuperDashing) {
      const trailLen = 35;
      const trailX = screenX + 11 - this.superDashDir * trailLen;
      const trailY = screenY + 17;
      ctx.fillStyle = 'rgba(255, 100, 200, 0.6)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(screenX + 11, screenY + 6);
      ctx.lineTo(trailX, trailY);
      ctx.lineTo(screenX + 11, screenY + 28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Focus Healing Status Prompt Banner
    if (this.focusPromptTimer > 0) {
      const alpha = Math.min(1, this.focusPromptTimer * 2);
      ctx.fillStyle = `rgba(10, 16, 28, ${alpha * 0.85})`;
      ctx.strokeStyle = '#88d6ff';
      ctx.lineWidth = 1.5;
      ctx.fillRect(screenX - 50, screenY - 42, 130, 22);
      ctx.strokeRect(screenX - 50, screenY - 42, 130, 22);

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.font = '700 11px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.focusPrompt, screenX + 15, screenY - 27);
    }

    // Shadow Dash Visual Effect (Dark Void Phantom Trail)
    if (this.isDashing && this.isShadowDash) {
      const trailX = screenX - (this.dashDirX || this.facing) * 14;
      const trailY = screenY - (this.dashDirY || 0) * 14;
      ctx.fillStyle = 'rgba(10, 15, 30, 0.7)';
      ctx.strokeStyle = '#607090';
      ctx.lineWidth = 2;
      ctx.fillRect(trailX, trailY, this.width, this.height);
      ctx.strokeRect(trailX, trailY, this.width, this.height);
    }

    // Invulnerability Flashing
    if (this.invulnerable && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // ----------------------------------------------------
    // PROCEDURAL SKELETAL & CLOAK ANIMATION SYSTEM
    // ----------------------------------------------------
    const isMoving = this.grounded && Math.abs(this.vx) > 10;
    const isAirborne = !this.grounded && !this.isWallSliding;

    // 1. Calculate Body Offsets & Rotations per State
    let bodyBobY = 0;
    let bodyTilt = 0;
    let cloakWave = Math.sin(this.animTimer * 4) * 1.2;
    let leftLegOffset = 0;
    let rightLegOffset = 0;

    if (isMoving) {
      bodyBobY = Math.abs(Math.sin(this.animTimer * 18)) * 2.5;
      cloakWave = Math.sin(this.animTimer * 18) * 5;
      leftLegOffset = Math.sin(this.animTimer * 18) * 5;
      rightLegOffset = -Math.sin(this.animTimer * 18) * 5;
      bodyTilt = this.facing * 0.08;
    } else if (this.isDashing) {
      if (this.dashDirY < 0) {
        bodyTilt = -Math.PI / 2; // Upward dash vertical pose
      } else if (this.dashDirY > 0) {
        bodyTilt = Math.PI / 2; // Downward dash vertical pose
      } else {
        bodyTilt = (this.dashDirX || this.facing) * 0.38; // Horizontal aerodynamic dash tilt
      }
      cloakWave = Math.sin(this.animTimer * 30) * 7;
    } else if (this.isWallSliding) {
      bodyTilt = this.onLeftWall ? -0.16 : 0.16; // Lean against wall
    } else if (isAirborne) {
      if (this.vy < 0) {
        bodyBobY = -2; // Jump upward lift
        cloakWave = 6; // Cloak flares down
      } else {
        bodyBobY = 2; // Fall drop
        cloakWave = -4; // Cloak flares up
      }
    }

    ctx.save();
    ctx.translate(screenX + 11, screenY + 17 + bodyBobY);
    if (bodyTilt !== 0) ctx.rotate(bodyTilt);

    // 2. Animated Knight Feet & Leg Strides (Under Cloak)
    ctx.fillStyle = '#0a0d14';
    if (isMoving) {
      ctx.fillRect(-6 + leftLegOffset, 12, 4, 6);
      ctx.fillRect(2 + rightLegOffset, 12, 4, 6);
    } else if (isAirborne) {
      ctx.fillRect(-5, 10, 4, 5);
      ctx.fillRect(1, 10, 4, 5);
    } else {
      ctx.fillRect(-6, 12, 4, 5);
      ctx.fillRect(2, 12, 4, 5);
    }

    // 3. Flowing Vessel Cloak (Animated Bezier Wave)
    ctx.fillStyle = '#232b38';
    ctx.beginPath();
    ctx.moveTo(-11, 2);
    ctx.quadraticCurveTo(-15 - cloakWave * 0.5, 12, -10 + leftLegOffset * 0.5, 16);
    ctx.lineTo(10 + rightLegOffset * 0.5, 16);
    ctx.quadraticCurveTo(15 + cloakWave * 0.5, 12, 11, 2);
    ctx.closePath();
    ctx.fill();

    // Inner Vessel Body
    ctx.fillStyle = '#111622';
    ctx.beginPath();
    ctx.ellipse(0, 5, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. White Mask Head
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath();
    ctx.ellipse(0, -7, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Black Eye Sockets (Follows Facing Direction)
    ctx.fillStyle = '#05060a';
    ctx.beginPath();
    const eyeX = this.facing > 0 ? 2 : -2;
    ctx.ellipse(-3 + eyeX, -7, 2, 3.5, 0.1, 0, Math.PI * 2);
    ctx.ellipse(3 + eyeX, -7, 2, 3.5, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // 6. Iconic Curved White Horns
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath();
    ctx.moveTo(-6, -11);
    ctx.quadraticCurveTo(-10, -23, -3, -15);
    ctx.lineTo(-6, -11);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(6, -11);
    ctx.quadraticCurveTo(10, -23, 3, -15);
    ctx.lineTo(6, -11);
    ctx.fill();

    // 7. Animated Pure Nail Swing & Slashing Blade Arc
    if (this.isAttacking) {
      const progress = 1 - (this.attackTimer / this.attackCooldown); // 0 to 1
      const slashAngle = (progress - 0.5) * Math.PI * 1.2; // Slashing arc rotation

      ctx.save();
      if (this.attackDirection === 'up') {
        ctx.translate(0, -15);
        ctx.rotate(-Math.PI / 2 + slashAngle * 0.5);
      } else if (this.attackDirection === 'down') {
        ctx.translate(0, 15);
        ctx.rotate(Math.PI / 2 + slashAngle * 0.5);
      } else {
        ctx.translate(this.facing * 10, 0);
        ctx.rotate(this.facing > 0 ? slashAngle : -slashAngle);
      }

      // Animated Slashing Blade Crescent Arc
      ctx.strokeStyle = 'rgba(230, 242, 255, 0.95)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 28, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Pure Nail Weapon
      ctx.strokeStyle = '#c0d0e4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(this.facing * 26, 0);
      ctx.stroke();

      ctx.restore();
    } else {
      // Sheathed / Rest Pure Nail
      ctx.strokeStyle = '#c0d0e4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const nX = this.facing > 0 ? 6 : -6;
      ctx.moveTo(nX, 0);
      ctx.lineTo(nX + this.facing * 10, 8);
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }
}
