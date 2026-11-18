"use client";

interface FocusPanelProps {
  dim: boolean;
  onDimChange: (dim: boolean) => void;
  onStart: () => void;
  disabled: boolean;
}

export function FocusPanel({ dim, onDimChange, onStart, disabled }: FocusPanelProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Focus mode</h2>
        <p className="text-xs text-muted">
          Hides the sidebar, top bar, toolbar and counters so only your writing is left. Press Esc, or tap the small button in the corner, to come back.
        </p>
      </div>
      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
        <span>
          Dim other paragraphs
          <span className="block text-xs text-muted">Only the paragraph you’re in stays bright.</span>
        </span>
        <input type="checkbox" checked={dim} onChange={(e) => onDimChange(e.target.checked)} className="h-4 w-4 shrink-0 accent-accent" />
      </label>
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className="h-9 w-full rounded-md bg-accent text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {disabled ? "Open a note first" : "Start focus mode"}
      </button>
    </div>
  );
}
