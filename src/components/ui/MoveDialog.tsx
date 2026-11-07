"use client";
import { useEffect, useRef } from "react";
import { Folder, FolderInput } from "lucide-react";
import type { WorkspaceNode } from "@/lib/types";
import { descendantIds, folderOptions } from "@/lib/tree";
import { cn } from "@/lib/utils";

interface MoveDialogProps {
  node: WorkspaceNode | null;
  nodes: WorkspaceNode[];
  onMove: (parentId: string | null) => void;
  onClose: () => void;
}

export function MoveDialog({ node, nodes, onMove, onClose }: MoveDialogProps) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const open = node !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!node) return null;
  const blocked = descendantIds(nodes, node.id); // can't move a folder into itself
  const folders = folderOptions(nodes);

  const option = (key: string, label: string, depth: number, disabled: boolean, current: boolean, parentId: string | null) => (
    <button
      key={key}
      type="button"
      disabled={disabled}
      onClick={() => onMove(parentId)}
      style={{ paddingLeft: 10 + depth * 16 }}
      className={cn(
        "flex w-full items-center gap-2 rounded-md py-2 pr-2 text-left text-sm transition-colors",
        disabled ? "text-muted opacity-60" : "hover:bg-hover",
      )}
    >
      {parentId === null ? <FolderInput className="h-4 w-4 shrink-0" strokeWidth={1.75} /> : <Folder className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
      <span className="min-w-0 flex-1 truncate">{label || "Untitled"}</span>
      {current && <span className="text-xs">current</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-title"
        className="relative flex max-h-[80dvh] w-full max-w-sm flex-col rounded-xl border border-line bg-paper p-5 shadow-xl"
      >
        <h2 id="move-title" className="font-serif text-lg font-semibold">Move “{node.name || "Untitled"}”</h2>
        <p className="mt-1 text-sm text-muted">Choose where it should go.</p>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {option("root", "Top level (no folder)", 0, node.parentId === null, node.parentId === null, null)}
          {folders.map((f) => option(f.id, f.name, f.depth + 1, blocked.has(f.id) || f.id === node.parentId, f.id === node.parentId, f.id))}
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-md px-3.5 py-2 text-sm transition-colors hover:bg-hover">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
