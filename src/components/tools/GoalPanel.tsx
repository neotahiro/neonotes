"use client";
import { useState } from "react";
import { MAX_GOAL } from "@/lib/editor/noteSettings";
import { GoalMeter } from "./GoalMeter";

const PRESETS = [250, 500, 1000, 2000, 5000];

interface GoalPanelProps {
  hasNote: boolean;
  goal: number | null;
  words: number;
  onChange: (goal: number | null) => void;
}

export function GoalPanel({ hasNote, goal, words, onChange }: GoalPanelProps) {
  const [draft, setDraft] = useState(goal ? String(goal) : "");
  const parsed = Number(draft);
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_GOAL;

  if (!hasNote) {
    return <p className="text-sm text-muted">Open a note to set a word goal for it.</p>;
  }

  const apply = (value: number) => {
    setDraft(String(value));
    onChange(value);
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Writing goal</h2>
        <p className="text-xs text-muted">A word target for this note. Your progress shows at the bottom of the page.</p>
      </div>

      {goal && <GoalMeter words={words} goal={goal} wide />}

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => apply(p)}
            className={`h-7 rounded-md border px-2.5 text-xs transition-colors ${goal === p ? "border-accent bg-accent-soft text-accent" : "border-line hover:bg-hover"}`}
          >
            {p.toLocaleString()}
          </button>
        ))}
      </div>

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onChange(parsed);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))}
          inputMode="numeric"
          placeholder="Your own number"
          aria-label="Word goal"
          className="h-9 min-w-0 flex-1 rounded-md border border-line bg-paper px-2.5 text-sm outline-none focus-visible:border-accent"
        />
        <button
          type="submit"
          disabled={!valid}
          className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Set goal
        </button>
      </form>

      {goal && (
        <button
          type="button"
          onClick={() => { setDraft(""); onChange(null); }}
          className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Remove goal
        </button>
      )}
    </div>
  );
}
