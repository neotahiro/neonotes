import type { WorkspaceNode } from "@/lib/types";

/**
 * Thin wrapper around the browser's IndexedDB.
 * Two stores: "nodes" (one record per document or folder) and "meta" (small settings).
 */
const DB_NAME = "noenotes";
const DB_VERSION = 1;

export interface StoredWorkspace {
  nodes: WorkspaceNode[];
  activeId: string | null;
  seeded: boolean;
}

export interface PersistBatch {
  put?: WorkspaceNode[];
  remove?: string[];
  meta?: { activeId?: string | null; seeded?: boolean };
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("nodes", { keyPath: "id" });
      req.result.createObjectStore("meta");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb().catch((err) => {
      dbPromise = null; // allow a retry on the next save
      throw err;
    });
  }
  return dbPromise;
}

const wrap = <T,>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export async function loadWorkspace(): Promise<StoredWorkspace> {
  const db = await getDb();
  const tx = db.transaction(["nodes", "meta"], "readonly");
  const [nodes, activeId, seeded] = await Promise.all([
    wrap(tx.objectStore("nodes").getAll()),
    wrap(tx.objectStore("meta").get("activeId")),
    wrap(tx.objectStore("meta").get("seeded")),
  ]);
  return {
    nodes: nodes as WorkspaceNode[],
    activeId: typeof activeId === "string" ? activeId : null,
    seeded: seeded === true,
  };
}

/** Writes everything in one transaction: either all of it is saved or none of it. */
export async function persist(batch: PersistBatch): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["nodes", "meta"], "readwrite");
  const nodes = tx.objectStore("nodes");
  const meta = tx.objectStore("meta");

  batch.put?.forEach((n) => nodes.put(n));
  batch.remove?.forEach((id) => nodes.delete(id));
  if (batch.meta && "activeId" in batch.meta) meta.put(batch.meta.activeId ?? null, "activeId");
  if (batch.meta?.seeded !== undefined) meta.put(batch.meta.seeded, "seeded");

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
