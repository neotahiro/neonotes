import type { WorkspaceNode } from "@/lib/types";

/**
 * The id that links between notes use. It is the id the note was first created with, which is the same on every
 * device (a note first pulled from Drive remembers it in sync.localId).
 */
export const canonicalId = (n: WorkspaceNode): string => n.sync?.localId ?? n.id;

/** Every id a note has been known by: its own, its Drive id, and its original id. */
export function noteAliases(n: WorkspaceNode): string[] {
  return [...new Set([n.id, n.sync?.driveId, n.sync?.localId].filter((x): x is string => Boolean(x)))];
}

/** Finds the note a link points at, whichever of its ids the link was saved with. */
export function findNoteById(nodes: WorkspaceNode[], id: string): WorkspaceNode | undefined {
  return nodes.find((n) => n.kind === "doc" && noteAliases(n).includes(id));
}
