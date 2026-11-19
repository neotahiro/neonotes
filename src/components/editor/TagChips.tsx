"use client";

/** The note's tags, shown under its title. Clicking one lists every note with that tag. */
export function TagChips({ tags, onTagClick }: { tags: string[]; onTagClick?: (tag: string) => void }) {
  if (tags.length === 0) return null;
  return (
    <ul aria-label="Tags" className="-mt-3 mb-5 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <li key={t}>
          <button
            type="button"
            onClick={() => onTagClick?.(t)}
            title={`Show all notes tagged ${t}`}
            className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent transition-opacity hover:opacity-80"
          >
            #{t}
          </button>
        </li>
      ))}
    </ul>
  );
}
