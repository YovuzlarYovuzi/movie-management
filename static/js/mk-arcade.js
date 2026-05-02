(() => {
  const root = document.getElementById("mk-root");
  if (!root) return;

  const canvas = document.getElementById("mk-canvas");
  const ctx = canvas.getContext("2d");
  const loader = document.getElementById("mk-loader");
  const loaderBar = document.getElementById("mk-loader-bar");
  const loaderText = document.getElementById("mk-loader-text");
  const startPanel = document.getElementById("mk-start");
  const endPanel = document.getElementById("mk-end");
  const endTitle = document.getElementById("mk-end-title");
  const endText = document.getElementById("mk-end-text");
  const hpEl = document.getElementById("mk-hp");
  const ratingEl = document.getElementById("mk-rating");
  const mobileControls = document.getElementById("mk-mobile-controls");
  const staticBase = document.querySelector('meta[name="mk-static-base"]')?.content || "/static/assets/mk/";
  const isMobile = root.dataset.isMobile === "1";

  const KEY_STATE = {
    left: false,
    right: false,
    block: false,
    jumpQueued: false,
    punchQueued: false,
    kickQueued: false,
    specialQueued: false,
  };

  const ROUND_TIME = 75;
  const LEVEL_COUNT = 100;
  const FLOOR_Y = 610;
  const GRAVITY = 2200;
  const WORLD_LEFT = 110;
  const WORLD_RIGHT = 1170;

  const assets = {
    images: {},
    configs: {},
    sounds: {
      intro: `${staticBase}media/intro.wav`,
      fight: `${staticBase}media/fight.wav`,
      jump: `${staticBase}media/jump.wav`,
      punch: `${staticBase}media/punch1.wav`,
      kick: `${staticBase}media/kick1.wav`,
      block: `${staticBase}media/block.wav`,
      hit: `${staticBase}media/singlehit.wav`,
      subzeroWin: `${staticBase}media/subzerowins.wav`,
      scorpionWin: `${staticBase}media/scorpionwins.wav`,
      subzeroWave: `${staticBase}media/subzerocombowave.wav`,
      scorpionWave: `${staticBase}media/scorpioncombowave.wav`,
      subzeroCombo: `${staticBase}media/subzerocombohit.wav`,
      scorpionCombo: `${staticBase}media/scorpioncombohit.wav`,
    },
  };

  const state = {
    game: null,
    playerData: null,
    selectedFighter: null,
    introAudio: null,
    level: Number(localStorage.getItem('mk_level') || 1),
  };

  const ACTIONS = {
    punch: { anims: ["punch1", "punch2"], duration: 380, activeStart: 110, activeEnd: 210, damage: 10, range: 88, yOffset: 116, sound: "punch" },
    kick: { anims: ["kick1", "kick2"], duration: 460, activeStart: 150, activeEnd: 290, damage: 15, range: 112, yOffset: 104, sound: "kick" },
    special: { anim: "combo1", duration: 560, projectileAt: 180, soundMap: { subzero: "subzeroWave", scorpion: "scorpionWave" } },
  };

  function updateLoader(step, total, message) {
    const pct = Math.round((step / total) * 100);
    if (loaderBar) loaderBar.style.width = `${pct}%`;
    if (loaderText) loaderText.textContent = message ? `${message} ${pct}%` : `Loading... ${pct}%`;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load ${src}`));
      image.src = src;
    });
  }

  async function fetchJson(url) {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return response.json();
  }

  function playSound(name, volume = 0.45) {
    const src = assets.sounds[name];
    if (!src) return;
    const sound = new Audio(src);
    sound.volume = volume;
    sound.play().catch(() => {});
  }

  function stopIntroLoop() {
    if (state.introAudio) {
      state.introAudio.pause();
      state.introAudio.currentTime = 0;
      state.introAudio = null;
    }
  }

  function startIntroLoop() {
    stopIntroLoop();
    const audio = new Audio(assets.sounds.intro);
    audio.loop = true;
    audio.volume = 0.18;
    audio.play().catch(() => {});
    state.introAudio = audio;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rectsIntersect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  class Projectile {
    constructor(owner) {
      this.owner = owner;
      this.active = false;
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.frameTime = 0;
      this.frameIndex = 0;
    }

    spawn() {
      this.active = true;
      this.frameTime = 0;
      this.frameIndex = 0;
      this.x = this.owner.x + this.owner.facing * 94;
      this.y = this.owner.y - 126;
      this.vx = this.owner.facing * 460;
    }

    update(dt, opponent) {
      if (!this.active) return;
      this.frameTime += dt;
      const frames = this.owner.config.projectile || [];
      if (frames.length) {
        this.frameIndex = Math.floor(this.frameTime / 90) % frames.length;
      }
      this.x += this.vx * dt / 1000;

      const hitBox = { x: this.x - 26, y: this.y - 24, w: 52, h: 48 };
      if (rectsIntersect(hitBox, opponent.getBodyBox())) {
        const soundKey = this.owner.name === "subzero" ? "subzeroCombo" : "scorpionCombo";
        this.active = false;
        opponent.takeHit(18, "special");
        playSound(soundKey, 0.52);
      }

      if (this.x < 20 || this.x > 1260) {
        this.active = false;
      }
    }

    draw(context) {
      if (!this.active) return;
      const frames = this.owner.config.projectile || [];
      const rect = frames[this.frameIndex] || frames[0];
      if (!rect) return;
      const width = rect.w * 2.7;
      const height = rect.h * 2.7;

      context.save();
      if (this.owner.facing === -1) {
        context.translate(this.x, 0);
        context.scale(-1, 1);
        context.drawImage(this.owner.image, rect.x, rect.y, rect.w, rect.h, -width / 2, this.y - height / 2, width, height);
      } else {
        context.drawImage(this.owner.image, rect.x, rect.y, rect.w, rect.h, this.x - width / 2, this.y - height / 2, width, height);
      }
      context.restore();
    }
  }

  class Fighter {
    constructor(name, image, config, side, level = 1) {
      this.name = name;
      this.image = image;
      this.config = config;
      this.side = side;
      this.scale = 3.15;
      this.specialCooldown = 0;
      this.attackCooldown = 0;
      this.projectile = new Projectile(this);
      this.level = Number(level || 1);
      this.damageMult = 1 + Math.min(1.8, (this.level - 1) * 0.01); // scalable damage up to ~+180%
      this.reset(side === "left" ? 330 : 940);
    }

    reset(x) {
      this.x = x;
      this.y = FLOOR_Y;
      this.vx = 0;
      this.vy = 0;
      // HP scales with level
      this.hp = Math.round(100 + (this.level - 1) * 3.5);
      this.facing = this.side === "left" ? 1 : -1;
      this.anim = "stance";
      this.animLoop = true;
      this.animHold = false;
      this.animTime = 0;
      this.frameDuration = 95;
      this.busy = false;
      this.blocking = false;
      this.hitTimer = 0;
      this.action = null;
      this.actionTime = 0;
      this.hitApplied = false;
      this.projectileSpawned = false;
      this.roundWon = false;
      this.ko = false;
    }

    setAnim(name, options = {}) {
      if (this.anim === name && !options.force) return;
      this.anim = name;
      this.animLoop = options.loop !== false;
      this.animHold = Boolean(options.hold);
      this.frameDuration = options.frameDuration || 95;
      this.animTime = 0;
    }

    currentFrames() {
      return this.config[this.anim] || this.config.stance || [];
    }

    currentRect() {
      const frames = this.currentFrames();
      if (!frames.length) return null;
      const frameIndex = this.frameIndex();
      return frames[frameIndex] || frames[0];
    }

    frameIndex() {
      const frames = this.currentFrames();
      if (!frames.length) return 0;
      const raw = Math.floor(this.animTime / this.frameDuration);
      if (this.animLoop) return raw % frames.length;
      return Math.min(frames.length - 1, raw);
    }

    getBodyBox() {
      return { x: this.x - 34, y: this.y - 124 * this.scale / 3.15, w: 68, h: 124 * this.scale / 3.15 };
    }

    getAttackBox(action) {
      const range = action.range;
      return {
        x: this.facing === 1 ? this.x + 10 : this.x - range - 10,
        y: this.y - action.yOffset,
        w: range,
        h: 92,
      };
    }

    takeHit(damage, type) {
      if (this.ko || this.roundWon) return;

      if (this.blocking) {
        this.hp = Math.max(0, this.hp - damage * 0.2);
        this.hitTimer = 140;
        playSound("block", 0.4);
        return;
      }

      // Apply damage (attacker may scale damage via damageMult on their side)
      this.hp = Math.max(0, this.hp - Math.round(damage));
      this.hitTimer = type === "special" ? 580 : 240;
      this.busy = true;
      this.action = null;
      this.actionTime = 0;
      this.hitApplied = false;
      this.projectileSpawned = false;
      this.blocking = false;

      if (this.hp <= 0) {
        this.ko = true;
        this.setAnim(this.name === "subzero" ? "dizzy" : "disabled", { loop: false, hold: true, frameDuration: 110, force: true });
      } else if (type === "special") {
        this.setAnim(this.name === "subzero" ? "disabled" : "dizzy", { loop: false, hold: true, frameDuration: 105, force: true });
      } else {
        this.setAnim("singlehit", { loop: false, hold: true, frameDuration: 75, force: true });
      }
      playSound("hit", 0.44);
    }

    canAct() {
      return !this.ko && !this.roundWon && this.hitTimer <= 0 && !this.action;
    }

    startAction(name) {
      if (!this.canAct()) return false;
      if (name === "special" && this.specialCooldown > 0) return false;
      if (name !== "special" && this.attackCooldown > 0) return false;

      this.action = name;
      this.actionTime = 0;
      this.hitApplied = false;
      this.projectileSpawned = false;
      this.busy = true;
      this.blocking = false;

      if (name === "special") {
        this.specialCooldown = 2900;
        this.setAnim(ACTIONS.special.anim, { loop: false, hold: true, frameDuration: 90, force: true });
        playSound(ACTIONS.special.soundMap[this.name], 0.5);
      } else {
        this.attackCooldown = 380;
        const choices = ACTIONS[name].anims;
        const anim = choices[Math.floor(Math.random() * choices.length)];
        this.setAnim(anim, { loop: false, hold: true, frameDuration: 72, force: true });
        playSound(ACTIONS[name].sound, 0.42);
      }
      return true;
    }

    update(dt, input, opponent) {
      this.animTime += dt;
      this.hitTimer = Math.max(0, this.hitTimer - dt);
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
      this.specialCooldown = Math.max(0, this.specialCooldown - dt);

      if (!this.ko && !this.roundWon) {
        this.facing = this.x < opponent.x ? 1 : -1;
      }

      if (this.action) {
        this.vx = 0;
        this.actionTime += dt;
        if (this.action === "special") {
          if (!this.projectileSpawned && this.actionTime >= ACTIONS.special.projectileAt) {
            this.projectile.spawn();
            this.projectileSpawned = true;
          }
          if (this.actionTime >= ACTIONS.special.duration) {
            this.action = null;
            this.busy = false;
            if (!this.ko && !this.roundWon) this.setAnim("stance", { loop: true, force: true });
          }
        } else {
          const action = ACTIONS[this.action];
          if (!this.hitApplied && this.actionTime >= action.activeStart && this.actionTime <= action.activeEnd) {
            if (rectsIntersect(this.getAttackBox(action), opponent.getBodyBox())) {
              // Scale damage by attacker's damageMult
              const dmg = Math.max(1, Math.round(action.damage * (this.damageMult || 1)));
              opponent.takeHit(dmg, this.action);
              this.hitApplied = true;
            }
          }
          if (this.actionTime >= action.duration) {
            this.action = null;
            this.busy = false;
            if (!this.ko && !this.roundWon) this.setAnim("stance", { loop: true, force: true });
          }
        }
      } else if (this.hitTimer <= 0 && !this.ko && !this.roundWon) {
        const movingLeft = input.left && !input.right;
        const movingRight = input.right && !input.left;
        this.blocking = Boolean(input.block);

        if (input.jumpQueued && this.y >= FLOOR_Y) {
          this.vy = -860;
          this.y -= 1;
          playSound("jump", 0.36);
        }

        if (this.y >= FLOOR_Y) {
          if (this.blocking) {
            this.vx = 0;
            this.setAnim("block", { loop: false, hold: true, frameDuration: 80 });
          } else if (movingLeft) {
            this.vx = -210;
            this.setAnim("move", { loop: true, frameDuration: 78 });
          } else if (movingRight) {
            this.vx = 210;
            this.setAnim("move", { loop: true, frameDuration: 78 });
          } else {
            this.vx = 0;
            this.setAnim("stance", { loop: true, frameDuration: 95 });
          }

          if (input.punchQueued) this.startAction("punch");
          else if (input.kickQueued) this.startAction("kick");
          else if (input.specialQueued) this.startAction("special");
        }
      }

      this.vy += GRAVITY * dt / 1000;
      this.x = clamp(this.x + this.vx * dt / 1000, WORLD_LEFT, WORLD_RIGHT);
      this.y += this.vy * dt / 1000;

      if (this.y >= FLOOR_Y) {
        this.y = FLOOR_Y;
        this.vy = 0;
      } else if (!this.action && this.hitTimer <= 0 && !this.ko && !this.roundWon) {
        this.setAnim(this.vy < 0 ? "up" : "down", { loop: false, hold: true, frameDuration: 92 });
      }

      this.projectile.update(dt, opponent);
    }

    draw(context) {
      const rect = this.currentRect();
      if (!rect) return;

      const drawWidth = rect.w * this.scale;
      const drawHeight = rect.h * this.scale;
      const drawX = this.x - drawWidth / 2;
      const drawY = this.y - drawHeight;

      context.save();
      if (this.facing === -1) {
        context.translate(this.x, 0);
        context.scale(-1, 1);
        context.drawImage(this.image, rect.x, rect.y, rect.w, rect.h, -drawWidth / 2, drawY, drawWidth, drawHeight);
      } else {
        context.drawImage(this.image, rect.x, rect.y, rect.w, rect.h, drawX, drawY, drawWidth, drawHeight);
      }
      context.restore();

      this.projectile.draw(context);
    }
  }

  class MKArcadeGame {
    constructor(playerData) {
      this.playerData = playerData || {};
      this.running = false;
      this.player = null;
      this.enemy = null;
      this.roundTime = ROUND_TIME;
      this.lastFrame = 0;
      this.ai = { nextActionAt: 0 };
      this.resultSent = false;
      this.level = Number(state.level || 1);
    }

    start(fighterName) {
      stopIntroLoop();
      state.selectedFighter = fighterName;
      this.player = new Fighter(fighterName, assets.images[fighterName], assets.configs[fighterName], "left", this.level);
      const enemyName = fighterName === "subzero" ? "scorpion" : "subzero";
      this.enemy = new Fighter(enemyName, assets.images[enemyName], assets.configs[enemyName], "right", this.level);
      this.roundTime = ROUND_TIME;
      this.running = true;
      this.resultSent = false;
      this.lastFrame = performance.now();
      this.ai.nextActionAt = this.lastFrame + 650;
      playSound("fight", 0.55);
      endPanel.hidden = true;
      requestAnimationFrame((timestamp) => this.loop(timestamp));
      // Show motivational status at start
      showMotivation(this.level);
    }

    loop(timestamp) {
      if (!this.running) return;
      const delta = Math.min(40, timestamp - this.lastFrame || 16);
      this.lastFrame = timestamp;
      this.update(delta, timestamp);
      this.render();
      if (this.running) requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
    }

    update(delta, now) {
      this.roundTime = Math.max(0, this.roundTime - delta / 1000);

      const aiInput = this.buildAIInput(now);
      const playerInput = {
        left: KEY_STATE.left,
        right: KEY_STATE.right,
        block: KEY_STATE.block,
        jumpQueued: KEY_STATE.jumpQueued,
        punchQueued: KEY_STATE.punchQueued,
        kickQueued: KEY_STATE.kickQueued,
        specialQueued: KEY_STATE.specialQueued,
      };

      this.player.update(delta, playerInput, this.enemy);
      this.enemy.update(delta, aiInput, this.player);

      KEY_STATE.jumpQueued = false;
      KEY_STATE.punchQueued = false;
      KEY_STATE.kickQueued = false;
      KEY_STATE.specialQueued = false;

      const separation = 70;
      if (Math.abs(this.player.x - this.enemy.x) < separation) {
        const overlap = separation - Math.abs(this.player.x - this.enemy.x);
        this.player.x -= overlap / 2;
        this.enemy.x += overlap / 2;
      }

      if ((this.player.hp <= 0 || this.enemy.hp <= 0 || this.roundTime <= 0) && !this.resultSent) {
        const victory = this.roundTime <= 0 ? this.player.hp >= this.enemy.hp : this.enemy.hp <= 0;
        this.finishRound(victory);
      }
    }

    buildAIInput(now) {
      const input = {
        left: false,
        right: false,
        block: false,
        jumpQueued: false,
        punchQueued: false,
        kickQueued: false,
        specialQueued: false,
      };

      if (this.enemy.ko || this.enemy.roundWon || this.enemy.action || this.enemy.hitTimer > 0) {
        return input;
      }

      const distance = this.player.x - this.enemy.x;
      const absDistance = Math.abs(distance);
      const projectileThreat = this.player.projectile.active && Math.abs(this.player.projectile.x - this.enemy.x) < 150;

      if (projectileThreat) {
        input.block = true;
        return input;
      }

      if (absDistance > 180) {
        input.left = distance < 0;
        input.right = distance > 0;
      } else if (now >= this.ai.nextActionAt) {
        const roll = Math.random();
        if (roll < 0.25) input.block = true;
        else if (roll < 0.55) input.punchQueued = true;
        else if (roll < 0.82) input.kickQueued = true;
        else input.specialQueued = this.enemy.specialCooldown <= 0;

        if (!input.specialQueued && roll > 0.9) input.jumpQueued = true;
        this.ai.nextActionAt = now + 450 + Math.random() * 700;
      }

      return input;
    }

    render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(assets.images.background, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(assets.images.stage, 0, 0, canvas.width, canvas.height);

      this.drawHud();
      this.player.draw(ctx);
      this.enemy.draw(ctx);

      if (this.roundTime <= 5 && this.roundTime > 0 && Math.floor(this.roundTime) !== 0) {
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = "900 38px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("FINISH IT", canvas.width / 2, 120);
        ctx.restore();
      }
    }

    drawHud() {
      const leftWidth = 420 * (this.player.hp / 100);
      const rightWidth = 420 * (this.enemy.hp / 100);

      ctx.save();
      ctx.fillStyle = "rgba(5, 7, 10, 0.78)";
      ctx.fillRect(54, 36, 420, 22);
      ctx.fillRect(806, 36, 420, 22);
      ctx.fillStyle = "#2ab7ff";
      ctx.fillRect(54, 36, leftWidth, 22);
      ctx.fillStyle = "#f5d94f";
      ctx.fillRect(1226 - rightWidth, 36, rightWidth, 22);

      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.strokeRect(54, 36, 420, 22);
      ctx.strokeRect(806, 36, 420, 22);

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "900 18px system-ui";
      ctx.fillText(this.player.name.toUpperCase(), 54, 28);
      ctx.textAlign = "right";
      ctx.fillText(this.enemy.name.toUpperCase(), 1226, 28);
      ctx.textAlign = "center";
      ctx.font = "900 34px system-ui";
      ctx.fillText(String(Math.ceil(this.roundTime)), canvas.width / 2, 56);
      ctx.restore();
    }

    async finishRound(victory) {
      this.resultSent = true;
      this.running = false;
      this.player.roundWon = victory;
      this.enemy.roundWon = !victory;
      this.player.setAnim(victory ? "win" : (this.player.name === "subzero" ? "dizzy" : "disabled"), { loop: false, hold: true, frameDuration: 110, force: true });
      this.enemy.setAnim(victory ? (this.enemy.name === "subzero" ? "dizzy" : "disabled") : "win", { loop: false, hold: true, frameDuration: 110, force: true });

      playSound(victory ? `${this.player.name}Win` : `${this.enemy.name}Win`, 0.55);

      const payload = {
        victory,
        device: isMobile ? "mobile" : "pc",
        durationMs: Math.round((ROUND_TIME - this.roundTime) * 1000),
      };

      let resultText = victory ? "You win" : "You lose";

      try {
        const response = await fetch("/battle/mk/result/", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": this.getCsrfToken(),
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => null);
        if (response.ok && data?.ok) {
          if (hpEl) hpEl.textContent = String(data.new_hp);
          if (ratingEl) ratingEl.textContent = String(data.new_battle_rating);
          resultText = `${victory ? "Victory" : "Defeat"} | +${data.hp_reward} HP | +${data.rating_change} rating`;
        }
      } catch (error) {
        resultText = `${victory ? "Victory" : "Defeat"} | Result save failed`;
      }

      endTitle.textContent = victory ? "Victory" : "Defeat";
      endText.textContent = resultText;
      endPanel.hidden = false;
      // Save progress locally: if victory, advance level (cap at LEVEL_COUNT)
      try {
        if (victory) {
          state.level = Math.min(LEVEL_COUNT, Number(state.level || 1) + 1);
          localStorage.setItem('mk_level', String(state.level));
        }
      } catch (e) {}
    }

    getCsrfToken() {
      const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : "";
    }
  }

  function drawIdleScene() {
    if (!assets.images.background || !assets.images.stage) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(assets.images.background, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(assets.images.stage, 0, 0, canvas.width, canvas.height);
  }

  function bindKeyboard() {
    window.addEventListener("keydown", (event) => {
      if (!state.game || !state.game.player) return;
      if (event.repeat) return;

      const key = event.key.toLowerCase();
      if (key === "a") KEY_STATE.left = true;
      if (key === "d") KEY_STATE.right = true;
      if (key === "s") KEY_STATE.block = true;
      if (key === "w") KEY_STATE.jumpQueued = true;
      if (key === "j") KEY_STATE.punchQueued = true;
      if (key === "k") KEY_STATE.kickQueued = true;
      if (key === "l") KEY_STATE.specialQueued = true;
    });

    window.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      if (key === "a") KEY_STATE.left = false;
      if (key === "d") KEY_STATE.right = false;
      if (key === "s") KEY_STATE.block = false;
    });
  }

  function bindMobileControls() {
    if (!isMobile || !mobileControls) return;
    mobileControls.hidden = false;

    mobileControls.querySelectorAll("[data-control]").forEach((button) => {
      const control = button.dataset.control;
      const setState = (pressed) => {
        if (control === "left") KEY_STATE.left = pressed;
        if (control === "right") KEY_STATE.right = pressed;
        if (control === "block") KEY_STATE.block = pressed;
      };

      button.addEventListener("pointerdown", () => setState(true));
      button.addEventListener("pointerup", () => setState(false));
      button.addEventListener("pointerout", () => setState(false));
      button.addEventListener("pointercancel", () => setState(false));
    });

    mobileControls.querySelectorAll("[data-action]").forEach((button) => {
      const action = button.dataset.action;
      button.addEventListener("pointerdown", () => {
        if (action === "jump") KEY_STATE.jumpQueued = true;
        if (action === "punch") KEY_STATE.punchQueued = true;
        if (action === "kick") KEY_STATE.kickQueued = true;
        if (action === "special") KEY_STATE.specialQueued = true;
      });
    });
  }

  async function bootstrap() {
    const steps = [
      async () => { assets.images.background = await loadImage(`${staticBase}media/bckg.png`); },
      async () => { assets.images.stage = await loadImage(`${staticBase}media/stage.png`); },
      async () => { assets.images.subzero = await loadImage(`${staticBase}media/subzero.png`); },
      async () => { assets.images.scorpion = await loadImage(`${staticBase}media/scorpion.png`); },
      async () => { assets.configs.subzero = await fetchJson(`${staticBase}config/subzero_boxes.json`); },
      async () => { assets.configs.scorpion = await fetchJson(`${staticBase}config/scorpion_boxes.json`); },
      async () => {
        const response = await fetch("/player/data/", { credentials: "same-origin" });
        if (response.ok) state.playerData = await response.json();
      },
    ];

    for (let i = 0; i < steps.length; i += 1) {
      updateLoader(i, steps.length, "Loading");
      await steps[i]();
    }

    updateLoader(steps.length, steps.length, "Ready");

    if (hpEl) hpEl.textContent = String(state.playerData?.hp ?? 0);
    if (ratingEl) ratingEl.textContent = String(state.playerData?.battle_rating ?? 1000);

    setTimeout(() => {
      if (loader) {
        loader.style.opacity = "0";
        setTimeout(() => {
          loader.style.display = "none";
        }, 180);
      }
    }, 120);

    drawIdleScene();
    startIntroLoop();
  }

  // Motivational messages pool
  const MOTIVATIONS = [
    "Dunyodagi eng kuchli o'yinchi bo'lish yo'lida!",
    "Sen juda qobiliyatli — keyingi bosqichga hozir tayyorlan!",
    "Har urinish seni kuchaytiradi — davom et!",
    "Qiyinchiliklar seni mustahkamlaydi, bardavom bo'l!",
    "Sabr va mashq — yutqazishni yo'qotadi!",
    "Sen jangchiga aylanyapsan — davom et!",
  ];

  function showMotivation(level) {
    try {
      const msg = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.background = 'rgba(0,0,0,0.56)';
      overlay.style.zIndex = 9999;
      const box = document.createElement('div');
      box.style.background = '#0a0c12';
      box.style.border = '1px solid rgba(255,255,255,0.12)';
      box.style.padding = '18px 24px';
      box.style.maxWidth = '640px';
      box.style.color = '#fff';
      box.style.fontFamily = 'system-ui';
      box.style.textAlign = 'center';
      box.innerHTML = `<div style="font-weight:800;font-size:18px;margin-bottom:8px">Level ${level}</div><div style="font-weight:700;font-size:14px">${msg}</div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      setTimeout(() => {
        try { document.body.removeChild(overlay); } catch (e) {}
      }, 1600);
    } catch (e) {}
  }

  function showAuthPrompt() {
    try {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.background = 'rgba(0,0,0,0.6)';
      overlay.style.zIndex = 9999;
      const box = document.createElement('div');
      box.style.background = '#0a0c12';
      box.style.border = '1px solid rgba(255,255,255,0.12)';
      box.style.padding = '18px 24px';
      box.style.maxWidth = '640px';
      box.style.color = '#fff';
      box.style.fontFamily = 'system-ui';
      box.style.textAlign = 'center';
      box.innerHTML = `<div style="font-weight:800;font-size:18px;margin-bottom:8px">Ro'yxatdan o'ting</div><div style="font-weight:700;font-size:14px;margin-bottom:12px">O'yinga kirish uchun iltimos hisobga kiring yoki ro'yxatdan o'ting.</div><div><a href="/accounts/login/" class="btn btn-brand" style="margin-right:12px;padding:8px 12px;background:#2ab7ff;color:#0a0c12;border-radius:6px;text-decoration:none;">Kirish</a><a href="/accounts/signup/" class="btn btn-surface" style="padding:8px 12px;background:#ffffff22;color:#fff;border-radius:6px;text-decoration:none;">Ro'yxat</a></div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          try { document.body.removeChild(overlay); } catch (err) {}
        }
      });
    } catch (e) {}
  }

  startPanel.querySelectorAll("[data-fighter]").forEach((button) => {
    button.addEventListener("click", () => {
      // Require authentication to start
      const isAuth = Boolean(window.__USER_AUTHENTICATED === true || window.__USER_AUTHENTICATED === 'true');
      if (!isAuth) {
        showAuthPrompt();
        return;
      }
      const fighter = button.dataset.fighter;
      state.game = new MKArcadeGame(state.playerData);
      startPanel.hidden = true;
      state.game.start(fighter);
    });
  });

  document.getElementById("mk-retry").addEventListener("click", () => {
    if (!state.selectedFighter) return;
    state.game = new MKArcadeGame(state.playerData);
    state.game.start(state.selectedFighter);
  });

  const mkNextBtn = document.getElementById("mk-next");
  if (mkNextBtn) {
    mkNextBtn.addEventListener("click", () => {
      if (!state.selectedFighter) return;
      // Advance to next level client-side and start
      state.level = Math.min(LEVEL_COUNT, Number(state.level || 1) + 1);
      try { localStorage.setItem('mk_level', String(state.level)); } catch (e) {}
      state.game = new MKArcadeGame(state.playerData);
      state.game.level = Number(state.level);
      state.game.start(state.selectedFighter);
    });
  }

  document.getElementById("mk-menu").addEventListener("click", () => {
    endPanel.hidden = true;
    startPanel.hidden = false;
    state.selectedFighter = null;
    stopIntroLoop();
    drawIdleScene();
    startIntroLoop();
  });

  bindKeyboard();
  bindMobileControls();
  bootstrap().catch((error) => {
    if (loaderText) loaderText.textContent = `Failed to load: ${error.message}`;
  });
})();
