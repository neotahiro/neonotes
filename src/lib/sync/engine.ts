import type { SyncInfo, WorkspaceNode } from "@/lib/types";
import { applyPlan, isDirty, planPull } from "./merge";
import { SyncError, type RemoteApi } from "./remote";

/**
 * Everything the engine needs from the outside world. `mutate` must run its callback synchronously.
 */
export interface SyncEnv {
  nodes: () => WorkspaceNode[];
  pending: () => string[];
  mutate: (fn: (prev: WorkspaceNode[]) => WorkspaceNode[]) => void;
  mutatePending: (fn: (prev: string[]) => string[]) => void;
  onRefreshed: (id: string) => void;
  api: RemoteApi;
}

const CONTENT_BATCH = 4;

/** Brings in whatever changed in Drive. */
export async function pullFromDrive(env: SyncEnv): Promise<void> {
  const remote = await env.api.list();
  const plan = planPull(env.nodes(), remote, env.pending());

  const contents = new Map<string, string>();
  const need = plan.items.filter((i) => i.needsContent);
  for (let i = 0; i < need.length; i += CONTENT_BATCH) {
    await Promise.all(
      need.slice(i, i + CONTENT_BATCH).map(async (item) => {
        contents.set(item.node.id, await env.api.content(item.node.sync!.driveId));
      }),
    );
  }

  let refreshed: string[] = [];
  env.mutate((prev) => {
    const result = applyPlan(prev, plan, contents);
    refreshed = result.refreshed;
    return result.nodes;
  });
  refreshed.forEach(env.onRefreshed);
}

/** Sends local changes to Drive: trashes deleted notes, creates new ones, updates changed ones. */
export async function pushToDrive(env: SyncEnv): Promise<void> {
  // 1. Deletions (to the Drive trash, so they can be recovered)
  for (const driveId of [...env.pending()]) {
    try {
      await env.api.update(driveId, { trashed: true });
    } catch (err) {
      if (!(err instanceof SyncError && err.status === 404)) throw err; // already gone is fine
    }
    env.mutatePending((p) => p.filter((x) => x !== driveId));
  }

  // 2. New and changed nodes, parents before children
  const snapshot = env.nodes();
  const byId = new Map(snapshot.map((n) => [n.id, n]));
  const driveIds = new Map<string, string>();
  for (const n of snapshot) if (n.sync) driveIds.set(n.id, n.sync.driveId);

  const depth = (n: WorkspaceNode) => {
    let d = 0;
    for (let cur = n; cur.parentId && byId.has(cur.parentId) && d < 50; d++) cur = byId.get(cur.parentId)!;
    return d;
  };
  const dirty = snapshot.filter(isDirty).sort((a, b) => depth(a) - depth(b) || a.createdAt - b.createdAt);

  const markSynced = (n: WorkspaceNode, driveId: string, modified: string) => {
    const sync: SyncInfo = { driveId, version: n.updatedAt, parentId: n.parentId, modified };
    if (env.nodes().some((x) => x.id === n.id)) {
      env.mutate((prev) => prev.map((x) => (x.id === n.id ? { ...x, sync } : x)));
    } else {
      // Deleted while it was being saved: make sure the Drive copy gets trashed too.
      env.mutatePending((p) => (p.includes(driveId) ? p : [...p, driveId]));
    }
  };

  for (const n of dirty) {
    const parentDrive = n.parentId ? driveIds.get(n.parentId) : null;
    if (n.parentId && !parentDrive) continue; // parent isn't on Drive yet; try again next round
    const name = n.name.trim() || "Untitled";

    if (n.sync) {
      const body: Parameters<RemoteApi["update"]>[1] = { name, favorite: n.favorite };
      if (n.parentId !== n.sync.parentId) body.parentDriveId = parentDrive ?? null;
      if (n.kind === "doc") body.content = n.content;
      try {
        const res = await env.api.update(n.sync.driveId, body);
        markSynced(n, res.id, res.modified);
      } catch (err) {
        if (err instanceof SyncError && err.status === 404) {
          // It was removed from Drive behind our back: forget the link so it's created again.
          driveIds.delete(n.id);
          env.mutate((prev) => prev.map((x) => (x.id === n.id ? { ...x, sync: undefined } : x)));
          continue;
        }
        throw err;
      }
    } else {
      const res = await env.api.create({
        localId: n.id, kind: n.kind, name, favorite: n.favorite, createdAt: n.createdAt,
        parentDriveId: parentDrive ?? null, content: n.kind === "doc" ? n.content : "",
      });
      driveIds.set(n.id, res.id);
      markSynced(n, res.id, res.modified);
    }
  }
}
