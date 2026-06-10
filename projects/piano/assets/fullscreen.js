// Fullscreen toggle. Uses the native Fullscreen API when available and always
// toggles the `.fullscreen-active` class so the layout responds even where the
// native API is unavailable (e.g. iOS Safari). DOM-only, no shared state.
export function initFullscreen() {
  const app = document.getElementById("app");
  const btnFs = document.getElementById("btn-fullscreen");
  const btnExit = document.getElementById("btn-exit-fullscreen");
  const hasNativeFs = !!(app.requestFullscreen || app.webkitRequestFullscreen || app.msRequestFullscreen);

  function enterFullscreen() {
    app.classList.add("fullscreen-active");
    if (hasNativeFs) {
      (app.requestFullscreen || app.webkitRequestFullscreen || app.msRequestFullscreen).call(app).catch(() => {});
    }
  }
  function exitFullscreen() {
    app.classList.remove("fullscreen-active");
    if (hasNativeFs && (document.fullscreenElement || document.webkitFullscreenElement)) {
      (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)
        .call(document)
        .catch(() => {});
    }
  }

  btnFs.addEventListener("click", () => {
    if (app.classList.contains("fullscreen-active")) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  });
  btnExit.addEventListener("click", () => exitFullscreen());
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      app.classList.remove("fullscreen-active");
    }
  });
}
