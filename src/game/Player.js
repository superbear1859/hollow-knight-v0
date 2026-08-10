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

    // Dash
    this.dashSpeed = 520;
    this.dashDuration = 0.22;
    this.dashTimer = 0;
    this.dashCooldown = 0.6;
    this.dashCooldownTimer = 0;
    this.isDashing = false;
    this.isShadowDash = false;

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

    // Unlocked Abilities
    this.abilities = {
      dash: false,
      shadowDash: false,
      wallJump: false,
      vengefulSpirit: false
    };

    // Charms & Modifiers
    this.equippedCharms = [];

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

    if (this.focusPromptTimer > 0) this.focusPromptTimer -= dt;
    if (this.healCooldownTimer > 0) this.healCooldownTimer -= dt;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) {
        this.invulnerable = false;
      }
    }

    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;
    if (this.wallJumpTimer > 0) this.wallJumpTimer -= dt;

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

    // Handle Dash State
    if (this.isDashing) {
      this.dashTimer -= dt;
      this.vx = this.facing * this.dashSpeed;
      this.vy = 0;
      particles.spawnDust(this.x + this.width / 2, this.y + this.height, 2);

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.isShadowDash = false;
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

    // Grounded / Coyote Time Management
    if (this.grounded) {
      this.coyoteTimer = 0.12; // 120ms coyote time window
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
      if (this.grounded || this.coyoteTimer > 0) {
        this.vy = this.jumpForce;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        soundManager.playSlash();
        particles.spawnDust(this.x + this.width / 2, this.y + this.height, 6);
      } else if (onWall && this.abilities.wallJump) {
        this.vy = this.jumpForce * 0.9;
        const wallDir = this.onLeftWall ? 1 : -1;
        this.vx = wallDir * this.moveSpeed * 1.2;
        this.facing = wallDir;
        this.wallJumpTimer = 0.18;
        this.jumpBufferTimer = 0;
        soundManager.playSlash();
        particles.spawnDust(this.x + (this.onLeftWall ? 0 : this.width), this.y + this.height / 2, 6);
      }
    }

    // Variable Jump Height
    if (!input.isDown('jump') && this.vy < -150) {
      this.vy = -150;
    }

    // Dash Trigger
    const canDash = this.abilities.dash && this.dashCooldownTimer <= 0;
    if (input.isJustPressed('dash') && canDash) {
      this.isDashing = true;
      this.dashTimer = this.dashDuration;
      const cooldown = this.hasCharm('DASHMASTER') ? this.dashCooldown * 0.5 : this.dashCooldown;
      this.dashCooldownTimer = cooldown;
      this.isShadowDash = this.abilities.shadowDash;
      if (this.isShadowDash) {
        this.invulnerable = true;
        this.invulnerableTimer = this.dashDuration;
      }
      soundManager.playDash();
    }

    // Vengeful Spirit Spell Trigger
    if (input.isJustPressed('spell')) {
      this.castSpell(soundManager, particles, tilemap);
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

  takeDamage(damage, sourceX, soundManager, particles, camera) {
    if (this.invulnerable || (this.isDashing && this.isShadowDash)) return;

    this.masks = Math.max(0, this.masks - damage);
    this.invulnerable = true;
    this.invulnerableTimer = 1.2;

    const knockDir = sourceX ? (this.x < sourceX ? -1 : 1) : -this.facing;
    this.vx = knockDir * 240;
    this.vy = -260;

    if (soundManager && soundManager.playHurt) soundManager.playHurt();
    if (particles && particles.spawnHitSparks) particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 12, '#ff4444');
    if (camera && camera.shake) camera.shake(6, 0.25);
  }

  castSpell(soundManager, particles, tilemap) {
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
    this.masks = Math.max(0, this.masks - 1);
    this.x = this.lastSafeX;
    this.y = this.lastSafeY;
    this.vx = 0;
    this.vy = 0;
    this.invulnerable = true;
    this.invulnerableTimer = 1.2;

    if (soundManager && soundManager.playHurt) soundManager.playHurt();
    if (particles && particles.spawnHitSparks) particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height / 2, 12, '#ff4444');
    if (camera && camera.shake) camera.shake(8, 0.3);
  }

  performHeal(soundManager, particles) {
    if (this.masks >= this.maxMasks) {
      this.focusPrompt = 'FULL HEALTH (5/5)';
      this.focusPromptTimer = 0.6;
      this.healCooldownTimer = 0.3;
      return;
    }

    const healCost = 3;
    if (this.soul < healCost) {
      this.focusPrompt = 'NEED 3 SOUL!';
      this.focusPromptTimer = 0.6;
      this.healCooldownTimer = 0.3;
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
    this.vy = -480; // Energetic upward pogo bounce
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

    // Focus Healing Status Prompt Banner
    if (this.focusPromptTimer > 0) {
      const alpha = Math.min(1, this.focusPromptTimer * 2);
      ctx.fillStyle = `rgba(10, 16, 28, ${alpha * 0.85})`;
      ctx.strokeStyle = '#88d6ff';
      ctx.lineWidth = 1.5;
      ctx.fillRect(screenX - 40, screenY - 42, 110, 22);
      ctx.strokeRect(screenX - 40, screenY - 42, 110, 22);

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.font = '700 11px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.focusPrompt, screenX + 15, screenY - 27);
    }

    // Shadow Dash Visual Effect (Dark Void Phantom Trail)
    if (this.isDashing && this.isShadowDash) {
      ctx.fillStyle = 'rgba(10, 15, 30, 0.7)';
      ctx.strokeStyle = '#607090';
      ctx.lineWidth = 2;
      ctx.fillRect(screenX - this.facing * 14, screenY, this.width, this.height);
      ctx.strokeRect(screenX - this.facing * 14, screenY, this.width, this.height);
    }

    // Invulnerability Flashing
    if (this.invulnerable && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // 1. Cloak (Dark Grey/Blue Flowing Vessel Cloak)
    ctx.fillStyle = '#232b38';
    ctx.beginPath();
    ctx.ellipse(screenX + 11, screenY + 22, 10, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. White Mask Head
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath();
    ctx.ellipse(screenX + 11, screenY + 10, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Black Eye Sockets
    ctx.fillStyle = '#05060a';
    ctx.beginPath();
    const eyeOffsetX = this.facing > 0 ? 2 : -2;
    ctx.ellipse(screenX + 8 + eyeOffsetX, screenY + 10, 2, 3.5, 0.1, 0, Math.PI * 2);
    ctx.ellipse(screenX + 14 + eyeOffsetX, screenY + 10, 2, 3.5, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // 4. Iconic Curved White Horns (Proper 4-argument quadraticCurveTo)
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath();
    ctx.moveTo(screenX + 5, screenY + 6);
    ctx.quadraticCurveTo(screenX + 1, screenY - 6, screenX + 8, screenY + 2);
    ctx.lineTo(screenX + 5, screenY + 6);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(screenX + 17, screenY + 6);
    ctx.quadraticCurveTo(screenX + 21, screenY - 6, screenX + 14, screenY + 2);
    ctx.lineTo(screenX + 17, screenY + 6);
    ctx.fill();

    // 5. Razor-sharp Pure Nail
    ctx.strokeStyle = '#c0d0e4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const nailX = this.facing > 0 ? screenX + 18 : screenX + 4;
    ctx.moveTo(nailX, screenY + 16);
    ctx.lineTo(nailX + this.facing * 12, screenY + 24);
    ctx.stroke();

    ctx.restore();
  }
}
