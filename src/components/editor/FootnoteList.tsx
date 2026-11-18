"use client";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { collectFootnotes } from "@/lib/editor/annotations";

/** The footnotes, numbered, at the bottom of the note. Click one to edit it. */
export function FootnoteList({ editor, onOpen }: { editor: Editor; onOpen: (id: string) => void }) {
  const notes = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? collectFootnotes(e.state.doc).map(({ id, text }) => ({ id, text })) : []),
  });
  if (!notes || notes.length === 0) return null;
  return (
    <section aria-label="Footnotes" className="footnote-list mt-10 border-t border-line pt-4 text-muted">
      <ol className="space-y-1.5">
        {notes.map((f, i) => (
          <li key={f.id} className="flex gap-2">
            <span className="tabular-nums text-accent">{i + 1}.</span>
            <button type="button" onClick={() => onOpen(f.id)} className="min-w-0 break-words text-left transition-colors hover:text-ink">
              {f.text || <em>Empty footnote</em>}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
