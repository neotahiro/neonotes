"use client";
import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { collectFootnotes, setFootnoteText } from "@/lib/editor/annotations";
import { MAX_FOOTNOTE_LENGTH } from "@/lib/editor/footnoteExtension";

interface FootnotePanelProps {
  editor: Editor;
  id: string;
  onDone: () => void;
}

/** Write or change one footnote. Its number comes from where it sits in the note. */
export function FootnotePanel({ editor, id, onDone }: FootnotePanelProps) {
  const footnotes = collectFootnotes(editor.state.doc);
  const index = footnotes.findIndex((f) => f.id === id);
  const [text, setText] = useState(footnotes[index]?.text ?? "");

  // If the marker was deleted from the text, there is nothing left to edit.
  useEffect(() => {
    if (index === -1) onDone();
  }, [index, onDone]);

  const change = (value: string) => {
    setText(value);
    if (!setFootnoteText(editor, id, value)) onDone();
  };

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium">Footnote {index >= 0 ? index + 1 : ""}</h2>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => change(e.target.value)}
        maxLength={MAX_FOOTNOTE_LENGTH}
        rows={3}
        placeholder="Write the footnote here"
        aria-label="Footnote text"
        className="w-full resize-y rounded-md border border-line bg-paper px-2.5 py-2 text-sm outline-none focus-visible:border-accent"
      />
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => { setFootnoteText(editor, id, null); onDone(); }}
          className="h-8 rounded-md px-2.5 text-xs text-red-600 transition-colors hover:bg-hover dark:text-red-400"
        >
          Delete footnote
        </button>
        <button
          type="button"
          onClick={() => { editor.chain().focus().run(); onDone(); }}
          className="h-8 rounded-md bg-accent px-3 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Done
        </button>
      </div>
    </div>
  );
}
