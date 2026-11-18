"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize } from "@/lib/editor/fontSizeExtension";
import { Toolbar } from "./Toolbar";
import { countWords } from "@/lib/editor/wordCount";
import { joinSpacing, splitSpacing, type Spacing } from "@/lib/editor/spacing";
import { useViewSettings, WIDTHS, ZOOMS, type PageWidth, type Zoom } from "@/hooks/useViewSettings";
import { cn } from "@/lib/utils";

// Full class names are written out so Tailwind can find them.
const WIDTH_CLASS: Record<PageWidth, string> = {
  narrow: "max-w-[42rem]",
  wide: "max-w-[60rem]",
  full: "max-w-none",
};
const WIDTH_LABEL: Record<PageWidth, string> = { narrow: "Narrow", wide: "Wide", full: "Full width" };

const selectClass =
  "h-6 rounded border border-line bg-paper px-1 text-xs text-ink outline-none focus-visible:border-accent";

interface EditorProps {
  /** Each time this number changes, the cursor moves into the text. */
  focusSignal: number;
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (html: string) => void;
}

export function Editor({ focusSignal, title, content, onTitleChange, onContentChange }: EditorProps) {
  // The note's spacing is saved at the start of its text; split it off before the editor sees the text.
  const [initial] = useState(() => splitSpacing(content));
  const [spacing, setSpacing] = useState<Spacing>(initial.spacing);
  const spacingRef = useRef(spacing);

  const editor = useEditor({
    immediatelyRender: false,
    content: initial.html,
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
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    editorProps: { attributes: { class: "editor-prose", "aria-label": "Document body" } },
    onUpdate: ({ editor: e }) => onContentChange(joinSpacing(e.getHTML(), spacingRef.current)),
  });

  const changeSpacing = (next: Spacing) => {
    spacingRef.current = next;
    setSpacing(next);
    if (editor) onContentChange(joinSpacing(editor.getHTML(), next));
  };

  const handledSignal = useRef(focusSignal);
  useEffect(() => {
    if (editor && focusSignal !== handledSignal.current) {
      handledSignal.current = focusSignal;
      editor.commands.focus("start");
    }
  }, [editor, focusSignal]);

  const view = useViewSettings();

  const counts = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return { total: 0, selected: 0 };
      const { from, to, empty } = e.state.selection;
      return {
        total: e.storage.characterCount.words() as number,
        selected: empty ? 0 : countWords(e.state.doc.textBetween(from, to, " ", " ")),
      };
    },
  });
  const { total, selected } = counts ?? { total: 0, selected: 0 };

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-y-auto" style={{
            "--zoom": view.zoom / 100,
            "--lh": spacing.lineHeight,
            "--ps": `${spacing.paragraph}em`,
            "--ws": `${spacing.word}em`,
          } as CSSProperties}>
          <div className={cn("mx-auto w-full px-5 pb-32 pt-10 sm:px-8 sm:pt-14", WIDTH_CLASS[view.width])}>
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); editor?.commands.focus("start"); }
              }}
              placeholder="Untitled"
              aria-label="Document title"
              className="note-title mb-6 w-full bg-transparent font-serif font-semibold tracking-tight outline-none placeholder:text-muted"
            />
            <EditorContent editor={editor} />
          </div>
        </div>
        {editor && <Toolbar editor={editor} spacing={spacing} onSpacingChange={changeSpacing} />}
      </div>
      <footer className="flex h-8 shrink-0 items-center justify-between gap-3 border-t border-line px-4 text-xs text-muted">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5">
            Zoom
            <select
              className={selectClass}
              value={view.zoom}
              onChange={(e) => view.update({ zoom: Number(e.target.value) as Zoom })}
            >
              {ZOOMS.map((z) => <option key={z} value={z}>{z}%</option>)}
            </select>
          </label>
          <label className="hidden items-center gap-1.5 sm:flex">
            Width
            <select
              className={selectClass}
              value={view.width}
              onChange={(e) => view.update({ width: e.target.value as PageWidth })}
            >
              {WIDTHS.map((w) => <option key={w} value={w}>{WIDTH_LABEL[w]}</option>)}
            </select>
          </label>
        </div>
        <span>
          {selected > 0 ? `${selected} of ${total}` : total} {total === 1 ? "word" : "words"} · {Math.max(1, Math.round(total / 230))} min read
        </span>
      </footer>
    </main>
  );
}
