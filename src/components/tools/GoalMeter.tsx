import { cn } from "@/lib/utils";

/** A small progress bar towards a word goal. */
export function GoalMeter({ words, goal, wide = false, className }: { words: number; goal: number; wide?: boolean; className?: string }) {
  const percent = Math.min(100, Math.round((words / goal) * 100));
  const reached = words >= goal;
  return (
    <div className={cn("flex items-center gap-2", wide && "flex-col items-stretch gap-1.5", className)}>
      <div
        role="progressbar"
        aria-label="Word goal progress"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(words, goal)}
        className={cn("h-1.5 overflow-hidden rounded-full bg-line", wide ? "w-full" : "w-16 sm:w-24")}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
      <span className={cn("whitespace-nowrap tabular-nums", reached && "text-accent")}>
        {reached ? "Goal reached" : `${words.toLocaleString()} / ${goal.toLocaleString()}`}
        {wide && !reached && ` words (${percent}%)`}
        {wide && reached && ` · ${words.toLocaleString()} words`}
      </span>
    </div>
  );
}
