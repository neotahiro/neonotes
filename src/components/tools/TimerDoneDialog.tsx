"use client";
import { useEffect, useRef } from "react";
import type { TimerApi } from "@/hooks/useTimer";
import { describeDuration } from "@/lib/timer";

const FIVE_MIN = 5 * 60_000;

/** Shown when the timer reaches zero, wherever you are in the app. */
export function TimerDoneDialog({ timer }: { timer: TimerApi }) {
  const doneRef = useRef<HTMLButtonElement>(null);
  const open = timer.state.status === "done";

  useEffect(() => {
    if (open) doneRef.current?.focus();
  }, [open]);

  if (!open) return null;
  const length = timer.state.totalMs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="timer-done-title" className="w-full max-w-xs rounded-2xl border border-line bg-paper p-5 text-center shadow-xl">
        <h2 id="timer-done-title" className="font-serif text-2xl">Time’s up</h2>
        <p className="mt-1 text-sm text-muted">Your {describeDuration(length)} of writing is done.</p>
        <div className="mt-4 flex gap-2">
          <button
            ref={doneRef}
            type="button"
            onClick={timer.cancel}
            className="h-9 flex-1 rounded-md bg-accent text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Done
          </button>
          <button type="button" onClick={() => timer.addMs(FIVE_MIN)} className="h-9 flex-1 rounded-md border border-line text-sm transition-colors hover:bg-hover">
            +5 min
          </button>
        </div>
      </div>
    </div>
  );
}
