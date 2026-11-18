"use client";
import type { NoteRef } from "@/lib/editor/noteLinks";
import { cn } from "@/lib/utils";

interface NoteResultsProps {
  items: NoteRef[];
  active?: number;
  onPick: (note: NoteRef) => void;
}

/** A list of notes to choose from. Used by both the "[[" menu and the toolbar's "Link to note" panel. */
export function NoteResults({ items, active = -1, onPick }: NoteResultsProps) {
  if (items.length === 0) return <p className="px-2.5 py-2 text-sm text-muted">No matching notes.</p>;
  return (
    <ul role="listbox" aria-label="Notes" className="space-y-0.5">
      {items.map((n, i) => (
        <li key={n.id} role="option" aria-selected={i === active}>
          <button
            type="button"
            // Keeps the cursor in the text while you pick.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(n)}
            className={cn("flex w-full flex-col rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-hover", i === active && "bg-hover")}
          >
            <span className="truncate text-sm">{n.name || "Untitled"}</span>
            {n.path && <span className="truncate text-xs text-muted">{n.path}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
