/* global Phaser */

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
    this.state = {
      player: null,
      shop: null,
      selectedSkin: null,
    };
  }

  create() {
    window.__BATTLE_MENU_READY = true;
    this.cameras.main.setBackgroundColor("#05060a");

    const w = this.scale.width;
    const h = this.scale.height;

    const loaderEl = document.getElementById("battle-loader");
    const loaderText = document.getElementById("battle-loader-text");
    if (loaderEl) {
      if (loaderText) loaderText.textContent = "Menyu tayyor";
      loaderEl.style.opacity = "0";
      setTimeout(() => {
        loaderEl.style.display = "none";
      }, 220);
    }

    this.add.image(0, 0, "map2").setOrigin(0, 0).setAlpha(0.9).setScale(Math.max(w / 1024, h / 768));
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.48);

    this.add
      .text(w / 2, 72, "AniClass Battle Arena", {
        fontFamily: "system-ui",
        fontSize: "34px",
        fontStyle: "900",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(w / 2, 110, "Bosslarni yeng, HP yig'ing va reytingni ko'taring", {
        fontFamily: "system-ui",
        fontSize: "14px",
        fontStyle: "700",
        color: "rgba(255,255,255,0.78)",
      })
      .setOrigin(0.5, 0.5);

    try {
      this.preview = this.add
        .sprite(w / 2, h / 2 + 36, "player_knight", "idle/frame0000")
        .setOrigin(0.5, 1)
        .setScale(2.6);
      this.preview.play("knight_idle");
    } catch (e) {
      this.preview = this.add.rectangle(w / 2, h / 2 + 36, 64, 96, 0x22242a).setOrigin(0.5, 1);
    }

    this.statsText = this.add
      .text(22, 22, "Yuklanmoqda...", {
        fontFamily: "system-ui",
        fontSize: "13px",
        fontStyle: "800",
        color: "rgba(255,255,255,0.86)",
        lineSpacing: 5,
      })
      .setOrigin(0, 0);

    this.noticeText = this.add
      .text(w / 2, h - 122, "", {
        fontFamily: "system-ui",
        fontSize: "13px",
        fontStyle: "800",
        color: "#ffffff",
        backgroundColor: "rgba(10,12,18,0.50)",
        padding: { x: 10, y: 8 },
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0)
      .setVisible(false);

    this.btnStart = this.makeBtn(w / 2, h - 160, "START BATTLE", () => this.startBattle());
    this.btnShop = this.makeBtn(w / 2, h - 110, "SHOP", () => this.openShop());
    this.btnRank = this.makeBtn(w / 2, h - 60, "RATING", () => this.openRating());
    this.btnFs = this.makeBtn(w - 116, 24, "FULLSCREEN", () => this.toggleFullscreen(), 12);

    const controlText = this.isMobileMode()
      ? "Mobil: tugmalar bilan yuring, sakrang, uring va skill ishlating"
      : "PC: A/D yurish | W sakrash | Space baland sakrash | S block | Ctrl roll | Chap klik attack | Ong klik skill";

    this.info = this.add
      .text(18, h - 18, controlText, {
        fontFamily: "system-ui",
        fontSize: "12px",
        fontStyle: "700",
        color: "rgba(255,255,255,0.70)",
      })
      .setOrigin(0, 1);

    this.panel = this.add.container(w / 2, h / 2).setVisible(false);

    this.loadData().catch(() => {
      this.showNotice("Ma'lumotlarni yuklab bo'lmadi");
    });
    this.scale.on("resize", () => this.scene.restart());
  }

  isMobileMode() {
    return Boolean(window.__BATTLE_ENV && window.__BATTLE_ENV.isMobile);
  }

  makeBtn(x, y, label, onClick, fontSize = 18) {
    const text = this.add.text(0, 0, label, {
      fontFamily: "system-ui",
      fontSize: `${fontSize}px`,
      fontStyle: "900",
      color: "#ffffff",
    });
    const width = text.width + 36;
    const height = text.height + 24;
    const bg = this.add.rectangle(0, 0, width, height, 0x0a0c12, 0.55).setStrokeStyle(1, 0xffffff, 0.14);
    const glow = this.add.rectangle(0, 0, width, height, 0x00e5ff, 0.08);
    const button = this.add.container(x, y, [glow, bg, text]).setSize(width, height).setInteractive();

    button.on("pointerover", () => {
      bg.setFillStyle(0x0a0c12, 0.75);
      glow.setFillStyle(0xff2bd6, 0.12);
      this.tweens.add({ targets: button, scale: 1.03, duration: 120, ease: "Sine.easeOut" });
    });
    button.on("pointerout", () => {
      bg.setFillStyle(0x0a0c12, 0.55);
      glow.setFillStyle(0x00e5ff, 0.08);
      this.tweens.add({ targets: button, scale: 1.0, duration: 120, ease: "Sine.easeOut" });
    });
    button.on("pointerdown", () => {
      this.cameras.main.shake(80, 0.004);
      const result = onClick();
      if (result && typeof result.then === "function") {
        result.catch(() => {});
      }
    });

    return button;
  }

  async loadData() {
    const [player, shop] = await Promise.all([
      fetch("/player/data/", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/battle/shop/", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    // ban checks removed — no redirect for banned players

    this.state.player = player;
    this.refreshShopState(shop);
    this.updateStats();
  }

  updateStats() {
    const player = this.state.player || {};
    const shop = this.state.shop || {};
    const boss = Number(player.boss_progress || 0) + 1;

    this.statsText.setText(
      [
        `User: ${player.username || "-"}`,
        `HP: ${shop.hp ?? player.hp ?? 0}`,
        `Rating: ${player.battle_rating ?? 1000}`,
        `Boss: ${boss}`,
        `Damage x${Number(shop.damage_multiplier || player.damage_multiplier || 1).toFixed(2)}`,
        `Skill x${Number(shop.skill_multiplier || player.skill_multiplier || 1).toFixed(2)}`,
      ].join("\n")
    );
  }

  refreshShopState(shop) {
    if (!shop) return;
    this.state.shop = shop;
    if (this.state.player) {
      this.state.player.hp = shop.hp;
      this.state.player.damage_multiplier = shop.damage_multiplier;
      this.state.player.skill_multiplier = shop.skill_multiplier;
    }
    this.applySkin(shop.active_skin || null);
    this.updateStats();
  }

  applySkin(skinId) {
    this.state.selectedSkin = skinId;
    if (this.preview && typeof this.preview.clearTint === "function") this.preview.clearTint();
    if (!skinId) return;

    const skin = (this.state.shop?.items || []).find((item) => item.id === skinId);
    if (skin && skin.tint && this.preview && typeof this.preview.setTint === "function") {
      this.preview.setTint(skin.tint);
    }
  }

  startBattle() {
    if (!this.sound.locked) this.sound.play("sfx_menu", { volume: 0.5 });
    const bossId = Number(this.state.player?.boss_progress || 0);
    const damageMult = Number(this.state.player?.damage_multiplier || 1.0);
    const skillMult = Number(this.state.player?.skill_multiplier || 1.0);

    // Global dev flag: if battleDisabled, show notice and don't enter battle
    const battleDisabled = Boolean(window.__BATTLE_ENV?.battleDisabled ?? false);
    if (battleDisabled) {
      const { bg } = this.openPanel("O'yin ishlab chiqilmoqda");
      const msg = this.add
        .text(0, -12, "Battle bo'limi hozircha ishlanmoqda. Keyinroq qayta urinib ko'ring.", {
          fontFamily: "system-ui",
          fontSize: "14px",
          fontStyle: "700",
          color: "rgba(255,255,255,0.9)",
          align: "center",
          wordWrap: { width: Math.min(520, this.scale.width - 80) - 40 },
        })
        .setOrigin(0.5, 0);
      const closeBtn = this.makeBtn(0, bg.height / 2 - 46, "OK", () => this.closePanel(), 14);
      this.panel.add([msg, closeBtn]);
      return;
    }

    if (!this.scene.isActive("UIScene")) {
      this.scene.launch("UIScene");
    }

    this.time.delayedCall(80, () => {
      this.scene.start("BattleScene", {
        skinId: this.state.selectedSkin,
        bossId,
        damageMult,
        skillMult,
        device: this.isMobileMode() ? "mobile" : "pc",
      });
    });
  }

  toggleFullscreen() {
    if (!this.sound.locked) this.sound.play("sfx_menu", { volume: 0.35 });
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else this.scale.startFullscreen();
  }

  openPanel(titleText) {
    this.panel.removeAll(true);
    this.panel.setVisible(true);

    const width = Math.min(920, this.scale.width - 40);
    const height = Math.min(440, this.scale.height - 120);
    const bg = this.add.rectangle(0, 0, width, height, 0x0a0c12, 0.78).setStrokeStyle(1, 0xffffff, 0.14);
    const header = this.add
      .text(0, -height / 2 + 14, titleText, {
        fontFamily: "system-ui",
        fontSize: "18px",
        fontStyle: "900",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0);
    const close = this.makeBtn(width / 2 - 80, -height / 2 + 20, "CLOSE", () => this.closePanel(), 12);

    this.panel.add([bg, header, close]);
    return { bg };
  }

  closePanel() {
    this.panel.setVisible(false);
  }

  async openRating() {
    const { bg } = this.openPanel("Battle rating");
    const body = this.add
      .text(-bg.width / 2 + 18, -bg.height / 2 + 58, "Loading...", {
        fontFamily: "system-ui",
        fontSize: "13px",
        fontStyle: "700",
        color: "rgba(255,255,255,0.85)",
        wordWrap: { width: bg.width - 36 },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);
    this.panel.add(body);

    try {
      const data = await fetch("/battle/leaderboard/", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null));
      const rows = (data?.profiles || []).slice(0, 12);
      const lines = rows.map((row, index) => `${index + 1}. ${row.username} | rating ${row.battle_rating} | HP ${row.hp} | boss ${Number(row.boss_progress || 0) + 1}`);
      body.setText(lines.join("\n") || "Hali reyting yo'q.");
    } catch (e) {
      body.setText("Reytingni yuklab bo'lmadi.");
    }
  }

  openShop() {
    const { bg } = this.openPanel("Shop");
    const items = this.state.shop?.items || [];
    const ownedSkins = new Set(this.state.shop?.owned_skins || []);
    const activeSkin = this.state.shop?.active_skin || null;
    const currentDamage = Number(this.state.shop?.damage_multiplier || 1);
    const currentSkill = Number(this.state.shop?.skill_multiplier || 1);

    const summary = this.add
      .text(
        -bg.width / 2 + 18,
        -bg.height / 2 + 56,
        `HP: ${this.state.shop?.hp ?? 0} | Aktiv skin: ${activeSkin || "classic"} | Damage x${currentDamage.toFixed(2)} | Skill x${currentSkill.toFixed(2)}`,
        {
          fontFamily: "system-ui",
          fontSize: "12px",
          fontStyle: "800",
          color: "rgba(255,255,255,0.78)",
          wordWrap: { width: bg.width - 36 },
        }
      )
      .setOrigin(0, 0);
    this.panel.add(summary);

    const leftX = -bg.width / 2 + 18;
    const rightX = 20;
    const topY = -bg.height / 2 + 96;
    const lineGap = 40;

    const skins = items.filter((item) => item.type === "skin");
    const upgrades = items.filter((item) => item.type !== "skin");

    this.addPanelSection(leftX, topY - 26, "Skins");
    skins.forEach((item, index) => {
      const y = topY + index * lineGap;
      const isOwned = item.id === "classic" || ownedSkins.has(item.id);
      const isActive = activeSkin === item.id || (!activeSkin && item.id === "classic");
      const status = isActive ? "ACTIVE" : isOwned ? "OWNED" : "LOCKED";
      const action = isActive ? "ACTIVE" : isOwned ? "EQUIP" : "BUY";
      const enabled = !isActive;

      this.addShopRow({
        originX: leftX,
        y,
        width: bg.width / 2 - 46,
        label: `${item.name} | ${item.cost} HP | ${status}`,
        actionLabel: action,
        enabled,
        onClick: () => this.buyOrEquip(item, isOwned),
      });
    });

    this.addPanelSection(rightX, topY - 26, "Qurol va skill");
    upgrades.forEach((item, index) => {
      const y = topY + index * lineGap;
      const isWeapon = item.type === "weapon";
      const value = Number(isWeapon ? item.damage_mult : item.skill_mult || 1);
      const current = isWeapon ? currentDamage : currentSkill;
      const isOwned = current >= value;
      const isActive = Math.abs(current - value) < 0.001;
      const status = isActive ? "ACTIVE" : isOwned ? "DONE" : "LOCKED";
      const action = isOwned ? status : "BUY";
      const enabled = !isOwned;

      this.addShopRow({
        originX: rightX,
        y,
        width: bg.width / 2 - 38,
        label: `${item.name} | ${item.cost} HP | ${status}`,
        actionLabel: action,
        enabled,
        onClick: () => this.buyUpgrade(item),
      });
    });
  }

  addPanelSection(x, y, text) {
    const label = this.add.text(x, y, text, {
      fontFamily: "system-ui",
      fontSize: "14px",
      fontStyle: "900",
      color: "#ffffff",
    });
    this.panel.add(label);
  }

  addShopRow({ originX, y, width, label, actionLabel, enabled, onClick }) {
    const line = this.add
      .text(originX, y, label, {
        fontFamily: "system-ui",
        fontSize: "12px",
        fontStyle: "800",
        color: "rgba(255,255,255,0.88)",
        wordWrap: { width: width - 110 },
      })
      .setOrigin(0, 0);
    this.panel.add(line);

    const button = this.makeBtn(originX + width - 54, y + 14, actionLabel, () => {
      if (!enabled) return;
      return onClick();
    }, 11);
    if (!enabled) button.setAlpha(0.45);
    this.panel.add(button);
  }

  async buyOrEquip(item, isOwned) {
    const csrf = this.getCsrfToken();

    try {
      if (!isOwned && item.cost > 0) {
        const buyResponse = await fetch("/battle/buy/", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
          body: JSON.stringify({ itemId: item.id }),
        });
        const buyData = await buyResponse.json().catch(() => null);
        if (!buyResponse.ok || !buyData?.ok) {
          this.showNotice("Sotib olish amalga oshmadi");
          this.cameras.main.shake(100, 0.006);
          return;
        }
        if (buyData.shop) this.refreshShopState(buyData.shop);
      }

      const equipResponse = await fetch("/battle/equip/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify({ skinId: item.id }),
      });
      const equipData = await equipResponse.json().catch(() => null);
      if (!equipResponse.ok || !equipData?.ok) {
        this.showNotice("Skinni yoqib bo'lmadi");
        this.cameras.main.shake(100, 0.006);
        return;
      }

      if (equipData.shop) this.refreshShopState(equipData.shop);
      this.cameras.main.flash(120, 0, 229, 255);
      this.openShop();
    } catch (e) {
      this.showNotice("Shop bilan aloqa uzildi");
    }
  }

  async buyUpgrade(item) {
    const csrf = this.getCsrfToken();

    try {
      const response = await fetch("/battle/buy/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        this.showNotice("Upgrade sotib bo'lmadi");
        this.cameras.main.shake(100, 0.006);
        return;
      }

      if (data.shop) this.refreshShopState(data.shop);
      this.cameras.main.flash(120, 0, 229, 255);
      this.openShop();
    } catch (e) {
      this.showNotice("Shop bilan aloqa uzildi");
    }
  }

  showNotice(text) {
    if (!text) return;
    this.noticeText.setText(text).setVisible(true).setAlpha(0);
    this.tweens.killTweensOf(this.noticeText);
    this.tweens.add({
      targets: this.noticeText,
      alpha: 1,
      duration: 120,
      ease: "Sine.easeOut",
      yoyo: true,
      hold: 1200,
    });
  }

  getCsrfToken() {
    const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }
}

window.MenuScene = MenuScene;
