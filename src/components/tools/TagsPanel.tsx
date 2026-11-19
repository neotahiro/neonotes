"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { MAX_TAGS, MAX_TAG_LENGTH, cleanTag } from "@/lib/editor/noteSettings";
import { addTag, hasTag, removeTag, type TagCount } from "@/lib/tags";

interface TagsPanelProps {
  hasNote: boolean;
  tags: string[];
  /** Every tag used in any note, to suggest. */
  allTags: TagCount[];
  onChange: (tags: string[]) => void;
}

export function TagsPanel({ hasNote, tags, allTags, onChange }: TagsPanelProps) {
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  if (!hasNote) return <p className="text-sm text-muted">Open a note to give it tags.</p>;

  const full = tags.length >= MAX_TAGS;
  const suggestions = allTags.filter((t) => !hasTag(tags, t.name)).slice(0, 12);

  /** Adds one or several typed tags at once, so a pasted list like "a, b, c" keeps them all. */
  const commit = (parts: string[]) => {
    const typed = parts.map((p) => p.trim()).filter(Boolean);
    if (typed.length === 0) return;
    if (typed.some((p) => !cleanTag(p))) {
      setProblem("Tags can use letters, numbers, spaces, dots, dashes and underscores.");
      return;
    }
    setProblem(null);
    const next = typed.reduce((list, p) => addTag(list, p), tags);
    if (next !== tags) onChange(next);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Tags</h2>
        <p className="text-xs text-muted">Labels for this note. Click a tag in the sidebar to see every note that has it.</p>
      </div>

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags on this note">
          {tags.map((t) => (
            <li key={t} className="flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-2.5 pr-1 text-xs text-accent">
              #{t}
              <button
                type="button"
                onClick={() => onChange(removeTag(tags, t))}
                aria-label={`Remove tag ${t}`}
                className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-accent/20"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="text-xs text-muted">A note can have up to {MAX_TAGS} tags. Remove one to add another.</p>
      ) : (
        <div className="space-y-1">
          <input
            value={draft}
            maxLength={MAX_TAG_LENGTH + 10}
            onChange={(e) => {
              const value = e.target.value;
              if (value.includes(",")) {
                const parts = value.split(",");
                const rest = parts[parts.length - 1];
                commit(parts.slice(0, -1));
                setDraft(rest);
              } else {
                setDraft(value);
                setProblem(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit([draft]); }
            }}
            placeholder="Add a tag, then press Enter"
            aria-label="New tag"
            className="h-9 w-full rounded-md border border-line bg-paper px-2.5 text-sm outline-none focus-visible:border-accent"
          />
          {problem && <p className="text-xs text-red-600 dark:text-red-400" role="alert">{problem}</p>}
        </div>
      )}

      {!full && suggestions.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-muted">Tags you already use</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => onChange(addTag(tags, t.name))}
                className="rounded-full border border-line px-2.5 py-0.5 text-xs transition-colors hover:bg-hover"
              >
                + #{t.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
