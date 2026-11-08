"use client";
import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { Toolbar } from "./Toolbar";

interface EditorProps {
  /** Each time this number changes, the cursor moves into the text. */
  focusSignal: number;
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (html: string) => void;
}

export function Editor({ focusSignal, title, content, onTitleChange, onContentChange }: EditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    content,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
      Placeholder.configure({ placeholder: "Start writing…" }),
      CharacterCount,
    ],
    editorProps: { attributes: { class: "editor-prose", "aria-label": "Document body" } },
    onUpdate: ({ editor: e }) => onContentChange(e.getHTML()),
  });

  const handledSignal = useRef(focusSignal);
  useEffect(() => {
    if (editor && focusSignal !== handledSignal.current) {
      handledSignal.current = focusSignal;
      editor.commands.focus("start");
    }
  }, [editor, focusSignal]);

  const words = useEditorState({
    editor,
    selector: ({ editor: e }) => e?.storage.characterCount.words() ?? 0,
  });

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {editor && <Toolbar editor={editor} />}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[42rem] px-5 pb-32 pt-10 sm:px-8 sm:pt-14">
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); editor?.commands.focus("start"); }
            }}
            placeholder="Untitled"
            aria-label="Document title"
            className="mb-6 w-full bg-transparent font-serif text-4xl font-semibold tracking-tight outline-none placeholder:text-muted"
          />
          <EditorContent editor={editor} />
        </div>
      </div>
      <footer className="flex h-8 shrink-0 items-center justify-end border-t border-line px-4 text-xs text-muted">
        {words} {words === 1 ? "word" : "words"} · {Math.max(1, Math.round(words / 230))} min read
      </footer>
    </main>
  );
}
