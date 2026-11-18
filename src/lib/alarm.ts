/** Plays three short beeps and vibrates. Needs an AudioContext that was created after a tap, so the browser allows sound. */
export function playAlarm(ctx: AudioContext | null): void {
  try {
    navigator.vibrate?.([300, 120, 300, 120, 500]);
  } catch {
    /* vibration is optional */
  }
  if (!ctx) return;
  try {
    void ctx.resume();
    const start = ctx.currentTime + 0.05;
    [0, 0.45, 0.9].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, start + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.4);
    });
  } catch {
    /* sound is optional */
  }
}
