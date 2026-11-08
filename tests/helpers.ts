import type { SyncEnv } from "../src/lib/sync/engine";
import { SyncError, type RemoteApi } from "../src/lib/sync/remote";
import type { CreateBody, RemoteNode, UpdateBody, WorkspaceNode } from "../src/lib/types";

/** An in-memory stand-in for Google Drive that follows the same rules as our server. */
export class FakeDrive {
  files = new Map<string, { n: RemoteNode; content: string; localId?: string; trashed?: boolean }>();
  seq = 0;
  clock = 1000;
  log: string[] = [];
  /** Next create/update is applied by Drive, but the reply is lost. */
  loseNextReply = false;

  private tick() {
    this.clock += 1000;
    return new Date(this.clock).toISOString();
  }
  live() {
    return [...this.files.values()].filter((f) => !f.trashed);
  }
  byName(name: string) {
    return this.live().find((f) => f.n.name === name)!;
  }

  private doCreate(b: CreateBody) {
    const dup = [...this.files.entries()].find(([, f]) => f.localId === b.localId && !f.trashed);
    if (dup) {
      dup[1].n.name = b.name;
      dup[1].content = b.content;
      dup[1].n.modified = this.tick();
      return { id: dup[0], modified: dup[1].n.modified };
    }
    const id = "D" + ++this.seq;
    const n: RemoteNode = {
      id, kind: b.kind, name: b.name, parentId: b.parentDriveId, favorite: b.favorite,
      createdAt: b.createdAt, modified: this.tick(), writer: b.writer,
    };
    this.files.set(id, { localId: b.localId, content: b.content, n });
    return { id, modified: n.modified };
  }

  private doUpdate(id: string, b: UpdateBody) {
    const f = this.files.get(id);
    if (!f || f.trashed) throw new SyncError("server", 404);
    if (b.expectedModified !== undefined && f.n.modified !== b.expectedModified && f.n.writer !== b.writer) {
      throw new SyncError("server", 409);
    }
    this.log.push("update " + f.n.name + (b.trashed ? " (trash)" : ""));
    if (b.trashed) f.trashed = true;
    if (b.name !== undefined) f.n.name = b.name;
    if (b.favorite !== undefined) f.n.favorite = b.favorite;
    if (b.parentDriveId !== undefined) f.n.parentId = b.parentDriveId;
    if (b.content !== undefined) f.content = b.content;
    if (b.writer) f.n.writer = b.writer;
    f.n.modified = this.tick();
    return { id, modified: f.n.modified };
  }

  api: RemoteApi = {
    list: async () => this.live().map((f) => ({ ...f.n })),
    content: async (id) => this.files.get(id)!.content,
    get: async (id) => {
      const f = this.files.get(id);
      if (!f || f.trashed) throw new SyncError("server", 404);
      return { name: f.n.name, modified: f.n.modified, content: f.content };
    },
    create: async (b) => {
      this.log.push("create " + b.name);
      const res = this.doCreate(b);
      if (this.loseNextReply) {
        this.loseNextReply = false;
        throw new SyncError("offline");
      }
      return res;
    },
    update: async (id, b) => {
      const res = this.doUpdate(id, b);
      if (this.loseNextReply) {
        this.loseNextReply = false;
        throw new SyncError("offline");
      }
      return res;
    },
  };
}

/** One browser: its own local notes, delete queue and device id. */
export function device(drive: FakeDrive, deviceId: string, initial: WorkspaceNode[] = []) {
  const state = { nodes: initial, pending: [] as string[], refreshed: [] as string[], conflicts: [] as string[] };
  const env: SyncEnv = {
    nodes: () => state.nodes,
    pending: () => state.pending,
    mutate: (fn) => { state.nodes = fn(state.nodes); },
    mutatePending: (fn) => { state.pending = fn(state.pending); },
    onRefreshed: (id) => state.refreshed.push(id),
    onConflict: (name) => state.conflicts.push(name),
    deviceId,
    api: drive.api,
  };
  return { env, state };
}

let clock = 5000;
export const mk = (id: string, kind: "doc" | "folder", parentId: string | null, name: string, content = ""): WorkspaceNode =>
  ({ id, kind, name, parentId, favorite: false, content, createdAt: ++clock, updatedAt: ++clock });

export const edit = (d: ReturnType<typeof device>, id: string, patch: Partial<WorkspaceNode>) => {
  d.state.nodes = d.state.nodes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: ++clock } : n));
};
