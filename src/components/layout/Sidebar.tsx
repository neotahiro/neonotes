"use client";
import { useEffect, useMemo, useState } from "react";
import { FilePlus, FolderPlus, Search, Star } from "lucide-react";
import type { Workspace } from "@/hooks/useWorkspace";
import type { UserInfo, WorkspaceNode } from "@/lib/types";
import { cn, stripHtml } from "@/lib/utils";
import { FileTree } from "@/components/navigation/FileTree";
import { DRAG_TYPE, TreeRow, type TreeActions } from "@/components/navigation/TreeRow";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Logo } from "@/components/ui/Logo";
import { MoveDialog } from "@/components/ui/MoveDialog";
import { ProfileMenu } from "./ProfileMenu";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  /** Moves the cursor into the open note's text. */
  onFocusEditor: () => void;
  ws: Workspace;
  user: UserInfo;
}

export function Sidebar({ open, onClose, onFocusEditor, ws, user }: SidebarProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WorkspaceNode | null>(null);
  const [moving, setMoving] = useState<WorkspaceNode | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null); // folder that new items are created in
  const [rootOver, setRootOver] = useState(false);

  // After loading, open the folders that contain the current document.
  useEffect(() => {
    if (!ws.ready) return;
    const ids: string[] = [];
    let cur = ws.nodes.find((n) => n.id === ws.activeId);
    setTargetId(cur?.parentId ?? null);
    while (cur?.parentId) {
      const parentId: string = cur.parentId;
      ids.push(parentId);
      cur = ws.nodes.find((n) => n.id === parentId);
    }
    if (ids.length) setExpanded((s) => new Set([...s, ...ids]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.ready]);

  const target = ws.nodes.find((n) => n.id === targetId && n.kind === "folder") ?? null;
  const expand = (id: string) => setExpanded((s) => new Set(s).add(id));
  const closeOnMobile = () => {
    if (window.matchMedia("(max-width: 767px)").matches) onClose();
  };

  const createHere = (kind: "doc" | "folder") => {
    if (target) expand(target.id);
    setEditingId(ws.create(kind, target?.id ?? null));
  };

  const moveTo = (id: string, parentId: string | null) => {
    if (ws.move(id, parentId) && parentId) expand(parentId);
  };

  const actions: TreeActions = {
    onSelect: (n) => {
      ws.select(n.id);
      setTargetId(n.parentId);
      closeOnMobile();
    },
    onToggle: (id) => {
      setTargetId(id);
      setExpanded((s) => {
        const next = new Set(s);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    },
    onStartRename: setEditingId,
    onCommitRename: (id, name, viaEnter) => {
      if (name.trim()) ws.rename(id, name.trim());
      setEditingId(null);
      // Pressing Enter on the open note's name (e.g. a brand-new note) goes straight to writing.
      if (viaEnter && id === ws.activeId) {
        closeOnMobile();
        onFocusEditor();
      }
    },
    onCancelRename: () => setEditingId(null),
    onDelete: setPendingDelete,
    onFavorite: ws.toggleFavorite,
    onAddDoc: (parentId) => {
      expand(parentId);
      setTargetId(parentId);
      setEditingId(ws.create("doc", parentId));
    },
    onMove: setMoving,
    onDropOn: moveTo,
  };

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      q
        ? ws.nodes.filter(
            (n) => n.kind === "doc" && (n.name.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q)),
          )
        : [],
    [q, ws.nodes],
  );
  const favorites = ws.nodes.filter((n) => n.kind === "doc" && n.favorite);
  const folderName = (n: WorkspaceNode) => ws.nodes.find((p) => p.id === n.parentId)?.name;

  const flatRow = (n: WorkspaceNode, hint?: string) => (
    <TreeRow
      key={n.id}
      {...actions}
      node={n}
      depth={0}
      active={n.id === ws.activeId}
      expanded={false}
      editing={n.id === editingId}
      hint={hint}
    />
  );

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-label="Documents"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-line bg-sidebar transition-all duration-200",
          "md:static md:z-auto",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:-ml-72",
        )}
      >
        <div className="flex h-12 items-center justify-between px-3">
          <div className="flex min-w-0 items-center gap-2">
            <Logo size={24} decorative className="shrink-0 ring-1 ring-line" />
            <span className="truncate font-serif text-lg font-semibold tracking-tight">NeoNotes</span>
          </div>
          <div className="flex items-center">
            <IconButton
              icon={FilePlus}
              label={target ? `New document in ${target.name}` : "New document"}
              onClick={() => createHere("doc")}
            />
            <IconButton
              icon={FolderPlus}
              label={target ? `New folder in ${target.name}` : "New folder"}
              onClick={() => createHere("folder")}
            />
          </div>
        </div>

        <div className="px-3 pb-2">
          <label className="flex h-8 items-center gap-2 rounded-md border border-line bg-paper px-2 text-muted focus-within:border-accent">
            <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents"
              aria-label="Search documents"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
          </label>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {q ? (
            results.length ? (
              results.map((n) => flatRow(n, folderName(n)))
            ) : (
              <p className="px-2 py-3 text-sm text-muted">No documents match “{query}”.</p>
            )
          ) : (
            <>
              {favorites.length > 0 && (
                <section className="mb-3">
                  <h2 className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted">
                    <Star className="h-3 w-3" /> Favorites
                  </h2>
                  {favorites.map((n) => flatRow(n))}
                </section>
              )}
              <section>
                <h2 className="text-xs font-medium text-muted">
                  <button
                    type="button"
                    title="Create new items at the top level, or drop a note here to move it out of its folder"
                    onClick={() => setTargetId(null)}
                    onDragOver={(e) => {
                      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
                      e.preventDefault();
                      setRootOver(true);
                    }}
                    onDragLeave={() => setRootOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setRootOver(false);
                      const id = e.dataTransfer.getData(DRAG_TYPE);
                      if (id) moveTo(id, null);
                    }}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left transition-colors hover:text-ink",
                      rootOver && "bg-accent-soft ring-1 ring-accent",
                    )}
                  >
                    Documents
                    {target && <span className="min-w-0 truncate font-normal">· adding to {target.name}</span>}
                  </button>
                </h2>
                <FileTree
                  {...actions}
                  nodes={ws.nodes}
                  parentId={null}
                  activeId={ws.activeId}
                  expanded={expanded}
                  editingId={editingId}
                />
                {ws.nodes.length === 0 && (
                  <p className="px-2 py-3 text-sm text-muted">Nothing here yet. Create a document to begin.</p>
                )}
              </section>
            </>
          )}
        </nav>

        <ProfileMenu user={user} />
      </aside>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.kind === "folder" ? "Delete this folder?" : "Delete this document?"}
        message={
          pendingDelete?.kind === "folder"
            ? `“${pendingDelete.name || "Untitled"}” and everything inside it will be deleted.`
            : `“${pendingDelete?.name || "Untitled"}” will be deleted.`
        }
        onConfirm={() => {
          if (pendingDelete) ws.remove(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <MoveDialog
        node={moving}
        nodes={ws.nodes}
        onMove={(parentId) => {
          if (moving) moveTo(moving.id, parentId);
          setMoving(null);
        }}
        onClose={() => setMoving(null)}
      />
    </>
  );
}
