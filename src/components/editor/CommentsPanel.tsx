"use client";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { collectComments, deleteComment, updateComment, type CommentInfo } from "@/lib/editor/annotations";
import { MAX_COMMENT_LENGTH } from "@/lib/editor/commentExtension";
import { cn, uid } from "@/lib/utils";

const small = "h-7 rounded-md px-2 text-xs text-muted transition-colors hover:bg-hover hover:text-ink";

function shorten(text: string, max = 90): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function Card({ editor, comment, active }: { editor: Editor; comment: CommentInfo; active: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  const jump = () => editor.chain().focus().setTextSelection({ from: comment.from, to: comment.to }).scrollIntoView().run();
  const date = comment.created ? new Date(comment.created).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

  return (
    <div ref={ref} className={cn("rounded-lg border p-2.5", active ? "border-accent" : "border-line", comment.resolved && "opacity-70")}>
      <button type="button" onClick={jump} className="mb-1.5 block w-full border-l-2 border-amber-500 pl-2 text-left text-xs text-muted hover:text-ink">
        {shorten(comment.quote)}
      </button>
      {editing ? (
        <div className="space-y-1.5">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_COMMENT_LENGTH}
            rows={3}
            aria-label="Comment text"
            className="w-full resize-y rounded-md border border-line bg-paper px-2 py-1.5 text-sm outline-none focus-visible:border-accent"
          />
          <div className="flex justify-end gap-1">
            <button type="button" className={small} onClick={() => { setDraft(comment.text); setEditing(false); }}>Cancel</button>
            <button
              type="button"
              disabled={!draft.trim()}
              className="h-7 rounded-md bg-accent px-2.5 text-xs font-medium text-paper disabled:opacity-40"
              onClick={() => { updateComment(editor, comment.id, { text: draft.trim() }); setEditing(false); }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm">{comment.text}</p>
      )}
      {!editing && (
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted">{date}</span>
          <div className="flex gap-0.5">
            <button type="button" className={small} onClick={() => updateComment(editor, comment.id, { resolved: !comment.resolved })}>
              {comment.resolved ? "Reopen" : "Resolve"}
            </button>
            <button type="button" className={small} onClick={() => { setDraft(comment.text); setEditing(true); }}>Edit</button>
            <button type="button" className={cn(small, "hover:text-red-600")} onClick={() => deleteComment(editor, comment.id)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CommentsPanelProps {
  editor: Editor;
  activeId: string | null;
  onActive: (id: string | null) => void;
}

/** Add a comment to the selected text, and see every comment in the note. */
export function CommentsPanel({ editor, activeId, onActive }: CommentsPanelProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return { comments: [] as CommentInfo[], from: 0, to: 0, quote: "" };
      const { from, to, empty } = e.state.selection;
      return {
        comments: collectComments(e.state.doc),
        from,
        to,
        quote: empty ? "" : e.state.doc.textBetween(from, to, " ", " "),
      };
    },
  });
  const { comments, to, quote } = state ?? { comments: [], to: 0, quote: "" };
  const [draft, setDraft] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  const add = () => {
    const text = draft.trim();
    if (!text || !quote) return;
    const id = `c${uid()}`;
    editor.chain().focus().setMark("comment", { id, text, created: Date.now(), resolved: false }).setTextSelection(to).run();
    setDraft("");
    onActive(id);
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Comments</h2>
        <p className="text-xs text-muted">Private notes to yourself, attached to words in the text.</p>
      </div>

      {quote ? (
        <div className="space-y-1.5 rounded-lg bg-hover p-2.5">
          <p className="border-l-2 border-amber-500 pl-2 text-xs text-muted">{shorten(quote)}</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_COMMENT_LENGTH}
            rows={2}
            placeholder="Write a comment"
            aria-label="New comment"
            className="w-full resize-y rounded-md border border-line bg-paper px-2 py-1.5 text-sm outline-none focus-visible:border-accent"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={add}
              className="h-8 rounded-md bg-accent px-3 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Comment
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-lg bg-hover px-2.5 py-2 text-xs text-muted">Select some words in the text, then write your comment here.</p>
      )}

      {open.length > 0 && (
        <div className="space-y-2">
          {open.map((c) => <Card key={c.id} editor={editor} comment={c} active={c.id === activeId} />)}
        </div>
      )}
      {comments.length === 0 && <p className="text-xs text-muted">No comments in this note yet.</p>}

      {resolved.length > 0 && (
        <div className="space-y-2">
          <button type="button" className={small} onClick={() => setShowResolved((v) => !v)} aria-expanded={showResolved}>
            {showResolved ? "Hide" : "Show"} resolved ({resolved.length})
          </button>
          {showResolved && resolved.map((c) => <Card key={c.id} editor={editor} comment={c} active={c.id === activeId} />)}
        </div>
      )}
    </div>
  );
}
