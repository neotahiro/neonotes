"use client";
import { Minimize2 } from "lucide-react";
import type { TimerApi } from "@/hooks/useTimer";
import { formatClock } from "@/lib/timer";
import { GoalMeter } from "./GoalMeter";

interface FocusBarProps {
  onExit: () => void;
  timer: TimerApi;
  goal: number | null;
  words: number;
}

/** The only thing on screen besides the writing while focus mode is on. */
export function FocusBar({ onExit, timer, goal, words }: FocusBarProps) {
  const timing = timer.state.status === "running" || timer.state.status === "paused";
  return (
    <div className="fixed right-3 top-3 z-30 flex items-center gap-3 rounded-full border border-line bg-paper/90 py-1 pl-3 pr-1 text-xs text-muted opacity-60 shadow-sm backdrop-blur transition-opacity hover:opacity-100 focus-within:opacity-100">
      {goal && <GoalMeter words={words} goal={goal} />}
      {timing && <span className="tabular-nums text-ink">{formatClock(timer.remaining)}</span>}
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit focus mode"
        title="Exit focus mode (Esc)"
        className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-hover hover:text-ink"
      >
        <Minimize2 className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
