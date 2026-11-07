"use client";
import { useCallback, useState } from "react";
import { seedNodes } from "@/lib/mock-data";
import type { NodeKind, WorkspaceNode } from "@/lib/types";
import { uid } from "@/lib/utils";

/**
 * In-memory workspace. The public shape of this hook is the contract the
 * Drive-backed implementation will keep, so UI components won't change.
 */
export function useWorkspace() {
  const [nodes, setNodes] = useState<WorkspaceNode[]>(seedNodes);
  const [activeId, setActiveId] = useState<string | null>(
    seedNodes.find((n) => n.kind === "doc")?.id ?? null,
  );

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
    setNodes((prev) => {
      const doomed = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const n of prev) {
          if (n.parentId && doomed.has(n.parentId) && !doomed.has(n.id)) { doomed.add(n.id); grew = true; }
        }
      }
      setActiveId((cur) => (cur && doomed.has(cur) ? null : cur));
      return prev.filter((n) => !doomed.has(n.id));
    });
  }, []);

  return { nodes, activeId, select: setActiveId, create, rename, setContent, toggleFavorite, remove };
}

export type Workspace = ReturnType<typeof useWorkspace>;
