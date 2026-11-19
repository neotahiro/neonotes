"use client";
import { useMemo } from "react";
import { tagsOf } from "@/lib/editor/noteSettings";
import { collectTags } from "@/lib/tags";
import type { WorkspaceNode } from "@/lib/types";

/** The tags of every note, and the list of all tags with how many notes use each. */
export function useTagIndex(nodes: WorkspaceNode[]) {
  return useMemo(() => {
    const byNote = new Map<string, string[]>();
    for (const n of nodes) if (n.kind === "doc") byNote.set(n.id, tagsOf(n.content));
    return { byNote, all: collectTags(byNote.values()) };
  }, [nodes]);
}

export type TagIndex = ReturnType<typeof useTagIndex>;
