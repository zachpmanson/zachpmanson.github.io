// Screen Wake Lock — keep the display on during an exercise. The lock can be
// dropped by the browser (tab hidden), so we re-request it on visibility change
// when the app is still active. `isActive` reports whether an exercise is
// running (so we don't grab the lock while idle).
let wakeLock = null;

export async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    }
  } catch (e) {
    /* ignore */
  }
}

export function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

export function initWakeLock({ isActive }) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isActive()) requestWakeLock();
  });
}
