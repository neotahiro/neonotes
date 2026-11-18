"use client";
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { filterNotes, type NoteRef } from "@/lib/editor/noteLinks";
import { NoteResults } from "./NoteResults";

interface NoteLinkPickerProps {
  editor: Editor;
  notes: NoteRef[];
  currentId: string | null;
  onDone: () => void;
}

/** The toolbar's "Link to note" panel, for when typing "[[" isn't handy (on a phone, say). */
export function NoteLinkPicker({ editor, notes, currentId, onDone }: NoteLinkPickerProps) {
  const [query, setQuery] = useState("");
  const items = filterNotes(notes, query, currentId, 6);

  const pick = (n: NoteRef) => {
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "noteLink", attrs: { id: n.id, label: n.name || "Untitled" } },
        { type: "text", text: " " },
      ])
      .run();
    onDone();
  };

  return (
    <div className="space-y-2">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && items[0]) { e.preventDefault(); pick(items[0]); }
        }}
        placeholder="Search your notes"
        aria-label="Search notes to link to"
        className="h-9 w-full rounded-md border border-line bg-paper px-2.5 text-sm outline-none focus-visible:border-accent"
      />
      <div className="max-h-48 overflow-y-auto">
        <NoteResults items={items} onPick={pick} />
      </div>
    </div>
  );
}
