import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";

export interface FootnoteInfo {
  id: string;
  text: string;
  pos: number;
}

export interface CommentInfo {
  id: string;
  text: string;
  created: number;
  resolved: boolean;
  /** The words the comment is attached to. */
  quote: string;
  from: number;
  to: number;
}

/** Every footnote in the note, in reading order (which is also their numbering order). */
export function collectFootnotes(doc: PMNode): FootnoteInfo[] {
  const out: FootnoteInfo[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "footnote") out.push({ id: node.attrs.id as string, text: node.attrs.text as string, pos });
  });
  return out;
}

/** Every comment in the note, in reading order. A comment split across several pieces of text is one comment. */
export function collectComments(doc: PMNode): CommentInfo[] {
  const byId = new Map<string, CommentInfo>();
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name !== "comment") continue;
      const id = mark.attrs.id as string;
      const piece = node.text ?? "";
      const existing = byId.get(id);
      if (existing) {
        existing.quote += piece;
        existing.to = pos + node.nodeSize;
      } else {
        byId.set(id, {
          id,
          text: mark.attrs.text as string,
          created: mark.attrs.created as number,
          resolved: mark.attrs.resolved as boolean,
          quote: piece,
          from: pos,
          to: pos + node.nodeSize,
        });
      }
    }
  });
  return [...byId.values()];
}

/** Changes a footnote's words, or removes it (when text is null). The change isn't added to undo history. */
export function setFootnoteText(editor: Editor, id: string, text: string | null): boolean {
  const found = collectFootnotes(editor.state.doc).find((f) => f.id === id);
  if (!found) return false;
  const tr = editor.state.tr;
  if (text === null) tr.delete(found.pos, found.pos + 1);
  else tr.setNodeMarkup(found.pos, undefined, { id, text });
  tr.setMeta("addToHistory", text === null);
  editor.view.dispatch(tr);
  return true;
}

function commentRanges(editor: Editor, id: string) {
  const out: { from: number; to: number; attrs: Record<string, unknown> }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const mark = node.marks.find((m) => m.type.name === "comment" && m.attrs.id === id);
    if (mark) out.push({ from: pos, to: pos + node.nodeSize, attrs: mark.attrs });
  });
  return out;
}

/** Changes a comment's words or resolved state, everywhere it appears. */
export function updateComment(editor: Editor, id: string, patch: { text?: string; resolved?: boolean }): void {
  const type = editor.schema.marks.comment;
  const tr = editor.state.tr;
  for (const r of commentRanges(editor, id)) {
    tr.removeMark(r.from, r.to, type);
    tr.addMark(r.from, r.to, type.create({ ...r.attrs, ...patch }));
  }
  tr.setMeta("addToHistory", false);
  editor.view.dispatch(tr);
}

/** Removes a comment (the text stays; only the comment goes). */
export function deleteComment(editor: Editor, id: string): void {
  const type = editor.schema.marks.comment;
  const tr = editor.state.tr;
  for (const r of commentRanges(editor, id)) {
    const mark = type.create(r.attrs);
    tr.removeMark(r.from, r.to, mark);
  }
  editor.view.dispatch(tr);
}
