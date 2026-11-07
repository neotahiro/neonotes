import type { WorkspaceNode } from "./types";

/** Oldest first; the id breaks ties so the order is always the same. */
export const byCreated = (a: WorkspaceNode, b: WorkspaceNode) =>
  a.createdAt - b.createdAt || a.id.localeCompare(b.id);

/** The node's own id plus the ids of everything nested inside it. */
export function descendantIds(nodes: WorkspaceNode[], id: string): Set<string> {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (n.parentId && out.has(n.parentId) && !out.has(n.id)) {
        out.add(n.id);
        grew = true;
      }
    }
  }
  return out;
}

export interface FolderOption {
  id: string;
  name: string;
  depth: number;
}

/** Every folder, in display order, with its nesting depth. */
export function folderOptions(nodes: WorkspaceNode[]): FolderOption[] {
  const out: FolderOption[] = [];
  const walk = (parentId: string | null, depth: number) => {
    nodes
      .filter((n) => n.kind === "folder" && n.parentId === parentId)
      .sort(byCreated)
      .forEach((f) => {
        out.push({ id: f.id, name: f.name, depth });
        walk(f.id, depth + 1);
      });
  };
  walk(null, 0);
  return out;
}
