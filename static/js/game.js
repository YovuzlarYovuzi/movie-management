/* global Phaser, BootScene, MenuScene, BattleScene, UIScene */

(function () {
  const mount = document.getElementById("battle-mount");
  if (!mount) return;

  const width = 1100;
  const height = 560;

  window.__BATTLE_ENV = {
    isMobile: mount.dataset.isMobile === "1",
  };

  function showFatal(message) {
    const loader = document.getElementById("battle-loader");
    const text = document.getElementById("battle-loader-text");
    if (loader) {
      loader.style.display = "grid";
      loader.style.opacity = "1";
    }
    if (text) text.textContent = message || "Game failed to start.";
  }

  showFatal("Engine ishga tushmoqda...");

  window.addEventListener("error", (event) => {
    if (event?.message) showFatal(`Error: ${event.message}`);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const message = reason && typeof reason === "object" && reason.message ? reason.message : String(reason || "unknown");
    showFatal(`Unhandled rejection: ${message}`);
  });

  if (typeof Phaser === "undefined") {
    showFatal("Phaser yuklanmadi.");
    return;
  }

  const config = {
    type: Phaser.AUTO,
    parent: "battle-mount",
    width,
    height,
    backgroundColor: "#05060a",
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, BattleScene, UIScene],
  };

  try {
    const game = new Phaser.Game(config);

    setTimeout(() => {
      if (window.__BATTLE_MENU_READY) return;

      let activeScenes = "unknown";
      try {
        activeScenes = game.scene.getScenes(true).map((scene) => scene.scene.key).join(", ") || "none";
      } catch (error) {
        activeScenes = "unknown";
      }
      showFatal(`Menyu ochilmadi. Active scenes: ${activeScenes}`);
    }, 3500);
  } catch (error) {
    showFatal(`Error: ${error?.message || "failed to start"}`);
  }
})();
