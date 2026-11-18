"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Asterisk, FileSymlink, MessageSquarePlus } from "lucide-react";
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
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { FontSize } from "@/lib/editor/fontSizeExtension";
import { NoteLink } from "@/lib/editor/noteLinkExtension";
import { Footnote } from "@/lib/editor/footnoteExtension";
import { Comment } from "@/lib/editor/commentExtension";
import { NoteLinkSuggestion, type NoteLinkSuggestState } from "@/lib/editor/noteLinkSuggestion";
import { syncNoteLinkLabels, type NoteRef } from "@/lib/editor/noteLinks";
import { NoteLinkMenu } from "./NoteLinkMenu";
import { NoteLinkPicker } from "./NoteLinkPicker";
import { FootnotePanel } from "./FootnotePanel";
import { FootnoteList } from "./FootnoteList";
import { CommentsPanel } from "./CommentsPanel";
import { uid } from "@/lib/utils";
import { Toolbar } from "./Toolbar";
import { countWords } from "@/lib/editor/wordCount";
import { joinSettings, splitSettings } from "@/lib/editor/noteSettings";
import type { Spacing } from "@/lib/editor/spacing";
import { ActiveBlock } from "@/lib/editor/activeBlock";
import { GoalMeter } from "@/components/tools/GoalMeter";
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
  /** Focus mode hides everything but the writing. */
  focusMode?: boolean;
  /** In focus mode, fade every paragraph except the one you are in. */
  dimOthers?: boolean;
  /** Reports the total word count whenever it changes. */
  onWordCount?: (words: number) => void;
  /** Every note, so this one can link to them. */
  notes?: NoteRef[];
  /** The id of the note being edited. */
  currentId?: string;
  /** Called when a link to another note is clicked. */
  onOpenNote?: (id: string) => void;
}

export function Editor({ focusSignal, title, content, onTitleChange, onContentChange, focusMode = false, dimOthers = false, onWordCount, notes = [], currentId, onOpenNote }: EditorProps) {
  // The note's settings (spacing, word goal) are saved at the start of its text; split them off before the editor sees the text.
  const [initial] = useState(() => splitSettings(content));
  const { spacing, goal } = splitSettings(content).settings;
  const settingsRef = useRef({ spacing, goal });
  settingsRef.current = { spacing, goal };

  // Links between notes: the "[[" menu, the toolbar panel, and keeping link titles current.
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const openRef = useRef(onOpenNote);
  openRef.current = onOpenNote;
  const keyHandler = useRef<((e: KeyboardEvent) => boolean) | null>(null);
  const registerKeys = useCallback((handler: ((e: KeyboardEvent) => boolean) | null) => { keyHandler.current = handler; }, []);
  const [suggest, setSuggest] = useState<NoteLinkSuggestState | null>(null);
  const [suggestDismissed, setSuggestDismissed] = useState(false);
  const [panel, setPanel] = useState<"notelink" | "footnote" | "comments" | null>(null);
  const [activeFootnote, setActiveFootnote] = useState<string | null>(null);
  const [activeComment, setActiveComment] = useState<string | null>(null);

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
      ActiveBlock,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      NoteLink,
      Footnote,
      Comment,
      NoteLinkSuggestion.configure({
        onChange: (state) => {
          setSuggest(state);
          if (!state) setSuggestDismissed(false);
        },
        onKey: (event) => keyHandler.current?.(event) ?? false,
      }),
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    editorProps: {
      attributes: { class: "editor-prose", "aria-label": "Document body" },
      handleDOMEvents: {
        // Clicking a link to another note opens that note.
        click: (_view, event) => {
          const target = event.target as HTMLElement;
          // Footnote markers and commented words open their panel (and still place the cursor as usual).
          const footnote = target.closest?.("[data-footnote-id]");
          if (footnote) {
            setActiveFootnote(footnote.getAttribute("data-footnote-id"));
            setPanel("footnote");
            return false;
          }
          const comment = target.closest?.("[data-comment-id]:not([data-resolved])");
          if (comment) {
            setActiveComment(comment.getAttribute("data-comment-id"));
            setPanel("comments");
            return false;
          }
          const link = target.closest?.("[data-note-link]");
          if (!link) return false;
          const id = link.getAttribute("data-note-link");
          if (id && !link.hasAttribute("data-missing")) openRef.current?.(id);
          return true;
        },
      },
    },
    onUpdate: ({ editor: e }) => onContentChange(joinSettings(e.getHTML(), settingsRef.current)),
  });

  const toggleFootnote = () => {
    if (!editor) return;
    if (panel === "footnote") { setPanel(null); return; }
    // On an existing marker, edit it. Otherwise add a new one just after the cursor or selection.
    let id: string | null = editor.isActive("footnote") ? (editor.getAttributes("footnote").id as string) : null;
    if (!id) {
      id = uid();
      editor.chain().focus().insertContentAt(editor.state.selection.to, { type: "footnote", attrs: { id, text: "" } }).run();
    }
    setActiveFootnote(id);
    setPanel("footnote");
  };

  const changeSpacing = (next: Spacing) => {
    if (editor) onContentChange(joinSettings(editor.getHTML(), { ...settingsRef.current, spacing: next }));
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

  // Make links show their note's current title (this is what lets them survive renames).
  const noteKey = notes.map((n) => `${n.id}:${n.name}`).join("|");
  useEffect(() => {
    if (editor) syncNoteLinkLabels(editor, notesRef.current);
  }, [editor, noteKey]);

  useEffect(() => {
    onWordCount?.(total);
  }, [total, onWordCount]);

  return (
    <main className={cn("flex min-h-0 flex-1 flex-col", focusMode && dimOthers && "focus-dim")}>
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
            {editor && (
              <FootnoteList
                editor={editor}
                onOpen={(id) => { setActiveFootnote(id); setPanel("footnote"); }}
              />
            )}
          </div>
        </div>
        {editor && !focusMode && (
          <Toolbar
            editor={editor}
            spacing={spacing}
            onSpacingChange={changeSpacing}
            extra={{
              buttons: [
                {
                  id: "notelink",
                  icon: FileSymlink,
                  label: "Link to note",
                  shortcut: "[[",
                  active: panel === "notelink",
                  onClick: () => setPanel((p) => (p === "notelink" ? null : "notelink")),
                },
                { id: "footnote", icon: Asterisk, label: "Footnote", active: panel === "footnote", onClick: toggleFootnote },
                {
                  id: "comments",
                  icon: MessageSquarePlus,
                  label: "Comments",
                  active: panel === "comments",
                  onClick: () => setPanel((p) => (p === "comments" ? null : "comments")),
                },
              ],
              panel:
                panel === "notelink" ? (
                  <NoteLinkPicker editor={editor} notes={notes} currentId={currentId ?? null} onDone={() => setPanel(null)} />
                ) : panel === "footnote" && activeFootnote ? (
                  <FootnotePanel editor={editor} id={activeFootnote} onDone={() => setPanel(null)} />
                ) : panel === "comments" ? (
                  <CommentsPanel editor={editor} activeId={activeComment} onActive={setActiveComment} />
                ) : null,
              onClose: () => setPanel(null),
            }}
          />
        )}
      </div>
      {suggest && !suggestDismissed && (
        <NoteLinkMenu
          state={suggest}
          notes={notes}
          currentId={currentId ?? null}
          registerKeys={registerKeys}
          onDismiss={() => setSuggestDismissed(true)}
        />
      )}
      {!focusMode && (
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
        <div className="flex items-center gap-3">
          {goal !== null && <GoalMeter words={total} goal={goal} />}
          <span>
            {selected > 0 ? `${selected} of ${total}` : total} {total === 1 ? "word" : "words"}
            <span className="hidden sm:inline"> · {Math.max(1, Math.round(total / 230))} min read</span>
          </span>
        </div>
      </footer>
      )}
    </main>
  );
}
