"use client";
import { Tag } from "lucide-react";
import { tagKey } from "@/lib/editor/noteSettings";
import type { TagCount } from "@/lib/tags";
import { cn } from "@/lib/utils";

interface TagListProps {
  tags: TagCount[];
  active: string | null;
  onPick: (tag: string) => void;
}

/** Every tag, as small buttons in the sidebar. */
export function TagList({ tags, active, onPick }: TagListProps) {
  if (tags.length === 0) return null;
  return (
    <section className="mb-3" aria-label="Tags">
      <h2 className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted">
        <Tag className="h-3 w-3" /> Tags
      </h2>
      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto px-2 pb-1 pt-0.5">
        {tags.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => onPick(t.name)}
            aria-pressed={active !== null && tagKey(active) === tagKey(t.name)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs transition-colors",
              active !== null && tagKey(active) === tagKey(t.name) ? "border-accent bg-accent-soft text-accent" : "border-line hover:bg-hover",
            )}
          >
            #{t.name} <span className="text-muted">{t.count}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
