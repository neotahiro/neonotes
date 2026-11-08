"use client";
import { useState } from "react";
import type { DragEvent } from "react";
import { ChevronRight, FileText, FilePlus, Folder, FolderInput, FolderOpen, Pencil, Star, Trash2 } from "lucide-react";
import type { WorkspaceNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";

export const DRAG_TYPE = "application/x-noenotes-id";

export interface TreeActions {
  onSelect: (node: WorkspaceNode) => void;
  onToggle: (id: string) => void;
  onStartRename: (id: string) => void;
  /** viaEnter is true when the person pressed Enter (as opposed to clicking away). */
  onCommitRename: (id: string, name: string, viaEnter?: boolean) => void;
  onCancelRename: () => void;
  onDelete: (node: WorkspaceNode) => void;
  onFavorite: (id: string) => void;
  onAddDoc: (parentId: string) => void;
  onMove: (node: WorkspaceNode) => void;
  onDropOn: (draggedId: string, targetFolderId: string) => void;
}

interface TreeRowProps extends TreeActions {
  node: WorkspaceNode;
  depth: number;
  active: boolean;
  expanded: boolean;
  editing: boolean;
  hint?: string;
}

const reveal =
  "flex items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100";

export function TreeRow(p: TreeRowProps) {
  const { node, depth, active, expanded, editing } = p;
  const isFolder = node.kind === "folder";
  const [draft, setDraft] = useState(node.name);
  const [over, setOver] = useState(false);
  const Icon = isFolder ? (expanded ? FolderOpen : Folder) : FileText;

  const dropProps = isFolder
    ? {
        onDragOver: (e: DragEvent) => {
          if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setOver(true);
        },
        onDragLeave: (e: DragEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
        },
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          setOver(false);
          const id = e.dataTransfer.getData(DRAG_TYPE);
          if (id) p.onDropOn(id, node.id);
        },
      }
    : {};

  return (
    <div
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, node.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      {...dropProps}
      className={cn(
        "group flex h-8 items-center gap-1 rounded-md pr-1 text-sm transition-colors",
        over ? "bg-accent-soft ring-1 ring-accent" : active ? "bg-accent-soft text-ink" : "text-ink hover:bg-hover",
      )}
      style={{ paddingLeft: 6 + depth * 14 }}
    >
      {isFolder ? (
        <button
          type="button"
          aria-label={expanded ? "Collapse folder" : "Expand folder"}
          onClick={() => p.onToggle(node.id)}
          className="flex h-5 w-4 shrink-0 items-center justify-center text-muted"
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "text-muted")} strokeWidth={1.75} />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => p.onCommitRename(node.id, draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") p.onCommitRename(node.id, draft, true);
            if (e.key === "Escape") p.onCancelRename();
          }}
          className="min-w-0 flex-1 rounded border border-line bg-paper px-1.5 py-0.5 text-sm outline-none focus:border-accent"
        />
      ) : (
        <button
          type="button"
          onClick={() => (isFolder ? p.onToggle(node.id) : p.onSelect(node))}
          onDoubleClick={() => p.onStartRename(node.id)}
          className="min-w-0 flex-1 truncate text-left"
        >
          {node.name || "Untitled"}
          {p.hint && <span className="ml-2 text-xs text-muted">{p.hint}</span>}
        </button>
      )}

      {!editing && (
        <div className={reveal}>
          {isFolder ? (
            <IconButton size="sm" icon={FilePlus} label="New document in folder" onClick={() => p.onAddDoc(node.id)} />
          ) : (
            <IconButton
              size="sm"
              icon={Star}
              label={node.favorite ? "Remove from favorites" : "Add to favorites"}
              active={node.favorite}
              onClick={() => p.onFavorite(node.id)}
            />
          )}
          <IconButton size="sm" icon={FolderInput} label="Move to…" onClick={() => p.onMove(node)} />
          <IconButton size="sm" icon={Pencil} label="Rename" onClick={() => p.onStartRename(node.id)} />
          <IconButton size="sm" icon={Trash2} label="Delete" onClick={() => p.onDelete(node)} />
        </div>
      )}
    </div>
  );
}
