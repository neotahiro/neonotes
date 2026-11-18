"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, Folder, Trash2, Undo2, X } from "lucide-react";
import { useTrash } from "@/hooks/useTrash";
import { TRASH_KEEP_DAYS, daysUntilPurge, describeAge } from "@/lib/trash";
import { cn } from "@/lib/utils";

interface TrashDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called after something is restored, so the notes list can pick it up. */
  onRestored: () => void;
}

const action = "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors hover:bg-hover disabled:opacity-40";

export function TrashDialog({ open, onClose, onRestored }: TrashDialogProps) {
  const trash = useTrash(open, onRestored);
  const [confirming, setConfirming] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setConfirming(null);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  const { items, error, notice, busy } = trash;
  const now = Date.now();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby="trash-title" className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-line bg-paper shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-line p-5 pb-4">
          <div>
            <h2 id="trash-title" className="font-serif text-lg font-semibold">Trash</h2>
            <p className="mt-0.5 text-sm text-muted">Deleted notes wait here for {TRASH_KEEP_DAYS} days. Restore them, or delete them for good.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close trash" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-[8rem] flex-1 overflow-y-auto p-2">
          {notice && <p className="mx-2 mb-2 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent" role="status">{notice}</p>}
          {error && (
            <div className="mx-2 mb-2 flex items-center justify-between gap-3 rounded-md bg-hover px-3 py-2 text-sm" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => void trash.load()} className="shrink-0 text-accent hover:underline">Try again</button>
            </div>
          )}
          {items === null && !error && <p className="px-3 py-6 text-center text-sm text-muted">Loading…</p>}
          {items && items.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">The trash is empty.</p>}
          {items?.map((item) => {
            const Icon = item.kind === "folder" ? Folder : FileText;
            const working = busy === item.id || busy === "all";
            const sure = confirming === item.id;
            return (
              <div key={item.id} className={cn("flex items-center gap-3 rounded-lg px-3 py-2", working && "opacity-50")}>
                <Icon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.name || "Untitled"}</p>
                  <p className="text-xs text-muted">
                    {item.kind === "folder" ? "Folder · " : ""}Deleted {describeAge(item.trashedAt, now)} · {daysUntilPurge(item.trashedAt, now)} days left
                  </p>
                </div>
                {sure ? (
                  <div className="flex shrink-0 items-center gap-1 text-sm">
                    <span className="text-muted">Delete for good?</span>
                    <button type="button" disabled={working} onClick={() => { setConfirming(null); void trash.remove(item.id); }} className="h-8 rounded-md px-2.5 text-red-600 transition-colors hover:bg-hover dark:text-red-400">Yes</button>
                    <button type="button" onClick={() => setConfirming(null)} className="h-8 rounded-md px-2.5 transition-colors hover:bg-hover">No</button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center">
                    <button type="button" disabled={busy !== null} onClick={() => void trash.restore(item.id)} className={action}>
                      <Undo2 className="h-4 w-4" strokeWidth={1.75} />
                      Restore
                    </button>
                    <button type="button" disabled={busy !== null} onClick={() => setConfirming(item.id)} aria-label={`Delete ${item.name || "Untitled"} for good`} title="Delete for good" className={cn(action, "px-2 text-muted hover:text-red-600")}>
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {items && items.length > 0 && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3 text-sm">
            {confirming === "all" ? (
              <>
                <span className="text-muted">Delete everything in the trash for good?</span>
                <button type="button" disabled={busy !== null} onClick={() => { setConfirming(null); void trash.empty(); }} className="h-8 rounded-md px-2.5 text-red-600 transition-colors hover:bg-hover dark:text-red-400">Yes, empty it</button>
                <button type="button" onClick={() => setConfirming(null)} className="h-8 rounded-md px-2.5 transition-colors hover:bg-hover">Cancel</button>
              </>
            ) : (
              <button type="button" disabled={busy !== null} onClick={() => setConfirming("all")} className="h-8 rounded-md px-2.5 text-muted transition-colors hover:bg-hover hover:text-red-600">Empty trash</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
