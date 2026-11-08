import type { SyncInfo, WorkspaceNode } from "@/lib/types";
import { uid } from "@/lib/utils";
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
  /** Called with the name of the conflict copy that was created. */
  onConflict: (copyName: string) => void;
  /** Identifies this browser, so our own earlier saves aren't mistaken for another device's. */
  deviceId: string;
  api: RemoteApi;
}

const CONTENT_BATCH = 4;

/** Brings in whatever changed in Drive. */
export async function pullFromDrive(env: SyncEnv): Promise<void> {
  const remote = await env.api.list();
  const plan = planPull(env.nodes(), remote, env.pending(), env.deviceId);

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

  if (plan.adopt.length) {
    const times = new Map(plan.adopt.map((a) => [a.id, a.modified]));
    env.mutate((prev) =>
      prev.map((n) => (n.sync && times.has(n.id) ? { ...n, sync: { ...n.sync, modified: times.get(n.id)! } } : n)),
    );
  }
  for (const c of plan.conflicts) {
    const node = env.nodes().find((n) => n.id === c.id);
    if (node?.sync) await resolveConflict(env, node);
  }
}

/**
 * Another device changed this note too. Keep the local version as the note, save Drive's version as a
 * separate "conflict copy" (if its text is different), and remember Drive's new time so our save goes through.
 */
export async function resolveConflict(env: SyncEnv, node: WorkspaceNode): Promise<void> {
  const remote = await env.api.get(node.sync!.driveId);
  let copy: WorkspaceNode | null = null;
  if (node.kind === "doc" && remote.content !== node.content) {
    const now = Date.now();
    copy = {
      id: uid(), kind: "doc", parentId: node.parentId, favorite: false, content: remote.content,
      name: `${remote.name || "Untitled"} (conflict copy ${new Date(now).toISOString().slice(0, 10)})`,
      createdAt: now, updatedAt: now,
    };
  }
  env.mutate((prev) => {
    const next = prev.map((n) => (n.id === node.id && n.sync ? { ...n, sync: { ...n.sync, modified: remote.modified } } : n));
    return copy ? [...next, copy] : next;
  });
  if (copy) env.onConflict(copy.name);
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
      let current: WorkspaceNode = n;
      for (let attempt = 0; ; attempt++) {
        const body: Parameters<RemoteApi["update"]>[1] = {
          name, favorite: n.favorite, expectedModified: current.sync!.modified, writer: env.deviceId,
        };
        if (n.parentId !== n.sync.parentId) body.parentDriveId = parentDrive ?? null;
        if (n.kind === "doc") body.content = n.content;
        try {
          const res = await env.api.update(n.sync.driveId, body);
          markSynced(n, res.id, res.modified);
          break;
        } catch (err) {
          if (err instanceof SyncError && err.status === 409 && attempt === 0) {
            await resolveConflict(env, current);
            current = env.nodes().find((x) => x.id === n.id) ?? current;
            if (!current.sync) break;
            continue;
          }
          if (err instanceof SyncError && err.status === 404) {
            // It was removed from Drive behind our back: forget the link so it's created again.
            driveIds.delete(n.id);
            env.mutate((prev) => prev.map((x) => (x.id === n.id ? { ...x, sync: undefined } : x)));
            break;
          }
          throw err;
        }
      }
    } else {
      const res = await env.api.create({
        localId: n.id, kind: n.kind, name, favorite: n.favorite, createdAt: n.createdAt,
        parentDriveId: parentDrive ?? null, content: n.kind === "doc" ? n.content : "",
        writer: env.deviceId,
      });
      driveIds.set(n.id, res.id);
      markSynced(n, res.id, res.modified);
    }
  }
}
