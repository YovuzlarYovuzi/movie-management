/* global Phaser */

class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: "BattleScene" });
    this.state = null;
    this.player = null;
    this.boss = null;
    this.ground = null;
    this.keys = null;
    this.facing = 1;
    this.ready = false;

    this.playerHit = null;
    this.bossHit = null;
    this.projectiles = null;

    this.bossNextActionAt = 0;
    // ADD THIS: internal handlers to prevent duplicate listeners
    this._registryHandler = null;
    this._shutdownHandler = null;
    // Force-ban toggle: when true, client will be redirected to ban page and game won't start
    this._forceBan = false; // set to true to disable game temporarily
  }

  init(data) {
    const bossId = Number.isFinite(data?.bossId) ? Number(data.bossId) : 0;
    this.state = {
      startAt: Date.now(),
      bossId,
      lockBossId: Boolean(data?.lockBossId),
      victoryResolved: false,
      paused: false,
      lastEnd: null,
      levelCfg: null,
      equipped: {
        skinId: data?.skinId || null,
        damageMult: Number.isFinite(data?.damageMult) ? Number(data.damageMult) : 1.0,
        skillMult: Number.isFinite(data?.skillMult) ? Number(data.skillMult) : 1.0,
      },
      player: {
        max: 120,
        hp: 120,
        invulnUntil: 0,
        canAct: true,
        crouching: false,
        rollingUntil: 0,
        rollCdUntil: 0,
        attackLockUntil: 0,
        skillCdUntil: 0,
      },
      boss: {
        max: 170,
        hp: 170,
        invulnUntil: 0,
        canAct: true,
        attackLockUntil: 0,
        variant: "knight",
        dmgLight: 14,
        dmgHeavy: 26,
      },
      settings: {
        volume: 0.6,
        fps: 60,
        particles: true,
      },
    };
  }

  create() {
    this.ready = false;

    this.input.mouse.disableContextMenu();
    const mount = document.getElementById("battle-mount");
    if (mount) {
      mount.addEventListener("contextmenu", (e) => e.preventDefault(), { passive: false });
    }

    // Settings (from registry/localStorage)
    this.loadSettings();
    this.applySettings();

    // ADD THIS: load saved progression (levels, hp, upgrades) before arena setup
    try {
      this.loadGame();
    } catch (e) {
      // fail safe - ignore load errors
    }

    this.physics.world.setFPS(60);
    this.physics.world.gravity.y = 1600;
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

    this.registry.set("battlePaused", false);

    this.setupArena();
    this.spawnActors();
    this.setupInputs();
    this.setupCollisions();

    // Start with safe defaults, then refresh from backend.
    this.refreshFromBackend().catch(() => {});

    this.emitHp();
    this.ready = true;

    // ADD THIS: smooth fade-in for scene start
    try {
      this.cameras.main.fadeIn(400, 0, 0, 0);
    } catch (e) {}

    const levelNumber = this.state.levelCfg?.levelNumber;
    // Delay initial toast slightly so UIScene has time to create and bind handlers
    this.time.delayedCall(120, () => {
      try {
        console.log('[Battle] Start Level', levelNumber || 'ready', 'bossId=', this.state.bossId);
        this.events.emit("toast", levelNumber ? `Level ${levelNumber}` : "Ready");
      } catch (e) {
        // swallow
      }
    }, null, this);

    // If site/server indicates battle is disabled, show an in-scene modal (not an alert)
    try {
      const disabled = Boolean(window.__BATTLE_ENV && (window.__BATTLE_ENV.battleDisabled === true || window.__BATTLE_ENV.battleDisabled === 'true'));
      if (disabled) {
        // Pause the scene so update() early-returns
        this.state.paused = true;
        this.registry.set('battlePaused', true);

        const w = this.scale.width;
        const h = this.scale.height;
        const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.64).setScrollFactor(0).setDepth(4000);

        const panelW = Math.min(640, Math.max(420, Math.floor(w * 0.72)));
        const panelH = 240;
        const panel = this.add.container(w / 2, h / 2).setDepth(4001);
        const bg = this.add.rectangle(0, 0, panelW, panelH, 0x0a0c12, 0.96).setStrokeStyle(1, 0xffffff, 0.12);
        const title = this.add
          .text(0, -72, "O'yin yangilanmoqda", {
            fontFamily: "system-ui",
            fontSize: "20px",
            fontStyle: "900",
            color: "#ffffff",
          })
          .setOrigin(0.5, 0);

        const msg = this.add
          .text(0, -6, "O'yin hozircha dasturchilar tomonidan yangilash ishlari olib borilmoqda. Iltimos keyinroq qayta urinib ko'ring.", {
            fontFamily: "system-ui",
            fontSize: "14px",
            fontStyle: "700",
            color: "rgba(255,255,255,0.92)",
            align: "center",
            wordWrap: { width: panelW - 48 },
          })
          .setOrigin(0.5, 0.5);

        const okBtn = this.add.rectangle(0, 70, 140, 44, 0xffffff, 1).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const okText = this.add
          .text(0, 70, "OK", {
            fontFamily: "system-ui",
            fontSize: "16px",
            fontStyle: "900",
            color: "#10121a",
          })
          .setOrigin(0.5);

        panel.add([bg, title, msg, okBtn, okText]);

        // Disable input propagation to the game beneath
        overlay.setInteractive();

        okBtn.on("pointerdown", () => {
          try {
            this.playSfx && this.playSfx("sfx_menu", 0.5);
          } catch (e) {}
          overlay.destroy();
          panel.destroy();
          // Return to menu instead of entering the match
          try {
            this.scene.start && this.scene.start("MenuScene");
          } catch (e) {
            // fallback: just unpause
            this.state.paused = false;
            this.registry.set('battlePaused', false);
          }
        });
      }
    } catch (e) {
      // swallow
    }

    // ADD THIS: listen for external events from UI/shop safely (deduped)
    try {
      this.events.off && this.events.off('nextLevel');
      this.events.on('nextLevel', () => this.nextLevelTransition(this.state.bossId + 1), this);
      this.events.off && this.events.off('shopPurchase');
      this.events.on('shopPurchase', (data) => {
        try {
          if (data?.damageBoost) this.state.equipped.damageMult = Number(this.state.equipped.damageMult || 1) + Number(data.damageBoost || 0);
          if (data?.skillBoost) this.state.equipped.skillMult = Number(this.state.equipped.skillMult || 1) + Number(data.skillBoost || 0);
          this.saveGame();
        } catch (e) {}
      }, this);
    } catch (e) {}
  }

  loadSettings() {
    try {
      const raw = localStorage.getItem("aniclass_battle_settings");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.state.settings.volume = Number(parsed.volume ?? this.state.settings.volume);
      this.state.settings.fps = Number(parsed.fps ?? this.state.settings.fps);
      this.state.settings.particles = Boolean(parsed.particles ?? this.state.settings.particles);
    } catch (e) {
      // ignore
    }
    this.registry.set("battleSettings", { ...this.state.settings });
  }

  applySettings() {
    this.sound.volume = Phaser.Math.Clamp(this.state.settings.volume, 0, 1);
    if (this.game?.loop) this.game.loop.targetFps = this.state.settings.fps === 30 ? 30 : 60;
  }

  async refreshFromBackend() {
    // If forced ban toggle enabled, immediately redirect to banned page
    if (this._forceBan) {
      try { this.events && this.events.emit && this.events.emit('toast', 'Game temporarily disabled'); } catch (e) {}
      try { window.location.href = "/battle/"; } catch (e) {}
      return;
    }

    let data = null;
    try {
      const res = await fetch("/player/data/", { credentials: "same-origin" });
      if (res.ok) data = await res.json();
      else console.warn('[Battle] refreshFromBackend: server returned', res.status);
    } catch (e) {
      console.warn('[Battle] refreshFromBackend: fetch failed, using local fallback', e);
    }

    // If server data unavailable, try localStorage fallback
    if (!data) {
      try {
        const localBoss = localStorage.getItem('aniclass_boss_progress');
        const lastRewards = localStorage.getItem('aniclass_last_rewards');
        data = {};
        if (localBoss != null) data.boss_progress = Number(localBoss);
        if (lastRewards) data.last_rewards = JSON.parse(lastRewards);
      } catch (e) {
        // ignore
      }
    }
    if (!data) return;
    if (data?.is_banned) {
      window.location.href = "/battle/";
      return;
    }

    if (!this.state.lockBossId) {
      this.state.bossId = Number(data?.boss_progress || 0);
    }
    this.state.equipped.damageMult = Number(data?.damage_multiplier || 1.0);
    this.state.equipped.skillMult = Number(data?.skill_multiplier || 1.0);
    if (!this.state.equipped.skinId) this.state.equipped.skinId = data?.active_skin || null;

    const ratingEl = document.getElementById("battle-rating");
    const bossEl = document.getElementById("boss-progress");
    if (ratingEl) ratingEl.textContent = String(data?.battle_rating ?? "—");
    if (bossEl) bossEl.textContent = String(this.state.bossId + 1);

    this.applySkinTint();
    // Boss theme is picked at scene start; do not hot-swap mid battle.
  }

  applySkinTint() {
    if (!this.player) return;
    const id = this.state.equipped.skinId;
    this.player.clearTint();
    if (!id || id === "classic") return;
    if (id === "neo_cyan") this.player.setTint(0x00e5ff);
    else if (id === "pink_void") this.player.setTint(0xff2bd6);
    else if (id === "gold_legend") this.player.setTint(0xffc300);
    else if (id === "shadow_lord") this.player.setTint(0x1f1f2a);
    else if (id === "shinobi_blue") this.player.setTint(0x00e5ff);
  }

  getLevelConfig(bossId) {
    const levels = [
      { map: "map1", mood: 0x08121a, boss: { variant: "knight", model: "knight", tint: null, hpMult: 1.0, dmgMult: 1.0, hpBonus: 0, dmgBonus: 0 } },
      { map: "map2", mood: 0x16081a, boss: { variant: "shadow", model: "knight", tint: 0x1f1f2a, hpMult: 1.08, dmgMult: 1.0, hpBonus: 10, dmgBonus: 1 } },
      { map: "map3", mood: 0x07121b, boss: { variant: "ryu", model: "ryu", tint: null, hpMult: 1.0, dmgMult: 1.10, hpBonus: 0, dmgBonus: 2 } },
      { map: "map1", mood: 0x0d0a16, boss: { variant: "shinobi", model: "ryu", tint: 0x00e5ff, hpMult: 1.04, dmgMult: 1.12, hpBonus: 0, dmgBonus: 2 } },
      { map: "map2", mood: 0x0b1212, boss: { variant: "knight", model: "knight", tint: 0xff2bd6, hpMult: 1.12, dmgMult: 1.02, hpBonus: 18, dmgBonus: 2 } },

      { map: "map3", mood: 0x11120a, boss: { variant: "shadow", model: "knight", tint: 0x0a0a0f, hpMult: 1.16, dmgMult: 1.04, hpBonus: 28, dmgBonus: 2 } },
      { map: "map1", mood: 0x0b0b12, boss: { variant: "ryu", model: "ryu", tint: 0xff2bd6, hpMult: 1.10, dmgMult: 1.14, hpBonus: 18, dmgBonus: 3 } },
      { map: "map2", mood: 0x08131a, boss: { variant: "shinobi", model: "ryu", tint: 0x00e5ff, hpMult: 1.12, dmgMult: 1.16, hpBonus: 22, dmgBonus: 4 } },
      { map: "map3", mood: 0x12070b, boss: { variant: "knight", model: "knight", tint: 0xffc300, hpMult: 1.20, dmgMult: 1.06, hpBonus: 40, dmgBonus: 3 } },
      { map: "map1", mood: 0x06100f, boss: { variant: "shadow", model: "knight", tint: 0x1f1f2a, hpMult: 1.24, dmgMult: 1.08, hpBonus: 55, dmgBonus: 4 } },

      { map: "map2", mood: 0x06101a, boss: { variant: "ryu", model: "ryu", tint: 0x1f1f2a, hpMult: 1.18, dmgMult: 1.20, hpBonus: 44, dmgBonus: 5 } },
      { map: "map3", mood: 0x0d0615, boss: { variant: "shinobi", model: "ryu", tint: 0x00e5ff, hpMult: 1.20, dmgMult: 1.22, hpBonus: 46, dmgBonus: 6 } },
      { map: "map1", mood: 0x0b121a, boss: { variant: "knight", model: "knight", tint: null, hpMult: 1.32, dmgMult: 1.10, hpBonus: 72, dmgBonus: 6 } },
      { map: "map2", mood: 0x14120a, boss: { variant: "shadow", model: "knight", tint: 0x0a0a0f, hpMult: 1.36, dmgMult: 1.12, hpBonus: 90, dmgBonus: 7 } },
      { map: "map3", mood: 0x070a12, boss: { variant: "ryu", model: "ryu", tint: null, hpMult: 1.28, dmgMult: 1.24, hpBonus: 78, dmgBonus: 8 } },

      { map: "map1", mood: 0x0a0c12, boss: { variant: "shinobi", model: "ryu", tint: 0x00e5ff, hpMult: 1.32, dmgMult: 1.26, hpBonus: 84, dmgBonus: 9 } },
      { map: "map2", mood: 0x120812, boss: { variant: "knight", model: "knight", tint: 0xff2bd6, hpMult: 1.46, dmgMult: 1.14, hpBonus: 110, dmgBonus: 9 } },
      { map: "map3", mood: 0x080d12, boss: { variant: "shadow", model: "knight", tint: 0x1f1f2a, hpMult: 1.52, dmgMult: 1.16, hpBonus: 128, dmgBonus: 10 } },
      { map: "map1", mood: 0x101210, boss: { variant: "ryu", model: "ryu", tint: 0xffc300, hpMult: 1.42, dmgMult: 1.30, hpBonus: 116, dmgBonus: 11 } },
      { map: "map2", mood: 0x0b0b12, boss: { variant: "shinobi", model: "ryu", tint: 0x00e5ff, hpMult: 1.46, dmgMult: 1.32, hpBonus: 120, dmgBonus: 12 } },
    ];

    const idx = Math.max(0, Math.trunc(Number(bossId) || 0));
    const cycle = Math.floor(idx / levels.length);
    const levelIdx = idx % levels.length;
    const base = levels[levelIdx];

    const levelNumber = 1 + levelIdx + cycle * levels.length;
    const cycleHpBuff = 1 + cycle * 0.08;
    const cycleDmgBuff = 1 + cycle * 0.06;

    return {
      levelNumber,
      map: base.map,
      mood: base.mood,
      boss: {
        ...base.boss,
        hpMult: base.boss.hpMult * cycleHpBuff,
        dmgMult: base.boss.dmgMult * cycleDmgBuff,
        hpBonus: base.boss.hpBonus + cycle * 18,
        dmgBonus: base.boss.dmgBonus + cycle * 1.5,
      },
    };
  }

  applyBossTheme() {
    const cfg = this.getLevelConfig(this.state.bossId);
    this.state.levelCfg = cfg;
    // Force boss variant to 'knight' so enemy uses the same knight atlas/animations
    this.state.boss.variant = 'knight';

    const level = cfg.levelNumber;
    const baseHp = 120 + level * 13 + cfg.boss.hpBonus;
    const baseLight = 9 + level * 0.75 + cfg.boss.dmgBonus;
    const baseHeavy = 16 + level * 1.1 + cfg.boss.dmgBonus * 1.3;

    this.state.boss.max = Math.round(baseHp * cfg.boss.hpMult);
    this.state.boss.hp = this.state.boss.max;
    this.state.boss.dmgLight = Math.round(baseLight * cfg.boss.dmgMult);
    this.state.boss.dmgHeavy = Math.round(baseHeavy * cfg.boss.dmgMult);
  }

  setupArena() {
    this.applyBossTheme();
    const mapKey = this.state.levelCfg?.map || "map1";

    const bg = this.add.image(0, 0, mapKey).setOrigin(0, 0);
    const scaleX = this.scale.width / bg.width;
    const scaleY = this.scale.height / bg.height;
    bg.setScale(Math.max(scaleX, scaleY));
    bg.setScrollFactor(0);

    const mood = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, this.state.levelCfg?.mood || 0x0a0c12, 0.18);
    mood.setBlendMode(Phaser.BlendModes.SCREEN);

    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.22);
    vignette.fillRect(0, 0, this.scale.width, this.scale.height);
    vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);

    const floorY = Math.floor(this.scale.height * 0.80);
    this.floorY = floorY;

    const floor = this.add.rectangle(this.scale.width / 2, floorY + 42, this.scale.width, 160, 0x0a0c12, 0.42);
    this.physics.add.existing(floor, true);
    this.ground = floor;

    this.particles = this.add.particles(0, 0, "p_blue", {
      lifespan: 420,
      speed: { min: 40, max: 160 },
      quantity: 0,
      scale: { start: 0.6, end: 0 },
      blendMode: "ADD",
      alpha: { start: 0.55, end: 0 },
    });
  }

  spawnActors() {
    this.player = this.physics.add
      .sprite(this.scale.width * 0.28, this.floorY, "player_knight", "idle/frame0000")
      .setOrigin(0.5, 1)
      .setCollideWorldBounds(true);
    try {
      this.player.body.setSize(34, 56, true);
      this.player.body.setOffset(0, 0);
      this.player.body.setBounce(0);
      this.player.body.setAllowGravity(true);
    } catch (e) {}
    this.player.body.setMaxVelocity(320, 900);
    this.player.body.setDragX(1400);
    this.player.play("knight_idle");
    this.applySkinTint();

    const cfg = this.state.levelCfg || this.getLevelConfig(this.state.bossId);
    // Always spawn boss as knight (use boss_knight atlas)
    this.boss = this.physics.add
      .sprite(this.scale.width * 0.72, this.floorY, "boss_knight", "idle/frame0000")
      .setOrigin(0.5, 1)
      .setCollideWorldBounds(true);
    try {
      this.boss.body.setSize(34, 56, true);
      this.boss.body.setOffset(0, 0);
      this.boss.body.setBounce(0);
      this.boss.body.setAllowGravity(true);
    } catch (e) {}
    this.boss.play("knight_idle");
    if (cfg.boss.tint) this.boss.setTint(cfg.boss.tint);

    this.boss.body.setMaxVelocity(260, 900);
    this.boss.body.setDragX(1200);
    this.boss.setFlipX(true);

    this.playerHit = this.add.zone(this.player.x + 62, this.player.y - 54, 74, 64).setOrigin(0.5, 0.5);
    this.physics.add.existing(this.playerHit);
    this.playerHit.body.setAllowGravity(false);
    this.playerHit.body.enable = false;
    this.playerHit.owner = "player";

    // Position boss hitzone relative to its facing so attacks hit in front, not behind
    const initialBossOffset = this.boss.flipX ? -62 : 62;
    this.bossHit = this.add.zone(this.boss.x + initialBossOffset, this.boss.y - 54, 74, 64).setOrigin(0.5, 0.5);
    this.physics.add.existing(this.bossHit);
    this.bossHit.body.setAllowGravity(false);
    this.bossHit.body.enable = false;
    this.bossHit.owner = "boss";

    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.physics.world.on("worldbounds", (body) => {
      const go = body?.gameObject;
      if (go && go.isProjectile) go.destroy();
    });
  }

  setupInputs() {
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      crouch: Phaser.Input.Keyboard.KeyCodes.S,
      jumpSmall: Phaser.Input.Keyboard.KeyCodes.W,
      jumpBig: Phaser.Input.Keyboard.KeyCodes.SPACE,
      roll: Phaser.Input.Keyboard.KeyCodes.CTRL,
      settings: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    this.input.on("pointerdown", (pointer) => {
      if (this.state.paused || this.state.victoryResolved) return;
      if (pointer.rightButtonDown()) this.trySkill();
      else this.tryAttack();
    });
  }

  setupCollisions() {
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.boss, this.ground);
    this.physics.add.collider(this.player, this.boss, () => {}, null, this);

    // Pass the actual zones into the callback so the handler uses the correct hitzone instance
    this.physics.add.overlap(this.playerHit, this.boss, (zone, target) => this.onMeleeHit("boss", zone, target), null, this);
    this.physics.add.overlap(this.bossHit, this.player, (zone, target) => this.onMeleeHit("player", zone, target), null, this);
    this.physics.add.overlap(this.projectiles, this.boss, (proj) => this.onProjectileHit(proj), null, this);
    this.physics.add.collider(this.projectiles, this.ground, (proj) => this.onProjectileGround(proj), null, this);

    // REPLACE THIS: ensure we don't add duplicate registry handlers
    try {
      if (this._registryHandler) this.registry.events.off('changedata', this._registryHandler);
      this._registryHandler = (parent, key, value) => {
        if (key === "battlePaused") this.state.paused = Boolean(value);
        if (key === "battleSettings") {
          this.state.settings = { ...this.state.settings, ...(value || {}) };
          this.applySettings();
        }
      };
      this.registry.events.on('changedata', this._registryHandler);
      // Ensure we remove handlers on shutdown
      if (!this._shutdownHandler) {
        this._shutdownHandler = () => this.onShutdown();
        this.events.on('shutdown', this._shutdownHandler, this);
      }
    } catch (e) {
      // swallow
    }
  }

  tryAttack() {
    const now = this.time.now;
    if (!this.state.player.canAct) return;
    if (now < this.state.player.attackLockUntil) return;
    if (now < this.state.player.rollingUntil) return;
    if (this.state.player.crouching) return;

    this.state.player.attackLockUntil = now + 420;
    this.player.play("knight_attack", true);
    this.playSfx("sfx_sword", 0.42);

    const dmgBase = 16;
    const dmg = Math.round(dmgBase * this.state.equipped.damageMult * 1.05);
    this.playerHit.pendingDamage = dmg;
    this.playerHit.pendingHeavy = false;

    this.time.delayedCall(110, () => this.enableHitbox(this.playerHit, 110), null, this);
    this.time.delayedCall(90, () => this.swordTrail(false), null, this);
    this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.state.victoryResolved && !this.state.player.crouching) this.player.play("knight_idle", true);
    });
  }

  trySkill() {
    const now = this.time.now;
    if (!this.state.player.canAct) return;
    if (now < this.state.player.skillCdUntil) return;
    if (now < this.state.player.rollingUntil) return;
    if (this.state.player.crouching) return;

    this.state.player.skillCdUntil = now + 900;
    this.player.play("knight_skill", true);
    this.playSfx("sfx_sword", 0.55);
    this.cameras.main.shake(90, 0.006);

    this.time.delayedCall(160, () => this.spawnFireball(), null, this);
    this.time.delayedCall(120, () => this.swordTrail(true), null, this);
    this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.state.victoryResolved && !this.state.player.crouching) this.player.play("knight_idle", true);
    });
  }

  swordTrail(heavy) {
    if (!this.state.settings.particles) return;
    if (!this.player?.active) return;
    const dir = this.facing || 1;
    const x = this.player.x + dir * 34;
    const y = this.player.y - 64;
    this.particles.emitParticleAt(x, y, heavy ? 18 : 10);
  }

  spawnFireball() {
    const dir = this.facing || 1;
    const x = this.player.x + dir * 54;
    const y = this.player.y - 56;

    const fb = this.physics.add.image(x, y, "p_blue").setScale(0.55);
    fb.setTint(0xff6a00);
    fb.setBlendMode(Phaser.BlendModes.ADD);
    fb.isProjectile = true;
    fb.body.setCircle(14, 0, 0);
    fb.setCollideWorldBounds(true);
    fb.body.onWorldBounds = true;
    fb.body.setBounce(0.2);

    const speed = 480;
    fb.setVelocity(speed * dir, -60);
    this.projectiles.add(fb);

    const dmgBase = 34;
    fb.damage = Math.round(dmgBase * this.state.equipped.skillMult * 1.05);

    // Trail particles
    if (this.state.settings.particles) {
      this.particles.emitParticleAt(fb.x, fb.y, 10);
      this.time.addEvent({
        delay: 36,
        repeat: 12,
        callback: () => {
          if (!fb.active) return;
          this.particles.emitParticleAt(fb.x, fb.y, 5);
        },
      });
    }

    // Auto-destroy
    this.time.delayedCall(1500, () => fb.destroy(), null, this);
  }

  onProjectileGround(projectile) {
    const fb = projectile;
    if (!fb?.active) return;
    this.explodeAt(fb.x, fb.y);
    fb.destroy();
  }

  explodeAt(x, y) {
    if (this.state.settings.particles) this.particles.emitParticleAt(x, y, 18);
    this.cameras.main.shake(90, 0.007);
    this.playSfx("sfx_hit", 0.42);
  }

  enableHitbox(zone, ms) {
    zone.body.enable = true;
    this.time.delayedCall(ms, () => (zone.body.enable = false), null, this);
  }

  // zoneArg is the overlap zone passed from the physics overlap callback
  onMeleeHit(target, zoneArg) {
    const now = this.time.now;
    const zone = zoneArg || (target === "boss" ? this.playerHit : this.bossHit);
    if (!zone || !zone.body || !zone.body.enable) return;

    if (target === "boss") {
      if (now < this.state.boss.invulnUntil) return;
      this.state.boss.invulnUntil = now + 160;
      const dmg = Number(zone.pendingDamage != null ? zone.pendingDamage : 10);
      this.damageBoss(dmg, zone.pendingHeavy);
      zone.body.enable = false;
    } else {
      if (now < this.state.player.invulnUntil) return;
      if (now < this.state.player.rollingUntil) return; // roll i-frames
      this.state.player.invulnUntil = now + 160;
      // If boss zone didn't set pendingDamage, default to boss light damage
      const dmg = Number(zone.pendingDamage != null ? zone.pendingDamage : (this.state.boss?.dmgLight || 10));
      this.damagePlayer(dmg, zone.pendingHeavy);
      zone.body.enable = false;
    }
  }

  onProjectileHit(projectile) {
    const fb = projectile;
    if (!fb?.active) return;
    const now = this.time.now;
    if (now < this.state.boss.invulnUntil) return;
    this.state.boss.invulnUntil = now + 120;
    this.damageBoss(Number(fb.damage || 18), true);
    fb.destroy();
  }

  damageBoss(amount, heavy) {
    this.state.boss.hp = Math.max(0, this.state.boss.hp - amount);
    this.emitHp();
    this.flash(this.boss);
    this.playHitAnim(this.boss);
    this.playSfx("sfx_hit", heavy ? 0.5 : 0.35);
    if (heavy) this.cameras.main.shake(120, 0.008);
    if (this.state.boss.hp <= 0) this.resolve(true);
  }

  damagePlayer(amount, heavy) {
    this.state.player.hp = Math.max(0, this.state.player.hp - amount);
    this.emitHp();
    this.flash(this.player);
    if (!this.state.player.crouching && this.player?.active) this.player.play("knight_hit", true);
    this.playSfx("sfx_hit", heavy ? 0.45 : 0.3);
    if (heavy) this.cameras.main.shake(120, 0.008);

    if (this.state.player.hp <= 0) this.resolve(false);
  }
  playHitAnim(sprite) {
    const v = this.state?.boss?.variant;
    if (!sprite?.active) return;
    if (sprite === this.boss && (v === "ryu" || v === "shinobi")) sprite.play("ryu_hit", true);
    else sprite.play("knight_hit", true);
  }

  flash(sprite) {
    if (!sprite) return;
    sprite.setTintFill(0xffffff);
    this.time.delayedCall(80, () => sprite.clearTint(), null, this);
  }

  resolve(victory) {
    if (this.state.victoryResolved) return;
    this.state.victoryResolved = true;
    this.state.paused = true;
    this.registry.set("battlePaused", true);

    console.log('[Battle] resolve called', { victory, bossId: this.state.bossId });
    this.events.emit("toast", victory ? "VICTORY!" : "DEFEAT!");
    this.playSfx("sfx_death", victory ? 0.45 : 0.55);

    if (victory) this.playDeathAnim(this.boss);
    else this.player.play("knight_die", true);

    this.time.delayedCall(900, () => this.sendResult(victory), null, this);
  }

  playDeathAnim(sprite) {
    const v = this.state?.boss?.variant;
    if (!sprite?.active) return;
    if (sprite === this.boss && (v === "ryu" || v === "shinobi")) sprite.play("ryu_die", true);
    else sprite.play("knight_die", true);
  }

  async sendResult(victory) {
    let endPayload = {
      victory,
      bossId: this.state.bossId,
      nextBossId: this.state.bossId,
      rewards: null,
    };
    try {
      const payload = {
        bossId: this.state.bossId,
        victory,
        device: "pc",
        durationMs: Date.now() - this.state.startAt,
      };
      const res = await fetch("/battle/result/", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": this.getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        this.events.emit("toast", `+${data.hp_reward} HP - +${data.rating_change} rating`);
        const ratingEl = document.getElementById("battle-rating");
        const bossEl = document.getElementById("boss-progress");
        if (ratingEl) ratingEl.textContent = String(data.new_battle_rating ?? "—");
        if (bossEl) bossEl.textContent = String(Number(data.boss_progress ?? this.state.bossId) + 1);

        endPayload = {
          ...endPayload,
          nextBossId: Number.isFinite(Number(data.boss_progress)) ? Number(data.boss_progress) : endPayload.nextBossId,
          rewards: {
            hpReward: data.hp_reward,
            ratingChange: data.rating_change,
            newHp: data.new_hp,
            newRating: data.new_battle_rating,
            bossProgress: data.boss_progress,
          },
        };

        // Persist server-provided boss progress and rewards locally for offline fallback
        try {
          if (Number.isFinite(Number(data.boss_progress))) {
            localStorage.setItem('aniclass_boss_progress', String(Number(data.boss_progress)));
          }
          localStorage.setItem('aniclass_last_rewards', JSON.stringify(endPayload.rewards));
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }

    // If server didn't return rewards, compute a reasonable client-side fallback.
    if (!endPayload.rewards) {
      const cfg = this.state.levelCfg || this.getLevelConfig(this.state.bossId);
      const baseHpReward = Math.max(8, Math.round((cfg?.boss?.hpBonus || 10) * 0.5));
      const scaled = Math.round(Math.max(baseHpReward, (this.state.boss?.max || 100) * 0.10));
      endPayload.rewards = { hpReward: scaled, ratingChange: 0, newHp: Math.min(this.state.player.max, this.state.player.hp + scaled), bossProgress: this.state.bossId };
      endPayload.nextBossId = victory ? this.state.bossId + 1 : this.state.bossId;

      // Persist fallback progress locally
      try {
        if (victory) localStorage.setItem('aniclass_boss_progress', String(endPayload.nextBossId));
        localStorage.setItem('aniclass_last_rewards', JSON.stringify(endPayload.rewards));
      } catch (e) {}
    }

    // ADD THIS: scale rewards by level, set localized messages, and persist save
    try {
      const lvl = this.state.levelCfg?.levelNumber || 1;
      const bossName = this.state.levelCfg?.boss?.variant || 'boss';
      // Ensure numeric hpReward exists
      endPayload.rewards.hpReward = Number(endPayload.rewards?.hpReward || 0);

      if (victory) {
        const extra = Math.round(Math.max(12, (this.state.boss?.max || 100) * (0.10 + lvl * 0.002)));
        endPayload.rewards.hpReward = Math.max(endPayload.rewards.hpReward, extra);
        endPayload.nextBossId = Number.isFinite(Number(endPayload.nextBossId)) ? Number(endPayload.nextBossId) : this.state.bossId;
        endPayload.nextBossId = victory ? Math.min(99, endPayload.nextBossId + 1) : endPayload.nextBossId;
        if (this.state.bossId >= 99 || endPayload.nextBossId > 99) {
          endPayload.final = true;
          endPayload.message = "SEN ENG ZO‘RISAN! O‘YINNI TUGATDING!";
        } else {
          endPayload.message = `Sen zo‘rsan! Sen ${bossName} bossni mag‘lub qilding!`;
        }
        // apply reward
        if (endPayload.rewards.hpReward) {
          this.state.player.hp = Math.min(this.state.player.max, Number(this.state.player.hp || 0) + Number(endPayload.rewards.hpReward));
          this.emitHp();
          try { this.events.emit("toast", `+${endPayload.rewards.hpReward} HP`); } catch (e) {}
        }
      } else {
        const small = Math.max(4, Math.round(6 + lvl * 0.1));
        endPayload.rewards.hpReward = Math.max(1, Math.min(endPayload.rewards.hpReward || 0, small));
        endPayload.message = "Mag‘lub bo‘lding!";
        if (endPayload.rewards.hpReward) {
          this.state.player.hp = Math.min(this.state.player.max, Number(this.state.player.hp || 0) + Number(endPayload.rewards.hpReward));
          this.emitHp();
          try { this.events.emit("toast", `+${endPayload.rewards.hpReward} HP`); } catch (e) {}
        }
      }

      // Persist progress (level, hp, upgrades)
      try { this.saveGame(); } catch (e) {}
    } catch (e) {
      // swallow
    }

    console.log('[Battle] endPayload', endPayload);

    this.state.lastEnd = endPayload;
    this.events.emit("end", endPayload);
  }

  getCsrfToken() {
    const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }

  playSfx(key, volume = 0.4) {
    try {
      if (this.sound.locked) return;
      this.sound.play(key, { volume });
    } catch (e) {
      // ignore
    }
  }

  emitHp() {
    this.events.emit("hp", {
      playerHp: this.state.player.hp,
      playerMax: this.state.player.max,
      bossHp: this.state.boss.hp,
      bossMax: this.state.boss.max,
    });
  }

  update() {
    if (!this.ready) return;
    if (!this.player || !this.boss) return;
    if (!this.keys) return;

    const now = this.time.now;
    if (this.state.paused) {
      this.player.body.setVelocityX(0);
      this.boss.body.setVelocityX(0);
      return;
    }

    // Hitboxes follow (boss hitbox follows boss facing so attacks land in front)
    this.playerHit.setPosition(this.player.x + this.facing * 62, this.player.y - 54);
    const bossOffset = this.boss.flipX ? -62 : 62;
    this.bossHit.setPosition(this.boss.x + bossOffset, this.boss.y - 54);

    // Crouch
    const onGround = this.player.body.blocked.down;
    const crouchDown = this.keys.crouch.isDown && onGround && now >= this.state.player.rollingUntil;
    this.state.player.crouching = crouchDown;
    if (this.state.player.crouching) {
      this.player.body.setVelocityX(0);
      if (this.player.anims.currentAnim?.key !== "knight_block") this.player.play("knight_block", true);
      // smaller hitbox
      this.player.body.setSize(34, 46, true);
    } else {
      this.player.body.setSize(34, 56, true);
    }

    // Roll (Ctrl)
    if (Phaser.Input.Keyboard.JustDown(this.keys.roll) && onGround && now >= this.state.player.rollCdUntil && !this.state.player.crouching) {
      this.state.player.rollCdUntil = now + 900;
      this.state.player.rollingUntil = now + 260;
      const dir = this.facing || 1;
      this.player.body.setVelocityX(460 * dir);
      this.player.play("knight_run", true);
      this.cameras.main.shake(60, 0.004);
    }

    const rolling = now < this.state.player.rollingUntil;

    // Move left/right (A/D)
    if (!this.state.victoryResolved && !this.state.player.crouching && !rolling) {
      const left = this.keys.left.isDown;
      const right = this.keys.right.isDown;
      const speed = 240;
      if (left && !right) {
        this.facing = -1;
        this.player.setFlipX(true);
        this.player.body.setVelocityX(-speed);
        if (onGround && this.player.anims.currentAnim?.key !== "knight_run") this.player.play("knight_run", true);
      } else if (right && !left) {
        this.facing = 1;
        this.player.setFlipX(false);
        this.player.body.setVelocityX(speed);
        if (onGround && this.player.anims.currentAnim?.key !== "knight_run") this.player.play("knight_run", true);
      } else {
        if (onGround && !this.isInActionAnim(this.player)) this.player.play("knight_idle", true);
      }
    }

    // Jump W (small) / Space (big)
    if (!this.state.victoryResolved && onGround && !this.state.player.crouching && !rolling) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.jumpSmall)) {
        this.player.body.setVelocityY(-520);
        this.player.play("knight_jump", true);
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.jumpBig)) {
        this.player.body.setVelocityY(-780);
        this.player.play("knight_jump", true);
      }
    }

    // Boss AI (simple)
    if (!this.state.victoryResolved) {
      this.runBossAI(now);
    }
  }

  isInActionAnim(sprite) {
    const v = this.state?.boss?.variant;
    const k = sprite?.anims?.currentAnim?.key || "";
    if (sprite === this.boss && (v === "ryu" || v === "shinobi")) {
      return k === "ryu_attack" || k === "ryu_hit" || k === "ryu_die";
    }
    return k === "knight_attack" || k === "knight_skill" || k === "knight_hit" || k === "knight_die" || k === "knight_jump";
  }

  runBossAI(now) {
    const dist = this.boss.x - this.player.x;
    const abs = Math.abs(dist);
    const dir = dist > 0 ? -1 : 1;

    const v = this.state.boss.variant;

    // Approach
    if (abs > 140) {
      this.boss.body.setVelocityX(160 * dir);
      this.boss.setFlipX(dir < 0);
      if (!this.isInActionAnim(this.boss)) {
        if (v === "ryu" || v === "shinobi") this.boss.play("ryu_idle", true);
        else this.boss.play("knight_run", true);
      }
    } else {
      this.boss.body.setVelocityX(0);
      if (!this.isInActionAnim(this.boss)) {
        if (v === "ryu" || v === "shinobi") this.boss.play("ryu_idle", true);
        else this.boss.play("knight_idle", true);
      }
    }

    // Attack in range
    if (abs < 160 && now >= this.bossNextActionAt && now >= this.state.boss.attackLockUntil) {
      const doSkill = Phaser.Math.Between(0, 100) < 22;
      this.state.boss.attackLockUntil = now + (doSkill ? 720 : 520);
      this.bossNextActionAt = now + Phaser.Math.Between(700, 1200);

      if (v === "ryu" || v === "shinobi") this.boss.play("ryu_attack", true);
      else this.boss.play(doSkill ? "knight_skill" : "knight_attack", true);

      this.bossHit.pendingDamage = doSkill ? this.state.boss.dmgHeavy : this.state.boss.dmgLight;
      this.bossHit.pendingHeavy = doSkill;
      this.time.delayedCall(120, () => this.enableHitbox(this.bossHit, 120), null, this);
    }
  }

  // ADD THIS: Save/load / transition / shutdown helpers
  saveGame() {
    try {
      const payload = {
        level: Number(this.state.bossId || 0),
        hp: Number(this.state.player?.hp ?? this.state.player?.max ?? 120),
        upgrades: {
          damageMult: Number(this.state.equipped?.damageMult ?? 1),
          skillMult: Number(this.state.equipped?.skillMult ?? 1),
          skinId: this.state.equipped?.skinId || null,
        },
      };
      localStorage.setItem('aniclass_save', JSON.stringify(payload));
    } catch (e) {
      // swallow
    }
  }

  loadGame() {
    try {
      const raw = localStorage.getItem('aniclass_save');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Number.isFinite(Number(parsed.level))) this.state.bossId = Math.max(0, Math.min(99, Number(parsed.level)));
      if (parsed.hp != null) this.state.player.hp = Math.min(this.state.player?.max ?? 120, Number(parsed.hp));
      if (parsed.upgrades) {
        this.state.equipped.damageMult = Number(parsed.upgrades.damageMult ?? this.state.equipped.damageMult);
        this.state.equipped.skillMult = Number(parsed.upgrades.skillMult ?? this.state.equipped.skillMult);
        if (!this.state.equipped.skinId) this.state.equipped.skinId = parsed.upgrades.skinId ?? this.state.equipped.skinId;
      }
    } catch (e) {
      // ignore
    }
  }

  nextLevelTransition(newBossId) {
    try {
      if (!Number.isFinite(Number(newBossId))) return;
      const next = Math.max(0, Math.min(99, Number(newBossId)));
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        try { this.saveGame(); } catch (e) {}
        this.scene.restart({ bossId: next, lockBossId: false, skinId: this.state.equipped.skinId, damageMult: this.state.equipped.damageMult, skillMult: this.state.equipped.skillMult });
      }, this);
    } catch (e) {
      // swallow
    }
  }

  onShutdown() {
    try {
      if (this._registryHandler) this.registry.events.off('changedata', this._registryHandler);
      if (this._shutdownHandler) this.events.off('shutdown', this._shutdownHandler);
    } catch (e) {}
  }
}

window.BattleScene = BattleScene;
