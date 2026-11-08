import type { RemoteNode, WorkspaceNode } from "@/lib/types";

/** True when the node has changes Drive doesn't have yet (or has never been saved to Drive). */
export const isDirty = (n: WorkspaceNode) => !n.sync || n.sync.version !== n.updatedAt;

export interface PullItem {
  node: WorkspaceNode;
  needsContent: boolean;
  /** true when this replaces a node we already had (as opposed to a new one) */
  refresh: boolean;
}

export interface PullPlan {
  items: PullItem[];
  /** Local nodes that were deleted in Drive and have no unsaved changes. */
  removeIds: string[];
  /** Local nodes that vanished from Drive but have unsaved changes: forget the Drive link so they're re-created. */
  dropSync: string[];
  /** Unsaved local changes where Drive moved on after a change from another device: keep both versions. */
  conflicts: { id: string }[];
  /** Unsaved local changes where Drive moved on only because of our own earlier save: just note the new time. */
  adopt: { id: string; modified: string }[];
}

/**
 * Compares what's in Drive with what we have locally.
 * If both sides changed, nothing is thrown away: the local version stays and Drive's version becomes a conflict copy.
 */
export function planPull(
  local: WorkspaceNode[],
  remote: RemoteNode[],
  pendingDeletes: string[],
  deviceId = "",
): PullPlan {
  const pending = new Set(pendingDeletes);
  const remoteIds = new Set(remote.map((r) => r.id));
  const localByDrive = new Map<string, WorkspaceNode>();
  for (const n of local) if (n.sync) localByDrive.set(n.sync.driveId, n);

  const plan: PullPlan = { items: [], removeIds: [], dropSync: [], conflicts: [], adopt: [] };

  for (const n of local) {
    if (n.sync && !remoteIds.has(n.sync.driveId)) (isDirty(n) ? plan.dropSync : plan.removeIds).push(n.id);
  }

  for (const r of remote) {
    if (pending.has(r.id)) continue; // we're about to trash it
    const parentLocal = r.parentId && remoteIds.has(r.parentId) ? (localByDrive.get(r.parentId)?.id ?? r.parentId) : null;
    const existing = localByDrive.get(r.id);

    if (existing) {
      if (existing.sync!.modified === r.modified) continue;
      if (isDirty(existing)) {
        if (deviceId && r.writer === deviceId) plan.adopt.push({ id: existing.id, modified: r.modified });
        else plan.conflicts.push({ id: existing.id });
        continue;
      }
    }

    const version = Date.parse(r.modified);
    plan.items.push({
      refresh: !!existing,
      needsContent: r.kind === "doc",
      node: {
        id: existing?.id ?? r.id,
        kind: r.kind,
        name: r.name,
        parentId: parentLocal,
        favorite: r.favorite,
        content: existing?.content ?? "",
        createdAt: r.createdAt,
        updatedAt: version,
        sync: { driveId: r.id, version, parentId: parentLocal, modified: r.modified },
      },
    });
  }
  return plan;
}

/** Applies a plan to the current nodes. Skips anything that was edited while the plan was being prepared. */
export function applyPlan(
  prev: WorkspaceNode[],
  plan: PullPlan,
  contents: Map<string, string>,
): { nodes: WorkspaceNode[]; refreshed: string[] } {
  const removed = new Set(plan.removeIds);
  const dropped = new Set(plan.dropSync);
  let out = prev
    .filter((n) => !removed.has(n.id) || isDirty(n))
    .map((n) => (dropped.has(n.id) ? { ...n, sync: undefined } : n));
  const refreshed: string[] = [];

  for (const item of plan.items) {
    const fetched = contents.get(item.node.id);
    if (item.needsContent && fetched === undefined) continue;
    const node = item.needsContent ? { ...item.node, content: fetched! } : item.node;
    const cur = out.find((n) => n.id === node.id);
    if (!cur) {
      out = [...out, node];
    } else if (!isDirty(cur)) {
      out = out.map((n) => (n.id === node.id ? node : n));
      refreshed.push(node.id);
    }
  }

  // If something's parent no longer exists, show it at the top level rather than losing it.
  const ids = new Set(out.map((n) => n.id));
  if (out.some((n) => n.parentId && !ids.has(n.parentId))) {
    out = out.map((n) => (n.parentId && !ids.has(n.parentId) ? { ...n, parentId: null } : n));
  }
  return { nodes: out, refreshed };
}
