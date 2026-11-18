/** Writing timer rules. Times are saved as clock timestamps, so the timer stays right when the app is in the background. */
export type TimerStatus = "idle" | "running" | "paused" | "done";

export interface TimerState {
  status: TimerStatus;
  /** The length that was set, for showing progress. */
  totalMs: number;
  /** When the timer reaches zero (while running). */
  endsAt: number;
  /** How much was left when it was paused. */
  pausedLeft: number;
}

export const IDLE: TimerState = { status: "idle", totalMs: 0, endsAt: 0, pausedLeft: 0 };
export const MAX_TIMER_MS = ((23 * 60 + 59) * 60 + 59) * 1000;
export const DEFAULT_TIMER_MS = 25 * 60 * 1000;

const clamp = (ms: number) => Math.min(MAX_TIMER_MS, Math.max(0, Math.round(ms)));

export function startTimer(ms: number, now: number): TimerState {
  const total = clamp(ms);
  return total === 0 ? IDLE : { status: "running", totalMs: total, endsAt: now + total, pausedLeft: 0 };
}

export function pauseTimer(s: TimerState, now: number): TimerState {
  return s.status === "running" ? { ...s, status: "paused", pausedLeft: Math.max(0, s.endsAt - now) } : s;
}

export function resumeTimer(s: TimerState, now: number): TimerState {
  return s.status === "paused" ? { ...s, status: "running", endsAt: now + s.pausedLeft } : s;
}

/** Adds time to a running or paused timer, or starts a new one if the last one has finished. */
export function addTime(s: TimerState, ms: number, now: number): TimerState {
  if (s.status === "running") return { ...s, endsAt: s.endsAt + ms, totalMs: s.totalMs + ms };
  if (s.status === "paused") return { ...s, pausedLeft: s.pausedLeft + ms, totalMs: s.totalMs + ms };
  return startTimer(ms, now);
}

/** Marks a running timer as done once its time has passed. */
export function tickTimer(s: TimerState, now: number): TimerState {
  return s.status === "running" && now >= s.endsAt ? { ...s, status: "done" } : s;
}

export function remainingMs(s: TimerState, now: number): number {
  if (s.status === "running") return Math.max(0, s.endsAt - now);
  if (s.status === "paused") return s.pausedLeft;
  return 0;
}

/** Reads a saved timer back, ignoring anything that doesn't look right. */
export function loadTimer(raw: string | null, now: number): TimerState {
  if (!raw) return IDLE;
  try {
    const v = JSON.parse(raw) as Partial<TimerState>;
    const ok = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0;
    if (!["running", "paused", "done"].includes(v.status as string) || !ok(v.totalMs) || !ok(v.endsAt) || !ok(v.pausedLeft)) return IDLE;
    return tickTimer(v as TimerState, now);
  } catch {
    return IDLE;
  }
}

export function toMs(hours: number, minutes: number, seconds: number): number {
  return clamp(((hours * 60 + minutes) * 60 + seconds) * 1000);
}

export function fromMs(ms: number): { hours: number; minutes: number; seconds: number } {
  const total = Math.round(clamp(ms) / 1000);
  return { hours: Math.floor(total / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 };
}

/** "24:59", or "1:05:00" when an hour or more is left. Rounds up so it never shows 0:00 early. */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/** "25 minutes", "1 hour 30 minutes", "45 seconds". */
export function describeDuration(ms: number): string {
  const { hours, minutes, seconds } = fromMs(ms);
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  const parts = [hours && part(hours, "hour"), minutes && part(minutes, "minute"), !hours && !minutes && seconds && part(seconds, "second")];
  return parts.filter(Boolean).join(" ") || "0 seconds";
}
