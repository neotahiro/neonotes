"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { seedNodes } from "@/lib/mock-data";
import { loadWorkspace, persist } from "@/lib/storage/localStore";
import { remoteApi } from "@/lib/sync/remote";
import { byCreated, descendantIds } from "@/lib/tree";
import type { NodeKind, WorkspaceNode } from "@/lib/types";
import { uid } from "@/lib/utils";
import { useDriveSync } from "./useDriveSync";

export type SaveStatus = "loading" | "saving" | "synced" | "offline" | "reauth" | "error";

const SAVE_DELAY_MS = 400;

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

/**
 * Workspace state. Every change is saved to this browser first (IndexedDB), then synced to Google Drive.
 * nodesRef is the source of truth; React state mirrors it for rendering.
 */
export function useWorkspace() {
  const [nodes, setNodes] = useState<WorkspaceNode[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [localStatus, setLocalStatus] = useState<"loading" | "saving" | "saved" | "error">("loading");
  const [revision, setRevision] = useState(0); // bumps when a pull replaces the open document's text
  const [notice, setNotice] = useState<string | null>(null);

  const nodesRef = useRef<WorkspaceNode[]>([]);
  const pendingRef = useRef<string[]>([]);
  const activeRef = useRef<string | null>(null);

  const mutate = useCallback((fn: (prev: WorkspaceNode[]) => WorkspaceNode[]) => {
    const next = fn(nodesRef.current);
    if (next !== nodesRef.current) {
      nodesRef.current = next;
      setNodes(next);
    }
  }, []);
  const mutatePending = useCallback((fn: (prev: string[]) => string[]) => {
    const next = fn(pendingRef.current);
    if (next !== pendingRef.current) {
      pendingRef.current = next;
      setPendingDeletes(next);
    }
  }, []);
  const setActive = useCallback((id: string | null) => {
    activeRef.current = id;
    setActiveId(id);
  }, []);

  // What is already written to local storage, to work out what changed.
  const persisted = useRef(new Map<string, WorkspaceNode>());
  const persistedActive = useRef<string | null>(null);
  const persistedPending = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once on startup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await loadWorkspace();
        if (cancelled) return;
        let list = stored.nodes;
        let active = stored.activeId;
        if (!stored.seeded) {
          if (list.length === 0) {
            // A brand-new browser: if Drive already has notes, don't add the welcome note on top of them.
            let driveHasNotes = false;
            try {
              driveHasNotes = (await withTimeout(remoteApi.list(), 4000)).length > 0;
            } catch {
              /* offline or not connected: seed locally */
            }
            if (!driveHasNotes) {
              list = seedNodes;
              active = seedNodes[0].id;
            }
          }
          await persist({ put: list, meta: { seeded: true, activeId: active } });
        }
        // Older saves have no creation time: use the last-edit time once, and save it.
        const legacy = list.filter((n) => typeof n.createdAt !== "number");
        if (legacy.length) {
          const fixed = legacy.map((n) => ({ ...n, createdAt: n.updatedAt }));
          await persist({ put: fixed });
          list = list.map((n) => fixed.find((f) => f.id === n.id) ?? n);
        }
        list = [...list].sort(byCreated);
        if (cancelled) return;
        if (!list.some((n) => n.id === active && n.kind === "doc")) active = null;
        persisted.current = new Map(list.map((n) => [n.id, n]));
        persistedActive.current = active;
        persistedPending.current = stored.pendingDeletes;
        nodesRef.current = list;
        pendingRef.current = stored.pendingDeletes;
        activeRef.current = active;
        setNodes(list);
        setPendingDeletes(stored.pendingDeletes);
        setActiveId(active);
        setLocalStatus("saved");
      } catch {
        if (cancelled) return;
        // Browser storage unavailable (e.g. private browsing): keep working in memory and rely on Drive.
        nodesRef.current = seedNodes;
        activeRef.current = seedNodes[0].id;
        setNodes(seedNodes);
        setActiveId(seedNodes[0].id);
        setLocalStatus("error");
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasLocalChanges = useCallback(() => {
    const prev = persisted.current;
    const list = nodesRef.current;
    return (
      list.length !== prev.size ||
      list.some((n) => prev.get(n.id) !== n) ||
      activeRef.current !== persistedActive.current ||
      pendingRef.current !== persistedPending.current
    );
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!hasLocalChanges()) {
      setLocalStatus((s) => (s === "error" ? s : "saved"));
      return;
    }
    const prev = persisted.current;
    const snapshot = nodesRef.current;
    const active = activeRef.current;
    const pending = pendingRef.current;
    const ids = new Set(snapshot.map((n) => n.id));
    const put = snapshot.filter((n) => prev.get(n.id) !== n);
    const remove = [...prev.keys()].filter((id) => !ids.has(id));
    const meta: { activeId?: string | null; pendingDeletes?: string[] } = {};
    if (active !== persistedActive.current) meta.activeId = active;
    if (pending !== persistedPending.current) meta.pendingDeletes = pending;
    try {
      await persist({ put, remove, meta });
      put.forEach((n) => prev.set(n.id, n));
      remove.forEach((id) => prev.delete(id));
      persistedActive.current = active;
      persistedPending.current = pending;
      setLocalStatus(hasLocalChanges() ? "saving" : "saved");
    } catch {
      setLocalStatus("error");
    }
  }, [hasLocalChanges]);

  // Save to this browser shortly after any change.
  useEffect(() => {
    if (!ready || !hasLocalChanges()) return;
    setLocalStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  }, [nodes, activeId, pendingDeletes, ready, hasLocalChanges, flush]);

  // ...and immediately when the tab is hidden or closed.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);

  const { driveState, hasWork, syncNow } = useDriveSync({
    ready, nodes, pendingDeletes, nodesRef, pendingRef, mutate, mutatePending,
    onRefreshed: (id) => {
      if (activeRef.current === id) setRevision((r) => r + 1);
    },
    onConflict: (copyName) =>
      setNotice(`Two devices changed the same note. Your version stayed, and the other version was kept as “${copyName}”.`),
  });

  const create = useCallback(
    (kind: NodeKind, parentId: string | null = null) => {
      const now = Date.now();
      const node: WorkspaceNode = {
        id: uid(), kind, parentId, favorite: false, content: "", createdAt: now, updatedAt: now,
        name: kind === "doc" ? "Untitled" : "New folder",
      };
      mutate((prev) => [...prev, node]);
      if (kind === "doc") setActive(node.id);
      return node.id;
    },
    [mutate, setActive],
  );

  const update = useCallback(
    (id: string, patch: Partial<WorkspaceNode>) => {
      mutate((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)));
    },
    [mutate],
  );
  const rename = useCallback((id: string, name: string) => update(id, { name }), [update]);
  const setContent = useCallback((id: string, content: string) => update(id, { content }), [update]);
  const toggleFavorite = useCallback(
    (id: string) => {
      mutate((prev) => prev.map((n) => (n.id === id ? { ...n, favorite: !n.favorite, updatedAt: Date.now() } : n)));
    },
    [mutate],
  );

  const remove = useCallback(
    (id: string) => {
      const list = nodesRef.current;
      const doomed = descendantIds(list, id);
      // Anything already saved to Drive must be trashed there too.
      const driveIds = list.filter((n) => doomed.has(n.id) && n.sync).map((n) => n.sync!.driveId);
      mutate((prev) => prev.filter((n) => !doomed.has(n.id)));
      if (driveIds.length) mutatePending((p) => [...p, ...driveIds]);
      if (activeRef.current && doomed.has(activeRef.current)) setActive(null);
    },
    [mutate, mutatePending, setActive],
  );

  /** Moves a note or folder into another folder (or to the top level). Returns false if not allowed. */
  const move = useCallback(
    (id: string, parentId: string | null) => {
      const list = nodesRef.current;
      const node = list.find((n) => n.id === id);
      if (!node || node.parentId === parentId) return false;
      if (parentId !== null) {
        const target = list.find((n) => n.id === parentId);
        if (!target || target.kind !== "folder") return false;
        if (descendantIds(list, id).has(parentId)) return false; // would nest a folder inside itself
      }
      mutate((prev) => prev.map((n) => (n.id === id ? { ...n, parentId, updatedAt: Date.now() } : n)));
      return true;
    },
    [mutate],
  );

  // One status for the top bar. A local-storage problem only matters if Drive isn't holding the data either.
  const driveIdle = driveState === "idle" && !hasWork;
  const status: SaveStatus =
    localStatus === "loading" ? "loading"
    : driveState === "reauth" ? "reauth"
    : localStatus === "error" ? (driveIdle ? "synced" : "error")
    : localStatus === "saving" ? "saving"
    : driveState === "offline" ? "offline"
    : driveIdle ? "synced"
    : "saving";

  return {
    nodes, activeId, ready, status, revision, notice, dismissNotice: () => setNotice(null), syncNow,
    select: setActive, create, rename, setContent, toggleFavorite, remove, move,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
