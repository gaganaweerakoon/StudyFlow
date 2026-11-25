/**
 * Lightweight Web Audio notification chime & optional browser notification helper.
 * Safe in headless/Node environments and respects browser autoplay policies without throwing.
 */

export function playSessionStartChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const notes = [
      { freq: 587.33, start: 0, duration: 0.24, gain: 0.14 }, // D5
      { freq: 880.0, start: 0.16, duration: 0.42, gain: 0.16 }, // A5
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      gain.gain.setValueAtTime(0.0001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(note.gain, now + note.start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.02);
    }

    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 900);
  } catch {
    // Ignore audio failures when autoplay is blocked or AudioContext is unavailable.
  }
}

export function showBrowserSessionNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch {
    // Ignore notification errors in restricted iframes or unsupported browsers.
  }
}
