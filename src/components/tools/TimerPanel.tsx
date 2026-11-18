"use client";
import { useState } from "react";
import type { TimerApi } from "@/hooks/useTimer";
import { cn } from "@/lib/utils";
import { fromMs, toMs, formatClock } from "@/lib/timer";
import { WheelPicker } from "./WheelPicker";

const PRESETS = [5, 10, 15, 25, 45];
const MIN = 60_000;

const button = "h-9 flex-1 rounded-md border border-line text-sm transition-colors hover:bg-hover";

export function TimerPanel({ timer }: { timer: TimerApi }) {
  const { state, remaining } = timer;
  const initial = fromMs(timer.lastMs);
  const [hours, setHours] = useState(initial.hours);
  const [minutes, setMinutes] = useState(initial.minutes);
  const [seconds, setSeconds] = useState(initial.seconds);
  const total = toMs(hours, minutes, seconds);

  if (state.status === "running" || state.status === "paused") {
    const percent = state.totalMs > 0 ? Math.min(100, Math.max(0, (1 - remaining / state.totalMs) * 100)) : 0;
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-medium">Writing timer</h2>
          <p className="text-xs text-muted">{state.status === "paused" ? "Paused" : "Keep writing until it reaches zero."}</p>
        </div>
        <p className={cn("text-center text-5xl font-semibold tabular-nums", state.status === "paused" && "text-muted")} aria-live="off">
          {formatClock(remaining)}
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex gap-2">
          {state.status === "running" ? (
            <button type="button" className={button} onClick={timer.pause}>Pause</button>
          ) : (
            <button type="button" className={cn(button, "border-transparent bg-accent font-medium text-paper hover:bg-accent hover:opacity-90")} onClick={timer.resume}>Resume</button>
          )}
          <button type="button" className={button} onClick={() => timer.addMs(MIN)}>+1 min</button>
          <button type="button" className={button} onClick={timer.cancel}>Cancel</button>
        </div>
      </div>
    );
  }

  const setAll = (ms: number) => {
    const t = fromMs(ms);
    setHours(t.hours);
    setMinutes(t.minutes);
    setSeconds(t.seconds);
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Writing timer</h2>
        <p className="text-xs text-muted">Set a time and write until it reaches zero.</p>
      </div>
      <div className="flex items-start justify-center gap-1">
        <WheelPicker label="hours" max={23} value={hours} onChange={setHours} />
        <WheelPicker label="minutes" max={59} value={minutes} onChange={setMinutes} />
        <WheelPicker label="seconds" max={59} value={seconds} onChange={setSeconds} />
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAll(p * MIN)}
            className={cn("h-7 rounded-md border px-2.5 text-xs transition-colors", total === p * MIN ? "border-accent bg-accent-soft text-accent" : "border-line hover:bg-hover")}
          >
            {p} min
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={total === 0}
        onClick={() => timer.start(total)}
        className="h-9 w-full rounded-md bg-accent text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Start
      </button>
    </div>
  );
}
