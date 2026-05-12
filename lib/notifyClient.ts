// Client-side helpers for surfacing new admin notifications (sound +
// browser notification + page-title flash). Imported by the Sidebar
// which is mounted on every dashboard page, so this runs everywhere.

let cachedAudioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (cachedAudioCtx) return cachedAudioCtx;
  const Ctor: typeof AudioContext | undefined =
    (window as any).AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return null;
  try {
    cachedAudioCtx = new Ctor();
    return cachedAudioCtx;
  } catch {
    return null;
  }
}

/** Short two-tone "ding" — generated, no asset needed. */
export function playNewOrderChime() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  // Some browsers require a user gesture before audio can play. Resume
  // is best-effort; if it fails the chime is silently skipped.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  const tones = [
    { freq: 880, start: 0, dur: 0.18 },
    { freq: 1320, start: 0.16, dur: 0.22 },
  ];
  for (const t of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = t.freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now + t.start);
    gain.gain.exponentialRampToValueAtTime(0.18, now + t.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);
    osc.start(now + t.start);
    osc.stop(now + t.start + t.dur + 0.02);
  }
}

let lastBrowserNotifyAt = 0;
/** Fire a system-level notification (visible even when the tab is hidden).
 *  Silently skips if permission was never granted. */
export function showBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  // Throttle to once per 5s to avoid spam when multiple arrive at once
  const now = Date.now();
  if (now - lastBrowserNotifyAt < 5000) return;
  lastBrowserNotifyAt = now;
  try {
    const n = new Notification(title, { body, icon: "/favicon.ico", tag: "foodspark-new-order" });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // older browsers — silently fall through
  }
}

/** Ask once per page load (no popups elsewhere). Caller decides when. */
export function ensureNotificationPermission() {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

/** Flash the document title until the user focuses the tab again. */
let titleFlashInterval: ReturnType<typeof setInterval> | null = null;
let originalTitle: string | null = null;
export function flashTitle(text: string) {
  if (typeof document === "undefined") return;
  if (originalTitle == null) originalTitle = document.title;
  if (titleFlashInterval) clearInterval(titleFlashInterval);
  let toggled = false;
  titleFlashInterval = setInterval(() => {
    document.title = toggled ? (originalTitle ?? "FoodSpark") : text;
    toggled = !toggled;
  }, 1000);
  const stop = () => {
    if (titleFlashInterval) {
      clearInterval(titleFlashInterval);
      titleFlashInterval = null;
    }
    document.title = originalTitle ?? "FoodSpark";
    originalTitle = null;
    window.removeEventListener("focus", stop);
    document.removeEventListener("visibilitychange", onVisibility);
  };
  const onVisibility = () => { if (!document.hidden) stop(); };
  window.addEventListener("focus", stop, { once: true });
  document.addEventListener("visibilitychange", onVisibility);
}
