/* global Phaser */

class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene" });
    this.ui = null;
    this.volDragging = false;
    this.boundBattle = null;
    this.boundHandlers = null;
    this.isMobile = false;
  }

  create() {
    this.isMobile = Boolean(window.__BATTLE_ENV && window.__BATTLE_ENV.isMobile);
    this.ui = {
      playerMax: 100,
      bossMax: 100,
      playerShown: 100,
      bossShown: 100,
    };

    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);

    const w = this.scale.width;
    const pad = 14;

    this.playerBg = this.add.rectangle(pad, pad, 260, 16, 0x0a0c12, 0.55).setOrigin(0, 0);
    this.playerFg = this.add.rectangle(pad, pad, 260, 16, 0x00e5ff, 0.85).setOrigin(0, 0);
    this.playerChip = this.add.text(pad, pad + 22, "PLAYER", {
      fontFamily: "system-ui",
      fontSize: "12px",
      fontStyle: "700",
      color: "#cfefff",
    });

    this.bossBg = this.add.rectangle(w - pad, pad, 260, 16, 0x0a0c12, 0.55).setOrigin(1, 0);
    this.bossFg = this.add.rectangle(w - pad, pad, 260, 16, 0xff2bd6, 0.85).setOrigin(1, 0);
    this.bossChip = this.add.text(w - pad, pad + 22, "BOSS", {
      fontFamily: "system-ui",
      fontSize: "12px",
      fontStyle: "700",
      color: "#ffd5f3",
    }).setOrigin(1, 0);

    this.toast = this.add.text(w / 2, 16, "", {
      fontFamily: "system-ui",
      fontSize: "14px",
      fontStyle: "800",
      color: "#ffffff",
      backgroundColor: "rgba(10,12,18,0.55)",
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5, 0).setVisible(false);

    this.settingsKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.settingsBtn = this.add.text(w - 14, 58, "SETTINGS", {
      fontFamily: "system-ui",
      fontSize: "12px",
      fontStyle: "900",
      color: "rgba(255,255,255,0.85)",
      backgroundColor: "rgba(10,12,18,0.35)",
      padding: { x: 10, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.settingsBtn.on("pointerdown", () => this.toggleSettings());

    this.hud.add([this.playerBg, this.playerFg, this.playerChip, this.bossBg, this.bossFg, this.bossChip, this.toast, this.settingsBtn]);

    this.settingsPanel = this.add.container(w / 2, this.scale.height / 2).setDepth(2000).setVisible(false);
    this.buildSettingsPanel();

    this.endPanel = this.add.container(w / 2, this.scale.height / 2).setDepth(2500).setVisible(false);
    this.buildEndPanel();

    this.touchControls = this.add.container(0, 0).setDepth(1800).setVisible(this.isMobile);
    if (this.isMobile) this.buildTouchControls();

    this.bindBattleEvents();
    this.scale.on("resize", () => this.layout());
    this.layout();
  }

  bindBattleEvents() {
    const battle = this.scene.get("BattleScene");
    if (!battle || !battle.events) return;
    if (this.boundBattle === battle) return;

    if (this.boundBattle && this.boundHandlers) {
      const { onHp, onToast, onEnd } = this.boundHandlers;
      this.boundBattle.events.off("hp", onHp);
      this.boundBattle.events.off("toast", onToast);
      this.boundBattle.events.off("end", onEnd);
    }

    const onHp = (data) => this.onHp(data);
    const onToast = (text) => this.showToast(text);
    const onEnd = (payload) => this.showEnd(payload);

    battle.events.on("hp", onHp);
    battle.events.on("toast", onToast);
    battle.events.on("end", onEnd);

    this.boundBattle = battle;
    this.boundHandlers = { onHp, onToast, onEnd };
  }

  buildSettingsPanel() {
    const panelW = Math.min(520, this.scale.width - 40);
    const panelH = 260;
    const settings = this.getSettings();

    const bg = this.add.rectangle(0, 0, panelW, panelH, 0x0a0c12, 0.8).setStrokeStyle(1, 0xffffff, 0.14);
    const title = this.add.text(0, -panelH / 2 + 14, "Settings", {
      fontFamily: "system-ui",
      fontSize: "18px",
      fontStyle: "900",
      color: "#ffffff",
    }).setOrigin(0.5, 0);

    const close = this.add.text(panelW / 2 - 14, -panelH / 2 + 14, "X", {
      fontFamily: "system-ui",
      fontSize: "16px",
      fontStyle: "900",
      color: "rgba(255,255,255,0.9)",
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    close.on("pointerdown", () => this.toggleSettings(false));

    const volLabel = this.add.text(-panelW / 2 + 18, -42, `Volume: ${Math.round(settings.volume * 100)}%`, {
      fontFamily: "system-ui",
      fontSize: "13px",
      fontStyle: "800",
      color: "rgba(255,255,255,0.85)",
    });
    const volBar = this.add.rectangle(0, -18, panelW - 36, 10, 0xffffff, 0.12).setInteractive({ useHandCursor: true });
    const volFill = this.add.rectangle(-((panelW - 36) / 2), -18, (panelW - 36) * settings.volume, 10, 0x00e5ff, 0.85).setOrigin(0, 0.5);

    const setVolFromX = (px) => {
      const left = -((panelW - 36) / 2);
      const value = Phaser.Math.Clamp((px - left) / (panelW - 36), 0, 1);
      volFill.width = (panelW - 36) * value;
      volLabel.setText(`Volume: ${Math.round(value * 100)}%`);
      this.saveSettings({ volume: value });
    };

    volBar.on("pointerdown", (pointer) => {
      this.volDragging = true;
      setVolFromX(pointer.x);
    });
    this.input.on("pointerup", () => {
      this.volDragging = false;
    });
    this.input.on("pointermove", (pointer) => {
      if (!this.settingsPanel.visible || !this.volDragging) return;
      setVolFromX(pointer.x);
    });

    const fpsLabel = this.add.text(-panelW / 2 + 18, 26, "FPS:", {
      fontFamily: "system-ui",
      fontSize: "13px",
      fontStyle: "800",
      color: "rgba(255,255,255,0.85)",
    });
    const fps30 = this.makeChip(-40, 54, "30", settings.fps === 30, () => this.saveSettings({ fps: 30 }));
    const fps60 = this.makeChip(40, 54, "60", settings.fps !== 30, () => this.saveSettings({ fps: 60 }));

    const partLabel = this.add.text(-panelW / 2 + 18, 110, "Particles:", {
      fontFamily: "system-ui",
      fontSize: "13px",
      fontStyle: "800",
      color: "rgba(255,255,255,0.85)",
    });
    const partOn = this.makeChip(-40, 138, "ON", settings.particles, () => this.saveSettings({ particles: true }));
    const partOff = this.makeChip(44, 138, "OFF", !settings.particles, () => this.saveSettings({ particles: false }));

    const hintText = this.isMobile ? "Mobil: tugmalar bilan boshqariladi" : "ESC yopadi | Sichqoncha bilan attack va skill";
    const hint = this.add.text(0, panelH / 2 - 30, hintText, {
      fontFamily: "system-ui",
      fontSize: "12px",
      fontStyle: "700",
      color: "rgba(255,255,255,0.65)",
    }).setOrigin(0.5, 0.5);

    this.settingsPanel.removeAll(true);
    this.settingsPanel.add([bg, title, close, volLabel, volBar, volFill, fpsLabel, fps30, fps60, partLabel, partOn, partOff, hint]);
  }

  buildEndPanel() {
    const panelW = Math.min(560, this.scale.width - 40);
    const panelH = 250;

    const bg = this.add.rectangle(0, 0, panelW, panelH, 0x0a0c12, 0.86).setStrokeStyle(1, 0xffffff, 0.14);
    const title = this.add.text(0, -panelH / 2 + 16, "Battle end", {
      fontFamily: "system-ui",
      fontSize: "22px",
      fontStyle: "900",
      color: "#ffffff",
    }).setOrigin(0.5, 0);

    this.endResult = this.add.text(0, -48, "", {
      fontFamily: "system-ui",
      fontSize: "18px",
      fontStyle: "900",
      color: "#ffffff",
    }).setOrigin(0.5, 0.5);

    this.endSummary = this.add.text(0, -10, "", {
      fontFamily: "system-ui",
      fontSize: "13px",
      fontStyle: "800",
      color: "rgba(255,255,255,0.80)",
      align: "center",
      wordWrap: { width: panelW - 40 },
    }).setOrigin(0.5, 0.5);

    this.btnRetry = this.makeEndBtn(-120, 74, "RETRY", () => this.onRetry());
    this.btnNext = this.makeEndBtn(0, 74, "NEXT", () => this.onNext());
    this.btnMenu = this.makeEndBtn(120, 74, "MENU", () => this.onMenu());

    const hint = this.add.text(0, panelH / 2 - 28, "ESC: Settings", {
      fontFamily: "system-ui",
      fontSize: "12px",
      fontStyle: "700",
      color: "rgba(255,255,255,0.60)",
    }).setOrigin(0.5, 0.5);

    this.endPanel.removeAll(true);
    this.endPanel.add([bg, title, this.endResult, this.endSummary, this.btnRetry, this.btnNext, this.btnMenu, hint]);
  }

  buildTouchControls() {
    this.touchControls.removeAll(true);
    const w = this.scale.width;
    const h = this.scale.height;

    const moveLeft = this.makeHoldButton(90, h - 88, "LEFT", "left");
    const moveRight = this.makeHoldButton(190, h - 88, "RIGHT", "right");
    const block = this.makeHoldButton(140, h - 34, "BLOCK", "crouch");

    const jump = this.makeTapButton(w - 214, h - 88, "JUMP", () => this.triggerBattleAction("jump"));
    const roll = this.makeTapButton(w - 108, h - 88, "ROLL", () => this.triggerBattleAction("roll"));
    const attack = this.makeTapButton(w - 214, h - 34, "ATTACK", () => this.triggerBattleAction("attack"));
    const skill = this.makeTapButton(w - 108, h - 34, "SKILL", () => this.triggerBattleAction("skill"));

    this.touchControls.add([moveLeft, moveRight, block, jump, roll, attack, skill]);
  }

  makeHoldButton(x, y, label, inputKey) {
    const text = this.add.text(x, y, label, {
      fontFamily: "system-ui",
      fontSize: "12px",
      fontStyle: "900",
      color: "#ffffff",
      backgroundColor: "rgba(10,12,18,0.48)",
      padding: { x: 12, y: 10 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    const setPressed = (pressed) => {
      this.forwardTouchState(inputKey, pressed);
      text.setStyle({ backgroundColor: pressed ? "rgba(0,229,255,0.50)" : "rgba(10,12,18,0.48)" });
    };

    text.on("pointerdown", () => setPressed(true));
    text.on("pointerup", () => setPressed(false));
    text.on("pointerout", () => setPressed(false));
    text.on("pointerupoutside", () => setPressed(false));
    return text;
  }

  makeTapButton(x, y, label, onClick) {
    const text = this.add.text(x, y, label, {
      fontFamily: "system-ui",
      fontSize: "12px",
      fontStyle: "900",
      color: "#ffffff",
      backgroundColor: "rgba(255,43,214,0.34)",
      padding: { x: 12, y: 10 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    text.on("pointerdown", () => {
      text.setStyle({ backgroundColor: "rgba(255,43,214,0.58)" });
      onClick();
    });
    text.on("pointerup", () => text.setStyle({ backgroundColor: "rgba(255,43,214,0.34)" }));
    text.on("pointerout", () => text.setStyle({ backgroundColor: "rgba(255,43,214,0.34)" }));
    text.on("pointerupoutside", () => text.setStyle({ backgroundColor: "rgba(255,43,214,0.34)" }));
    return text;
  }

  forwardTouchState(key, pressed) {
    const battle = this.scene.get("BattleScene");
    if (!battle || typeof battle.setTouchState !== "function") return;
    battle.setTouchState(key, pressed);
  }

  triggerBattleAction(action) {
    const battle = this.scene.get("BattleScene");
    if (!battle) return;

    if (action === "jump" && typeof battle.queueJump === "function") battle.queueJump();
    if (action === "roll" && typeof battle.queueRoll === "function") battle.queueRoll();
    if (action === "attack" && typeof battle.tryAttack === "function") battle.tryAttack();
    if (action === "skill" && typeof battle.trySkill === "function") battle.trySkill();
  }

  makeEndBtn(x, y, label, onClick) {
    const button = this.add.text(x, y, label, {
      fontFamily: "system-ui",
      fontSize: "13px",
      fontStyle: "900",
      color: "rgba(255,255,255,0.92)",
      backgroundColor: "rgba(255,255,255,0.08)",
      padding: { x: 14, y: 10 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    button.on("pointerover", () => button.setStyle({ backgroundColor: "rgba(255,255,255,0.14)" }));
    button.on("pointerout", () => button.setStyle({ backgroundColor: "rgba(255,255,255,0.08)" }));
    button.on("pointerdown", () => onClick());
    return button;
  }

  showEnd(payload) {
    this.lastEnd = payload || null;
    const victory = Boolean(payload?.victory);
    const rewards = payload?.rewards;
    const parts = [];
    // Use payload.message if provided (localized by BattleScene), otherwise fallback
    const bossName = payload?.bossName || (payload?.bossId != null ? `Boss ${Number(payload.bossId) + 1}` : "");
    const message = payload?.message || (victory ? `Sen zo‘rsan! Sen ${bossName} bossni mag‘lub qilding!` : "Mag‘lub bo‘lding!");

    // Final level handling
    const isFinal = Boolean(payload?.final);

    this.endResult.setText(isFinal ? (payload?.message || "SEN ENG ZO‘RISAN! O‘YINNI TUGATDING!") : (victory ? "VICTORY" : "DEFEAT"));
    this.endResult.setColor(isFinal ? "#ffc300" : (victory ? "#00e5ff" : "#ff2bd6"));

    if (rewards?.hpReward != null) parts.push(`+${rewards.hpReward} HP`);
    if (rewards?.ratingChange != null) parts.push(`+${rewards.ratingChange} rating`);

    const summaryParts = [message].concat(parts.length ? [parts.join(" | ")] : []);
    this.endSummary.setText(summaryParts.filter(Boolean).join("\n") || "Natija saqlandi.");

    // Next only for non-final victory
    this.btnNext.setVisible(victory && !isFinal);
    this.endPanel.setVisible(true);
    this.tweens.killTweensOf(this.endPanel);
    this.endPanel.setScale(0.96);
    this.tweens.add({ targets: this.endPanel, scale: 1.0, duration: 180, ease: "Sine.easeOut" });
  }

  hideEnd() {
    if (this.endPanel) this.endPanel.setVisible(false);
  }

  onRetry() {
    const bossId = Number.isFinite(Number(this.lastEnd?.bossId)) ? Number(this.lastEnd.bossId) : 0;
    this.hideEnd();
    this.restartBattle(bossId);
  }

  onNext() {
    const current = Number.isFinite(Number(this.lastEnd?.bossId)) ? Number(this.lastEnd?.bossId) : 0;
    const nextFromServer = Number.isFinite(Number(this.lastEnd?.nextBossId)) ? Number(this.lastEnd?.nextBossId) : current + 1;
    const bossId = Math.max(current + 1, nextFromServer);
    this.hideEnd();
    // Emit nextLevel on the BattleScene so BattleScene handles smooth transition
    const battle = this.scene.get("BattleScene");
    try {
      if (battle && battle.events && typeof battle.events.emit === 'function') {
        battle.events.emit('nextLevel', bossId);
        return;
      }
    } catch (e) {}
    // Fallback: restart directly
    this.restartBattle(bossId);
  }

  onMenu() {
    this.hideEnd();
    this.scene.stop("BattleScene");
    this.scene.start("MenuScene");
    this.scene.stop();
  }

  restartBattle(bossId) {
    const battle = this.scene.get("BattleScene");
    const menu = this.scene.get("MenuScene");

    const skinId = battle?.state?.equipped?.skinId ?? menu?.state?.selectedSkin ?? null;
    const damageMult = Number(battle?.state?.equipped?.damageMult ?? menu?.state?.player?.damage_multiplier ?? 1.0);
    const skillMult = Number(battle?.state?.equipped?.skillMult ?? menu?.state?.player?.skill_multiplier ?? 1.0);

    // If battle is disabled via global flag, show a short toast and do not restart
    const battleDisabled = Boolean(window.__BATTLE_ENV?.battleDisabled ?? false);
    if (battleDisabled) {
      this.showToast("Battle bo'limi hozircha ishlanmoqda");
      return;
    }

    this.scene.stop("BattleScene");
    this.scene.start("BattleScene", {
      bossId,
      lockBossId: true,
      skinId,
      damageMult,
      skillMult,
      device: this.isMobile ? "mobile" : "pc",
    });
    this.time.delayedCall(0, () => this.bindBattleEvents());
  }

  makeChip(x, y, label, active, onClick) {
    const chip = this.add.text(x, y, label, {
      fontFamily: "system-ui",
      fontSize: "13px",
      fontStyle: "900",
      color: active ? "#10121a" : "rgba(255,255,255,0.9)",
      backgroundColor: active ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.08)",
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    chip.on("pointerdown", () => {
      onClick();
      this.buildSettingsPanel();
    });
    return chip;
  }

  getSettings() {
    const settings = this.registry.get("battleSettings");
    return {
      volume: typeof settings?.volume === "number" ? settings.volume : 0.6,
      fps: settings?.fps === 30 ? 30 : 60,
      particles: typeof settings?.particles === "boolean" ? settings.particles : true,
    };
  }

  saveSettings(patch) {
    const next = { ...this.getSettings(), ...patch };
    const volume = Phaser.Math.Clamp(Number(next.volume || 0), 0, 1);

    next.volume = volume;
    this.registry.set("battleSettings", next);
    if (this.sound) this.sound.volume = volume;
    if (this.game?.loop) this.game.loop.targetFps = next.fps === 30 ? 30 : 60;

    try {
      localStorage.setItem("aniclass_battle_settings", JSON.stringify(next));
    } catch (e) {
      // ignore localStorage write errors
    }
  }

  toggleSettings(force) {
    const next = typeof force === "boolean" ? force : !this.settingsPanel.visible;
    this.settingsPanel.setVisible(next);
    this.registry.set("battlePaused", next);
    if (next) this.buildSettingsPanel();
  }

  layout() {
    const w = this.scale.width;
    const pad = 14;

    this.bossBg.setPosition(w - pad, pad);
    this.bossFg.setPosition(w - pad, pad);
    this.bossChip.setPosition(w - pad, pad + 22);
    this.toast.setPosition(w / 2, 16);
    this.settingsBtn.setPosition(w - 14, 58);
    this.settingsPanel.setPosition(w / 2, this.scale.height / 2);
    this.endPanel.setPosition(w / 2, this.scale.height / 2);

    if (this.isMobile) this.buildTouchControls();
  }

  onHp({ playerHp, playerMax, bossHp, bossMax }) {
    this.ui.playerMax = playerMax;
    this.ui.bossMax = bossMax;

    this.tweens.add({
      targets: this.ui,
      playerShown: playerHp,
      bossShown: bossHp,
      duration: 240,
      ease: "Sine.easeOut",
      onUpdate: () => {
        const playerRatio = Phaser.Math.Clamp(this.ui.playerShown / this.ui.playerMax, 0, 1);
        const bossRatio = Phaser.Math.Clamp(this.ui.bossShown / this.ui.bossMax, 0, 1);
        this.playerFg.width = 260 * playerRatio;
        this.bossFg.width = 260 * bossRatio;
      },
    });
  }

  showToast(text) {
    if (!text || !this.toast) return;
    this.toast.setText(text).setVisible(true).setAlpha(0);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({
      targets: this.toast,
      alpha: 1,
      duration: 160,
      ease: "Sine.easeOut",
      yoyo: true,
      hold: 1100,
    });
  }

  update() {
    if (this.settingsKey && Phaser.Input.Keyboard.JustDown(this.settingsKey)) {
      this.toggleSettings();
    }

    if (!this.boundBattle && this.scene.isActive("BattleScene")) {
      this.bindBattleEvents();
    }
  }
}

window.UIScene = UIScene;
