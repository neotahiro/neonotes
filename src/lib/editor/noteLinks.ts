import type { Editor } from "@tiptap/core";

/** What the editor needs to know about each note in order to link to it. */
export interface NoteRef {
  id: string;
  name: string;
  /** The folders it sits in, for telling same-named notes apart. */
  path: string;
}

/** Picks the notes that match what was typed. Titles that start with it come first, then titles that contain it. */
export function filterNotes(notes: NoteRef[], query: string, excludeId: string | null, limit = 8): NoteRef[] {
  const q = query.trim().toLowerCase();
  const pool = notes.filter((n) => n.id !== excludeId);
  const byName = (a: NoteRef, b: NoteRef) => (a.name || "Untitled").localeCompare(b.name || "Untitled");
  if (!q) return [...pool].sort(byName).slice(0, limit);
  const starts: NoteRef[] = [];
  const contains: NoteRef[] = [];
  for (const n of pool) {
    const name = (n.name || "Untitled").toLowerCase();
    if (name.startsWith(q)) starts.push(n);
    else if (name.includes(q)) contains.push(n);
  }
  return [...starts.sort(byName), ...contains.sort(byName)].slice(0, limit);
}

/**
 * Makes every link in the open note show its target's current title, and marks links whose note no longer exists.
 * This is what lets links survive renames. Returns how many links changed.
 */
export function syncNoteLinkLabels(editor: Editor, notes: NoteRef[]): number {
  const names = new Map(notes.map((n) => [n.id, n.name || "Untitled"]));
  const tr = editor.state.tr;
  let changed = 0;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "noteLink") return;
    const current = names.get(node.attrs.id as string);
    const missing = current === undefined;
    const label = current ?? (node.attrs.label as string);
    if (label !== node.attrs.label || missing !== node.attrs.missing) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, label, missing });
      changed++;
    }
  });
  if (changed) {
    tr.setMeta("addToHistory", false);
    editor.view.dispatch(tr);
  }
  return changed;
}
