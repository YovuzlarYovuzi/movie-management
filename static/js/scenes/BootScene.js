/* global Phaser */

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    window.__BATTLE_BOOT = true;
    const staticBase = document.querySelector('meta[name="static-base"]')?.content || "/static/";
    this.registry.set("staticBase", staticBase);
    const spritesBase = `${staticBase}assets/sprites/`;
    const mapsBase = `${staticBase}assets/maps/`;

    // Characters (TexturePacker multi-atlas JSON)
    this.load.multiatlas("player_knight", `${spritesBase}knight.json`, spritesBase);
    this.load.multiatlas("boss_knight", `${spritesBase}knight.json`, spritesBase);
    // Map boss_ryu to the shared knight atlas so missing sf2ryu assets don't break loading
    this.load.multiatlas("boss_ryu", `${spritesBase}knight.json`, spritesBase);

    // Maps
    this.load.image("map1", `${mapsBase}map1.png`);
    this.load.image("map2", `${mapsBase}map2.jpg`);
    this.load.image("map3", `${mapsBase}map3.png`);

    // Particles
    this.load.image("p_blue", `${spritesBase}particle.png`);

    // Audio
    const audioBase = `${staticBase}assets/audio/`;
    this.load.audio("sfx_sword", `${audioBase}sword.mp3`);
    this.load.audio("sfx_hit", `${audioBase}hit.wav`);
    this.load.audio("sfx_death", `${audioBase}death.wav`);
    this.load.audio("sfx_menu", `${audioBase}menu.mp3`);

    // DOM loader hook (optional)
    const loaderEl = document.getElementById("battle-loader");
    const barEl = document.getElementById("battle-loader-bar");
    const textEl = document.getElementById("battle-loader-text");
    if (loaderEl && barEl) {
      loaderEl.style.display = "grid";
      loaderEl.style.opacity = "1";
      barEl.style.width = "0%";
      if (textEl) textEl.textContent = "Loading...";
      this.load.on("progress", (v) => {
        const pct = Math.round(v * 100);
        barEl.style.width = `${pct}%`;
        if (textEl) textEl.textContent = `Loading... ${pct}%`;
      });
      // Log each file complete for easier debugging of missing assets
      this.load.on("filecomplete", (key, type, data) => {
        try {
          console.log("[Boot] filecomplete:", key, type);
        } catch (e) {}
      });
      // Keep existing loaderror handler but also surface a message
      this.load.on("loaderror", (file) => {
        if (textEl) textEl.textContent = `Load error: ${file?.key || file?.src || "unknown"}`;
      });
      this.load.once("complete", () => {
        if (textEl) textEl.textContent = "Starting...";
      });
    }
  }

  create() {
    window.__BATTLE_BOOT_DONE = true;
    // Helper: build frame name list and keep only frames that exist in the loaded texture atlas.
    const existingFrames = (texKey, prefix, start, end, zeroPad = 4) => {
      const out = [];
      const tex = this.textures && this.textures.get ? this.textures.get(texKey) : null;
      for (let i = start; i <= end; i++) {
        const num = String(i).padStart(zeroPad, "0");
        const name = `${prefix}${num}`;
        try {
          if (tex && tex.frames && Object.prototype.hasOwnProperty.call(tex.frames, name)) {
            out.push({ key: texKey, frame: name });
          } else {
            console.warn(`[Boot] Missing frame in atlas ${texKey}: ${name}`);
          }
        } catch (e) {
          console.error('[Boot] Error checking frame existence:', e);
        }
      }
      return out;
    };
    // Knight anims
    const k = "player_knight";
    if (this.textures && this.textures.exists && this.textures.exists(k)) {
      try {
        const frames = existingFrames(k, 'idle/frame', 0, 5, 4);
        if (frames.length) {
          this.anims.create({ key: 'knight_idle', frames, frameRate: 12, repeat: -1 });
        } else {
          console.warn('[Boot] No valid idle frames found for', k);
        }
      } catch (e) {
        console.error('[Boot] Failed to create knight animations:', e);
      }
    } else {
      console.error('[Boot] Missing texture atlas:', k);
    }
    // The rest of the knight animations attempt creation under the same guard.
    if (this.textures && this.textures.exists && this.textures.exists(k)) {
      try {
        const atk = existingFrames(k, 'attack_A/frame', 0, 13, 4);
        if (atk.length) this.anims.create({ key: 'knight_attack', frames: atk, frameRate: 18, repeat: 0 });

        const skl = existingFrames(k, 'attack_C/frame', 0, 13, 4);
        if (skl.length) this.anims.create({ key: 'knight_skill', frames: skl, frameRate: 18, repeat: 0 });

        const hit = existingFrames(k, 'get_hit/frame', 0, 4, 4);
        if (hit.length) this.anims.create({ key: 'knight_hit', frames: hit, frameRate: 14, repeat: 0 });

        const blk = existingFrames(k, 'guard/frame', 0, 5, 4);
        if (blk.length) this.anims.create({ key: 'knight_block', frames: blk, frameRate: 12, repeat: -1 });

        const run = existingFrames(k, 'run/frame', 0, 7, 4);
        if (run.length) this.anims.create({ key: 'knight_run', frames: run, frameRate: 14, repeat: -1 });

        const jump = [
          ...existingFrames(k, 'jump_start/frame', 0, 3, 4),
          ...existingFrames(k, 'jump_loop/frame', 0, 1, 4),
          ...existingFrames(k, 'fall_loop/frame', 0, 1, 4),
        ];
        if (jump.length) this.anims.create({ key: 'knight_jump', frames: jump, frameRate: 14, repeat: 0 });

        const die = existingFrames(k, 'die/frame', 0, 9, 4);
        if (die.length) this.anims.create({ key: 'knight_die', frames: die, frameRate: 12, repeat: 0 });
      } catch (e) {
        console.error('[Boot] Knight animation creation failed:', e);
      }
    }

    // Ryu anims (minimal set)
    const r = "boss_ryu";
    if (this.textures && this.textures.exists && this.textures.exists(r)) {
      try {
        // build arrays of existing named frames for ryu
        const ids = ['frame_00','frame_01','frame_02','frame_03'].map(f=> ({ key: r, frame: f })).filter(fr => {
          const tex = this.textures.get(r);
          return tex && tex.frames && Object.prototype.hasOwnProperty.call(tex.frames, fr.frame);
        });
        if (ids.length) this.anims.create({ key: 'ryu_idle', frames: ids, frameRate: 8, repeat: -1 });

        const atkNames = ['frame_04','frame_05','frame_06','frame_07','frame_08'].map(f=>({ key: r, frame: f })).filter(fr => {
          const tex = this.textures.get(r);
          return tex && tex.frames && Object.prototype.hasOwnProperty.call(tex.frames, fr.frame);
        });
        if (atkNames.length) this.anims.create({ key: 'ryu_attack', frames: atkNames, frameRate: 14, repeat: 0 });

        const hitName = { key: r, frame: 'frame_15' };
        const texR = this.textures.get(r);
        if (texR && texR.frames && Object.prototype.hasOwnProperty.call(texR.frames, hitName.frame)) {
          this.anims.create({ key: 'ryu_hit', frames: [hitName], frameRate: 1, repeat: 0 });
        }

        const dieNames = ['frame_16','frame_15','frame_14','frame_13'].map(f=>({ key: r, frame: f })).filter(fr => {
          const tex = this.textures.get(r);
          return tex && tex.frames && Object.prototype.hasOwnProperty.call(tex.frames, fr.frame);
        });
        if (dieNames.length) this.anims.create({ key: 'ryu_die', frames: dieNames, frameRate: 8, repeat: 0 });
      } catch (e) {
        console.error('[Boot] Ryu animation creation failed:', e);
      }
    } else {
      console.error('[Boot] Missing texture atlas:', r);
    }

    this.scene.start("MenuScene");
  }
}

window.BootScene = BootScene;
