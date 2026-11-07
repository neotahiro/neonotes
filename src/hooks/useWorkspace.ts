"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { seedNodes } from "@/lib/mock-data";
import { loadWorkspace, persist } from "@/lib/storage/localStore";
import { descendantIds } from "@/lib/tree";
import type { NodeKind, WorkspaceNode } from "@/lib/types";
import { uid } from "@/lib/utils";

export type SaveStatus = "loading" | "saving" | "saved" | "error";

const SAVE_DELAY_MS = 400;

/**
 * Workspace state, saved to this browser's IndexedDB.
 * The public shape stays the same when Drive sync replaces the storage layer.
 */
export function useWorkspace() {
  const [nodes, setNodes] = useState<WorkspaceNode[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("loading");

  // What is already written to storage, to work out what changed.
  const persisted = useRef(new Map<string, WorkspaceNode>());
  const persistedActive = useRef<string | null>(null);
  const nodesRef = useRef(nodes);
  const activeRef = useRef(activeId);
  nodesRef.current = nodes;
  activeRef.current = activeId;
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
            list = seedNodes;
            active = seedNodes[0].id;
          }
          await persist({ put: list, meta: { seeded: true, activeId: active } });
        }
        if (cancelled) return;
        if (!list.some((n) => n.id === active && n.kind === "doc")) active = null;
        persisted.current = new Map(list.map((n) => [n.id, n]));
        persistedActive.current = active;
        setNodes(list);
        setActiveId(active);
        setStatus("saved");
      } catch {
        if (cancelled) return;
        // Storage unavailable (e.g. private browsing): keep working in memory.
        setNodes(seedNodes);
        setActiveId(seedNodes[0].id);
        setStatus("error");
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasChanges = useCallback(() => {
    const prev = persisted.current;
    const list = nodesRef.current;
    return (
      list.length !== prev.size ||
      list.some((n) => prev.get(n.id) !== n) ||
      activeRef.current !== persistedActive.current
    );
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!hasChanges()) {
      setStatus((s) => (s === "error" ? s : "saved"));
      return;
    }
    const prev = persisted.current;
    const snapshot = nodesRef.current;
    const active = activeRef.current;
    const ids = new Set(snapshot.map((n) => n.id));
    const put = snapshot.filter((n) => prev.get(n.id) !== n);
    const remove = [...prev.keys()].filter((id) => !ids.has(id));
    const activeChanged = active !== persistedActive.current;
    try {
      await persist({ put, remove, meta: activeChanged ? { activeId: active } : undefined });
      put.forEach((n) => prev.set(n.id, n));
      remove.forEach((id) => prev.delete(id));
      persistedActive.current = active;
      setStatus(hasChanges() ? "saving" : "saved");
    } catch {
      setStatus("error");
    }
  }, [hasChanges]);

  // Save shortly after any change.
  useEffect(() => {
    if (!ready || !hasChanges()) return;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  }, [nodes, activeId, ready, hasChanges, flush]);

  // Save immediately when the tab is hidden or closed.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", () => void flush());
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);

  const create = useCallback((kind: NodeKind, parentId: string | null = null) => {
    const node: WorkspaceNode = {
      id: uid(), kind, parentId, favorite: false, content: "", updatedAt: Date.now(),
      name: kind === "doc" ? "Untitled" : "New folder",
    };
    setNodes((prev) => [...prev, node]);
    if (kind === "doc") setActiveId(node.id);
    return node.id;
  }, []);

  const update = useCallback((id: string, patch: Partial<WorkspaceNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)));
  }, []);

  const rename = useCallback((id: string, name: string) => update(id, { name }), [update]);
  const setContent = useCallback((id: string, content: string) => update(id, { content }), [update]);
  const toggleFavorite = useCallback((id: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, favorite: !n.favorite } : n)));
  }, []);

  const remove = useCallback((id: string) => {
    const doomed = descendantIds(nodesRef.current, id);
    setNodes(nodesRef.current.filter((n) => !doomed.has(n.id)));
    setActiveId((cur) => (cur && doomed.has(cur) ? null : cur));
  }, []);

  /** Moves a note or folder into another folder (or to the top level). Returns false if not allowed. */
  const move = useCallback((id: string, parentId: string | null) => {
    const list = nodesRef.current;
    const node = list.find((n) => n.id === id);
    if (!node || node.parentId === parentId) return false;
    if (parentId !== null) {
      const target = list.find((n) => n.id === parentId);
      if (!target || target.kind !== "folder") return false;
      if (descendantIds(list, id).has(parentId)) return false; // would nest a folder inside itself
    }
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, parentId, updatedAt: Date.now() } : n)));
    return true;
  }, []);

  return {
    nodes, activeId, ready, status,
    select: setActiveId, create, rename, setContent, toggleFavorite, remove, move,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
