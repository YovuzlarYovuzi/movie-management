(function () {
  const root = document.documentElement;
  const loader = document.getElementById("page-loader");
  if (!loader) return;

  const shouldShow = root.classList.contains("show-loader");
  if (!shouldShow) {
    loader.remove();
    return;
  }

  loader.setAttribute("aria-hidden", "false");

  const minVisibleMs = 1100;
  const start = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  let finished = false;

  function done() {
    if (finished) return;
    finished = true;

    const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const elapsed = now - start;
    const delay = Math.max(0, minVisibleMs - elapsed);

    window.setTimeout(() => {
      loader.classList.add("is-done");
      root.classList.remove("show-loader");
      try {
        sessionStorage.setItem("aniloader_shown", "1");
      } catch (e) {}

      window.setTimeout(() => {
        loader.remove();
      }, 650);
    }, delay);
  }

  if (document.readyState === "complete") {
    done();
  } else {
    window.addEventListener("load", done, { once: true });
  }

  window.setTimeout(done, 6000);
})();

