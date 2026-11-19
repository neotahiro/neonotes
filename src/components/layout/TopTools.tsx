"use client";
import { useEffect, useRef, useState } from "react";
import { Focus, Tag, Target, Timer } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { FocusPanel } from "@/components/tools/FocusPanel";
import { GoalPanel } from "@/components/tools/GoalPanel";
import { TagsPanel } from "@/components/tools/TagsPanel";
import { TimerPanel } from "@/components/tools/TimerPanel";
import type { TagCount } from "@/lib/tags";
import type { TimerApi } from "@/hooks/useTimer";
import { formatClock } from "@/lib/timer";
import { cn } from "@/lib/utils";

type Tool = "goal" | "tags" | "focus" | "timer";

interface TopToolsProps {
  hasNote: boolean;
  goal: number | null;
  words: number;
  onGoalChange: (goal: number | null) => void;
  dim: boolean;
  onDimChange: (dim: boolean) => void;
  onStartFocus: () => void;
  timer: TimerApi;
  tags: string[];
  allTags: TagCount[];
  onTagsChange: (tags: string[]) => void;
}

/** The goal, focus and timer buttons in the top bar. Each opens a small panel underneath. */
export function TopTools({ hasNote, goal, words, onGoalChange, dim, onDimChange, onStartFocus, timer, tags, allTags, onTagsChange }: TopToolsProps) {
  const [open, setOpen] = useState<Tool | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Panels close when you click or tap outside them, or press Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (tool: Tool) => setOpen((o) => (o === tool ? null : tool));
  const timing = timer.state.status === "running" || timer.state.status === "paused";

  return (
    <div ref={rootRef} className="flex items-center">
      <IconButton icon={Tag} label="Tags" active={open === "tags"} onClick={() => toggle("tags")} />
      <IconButton icon={Target} label="Writing goal" active={open === "goal"} onClick={() => toggle("goal")} />
      <IconButton icon={Focus} label="Focus mode" active={open === "focus"} onClick={() => toggle("focus")} />
      <div className="flex items-center">
        <IconButton icon={Timer} label="Writing timer" active={open === "timer" || timing} onClick={() => toggle("timer")} />
        {timing && (
          <button
            type="button"
            onClick={() => toggle("timer")}
            className={cn("-ml-1 mr-1 text-xs tabular-nums", timer.state.status === "paused" ? "text-muted" : "text-ink")}
            aria-label={`Timer: ${formatClock(timer.remaining)} left`}
          >
            {formatClock(timer.remaining)}
          </button>
        )}
      </div>

      {open && (
        <div className="absolute right-3 top-full z-30 mt-1 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-line bg-paper p-4 shadow-lg">
          {open === "tags" && <TagsPanel hasNote={hasNote} tags={tags} allTags={allTags} onChange={onTagsChange} />}
          {open === "goal" && <GoalPanel hasNote={hasNote} goal={goal} words={words} onChange={onGoalChange} />}
          {open === "focus" && (
            <FocusPanel
              dim={dim}
              onDimChange={onDimChange}
              disabled={!hasNote}
              onStart={() => { setOpen(null); onStartFocus(); }}
            />
          )}
          {open === "timer" && <TimerPanel timer={timer} />}
        </div>
      )}
    </div>
  );
}
