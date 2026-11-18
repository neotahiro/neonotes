"use client";
import { useCallback, useEffect, useState } from "react";
import { trashApi, trashErrorMessage } from "@/lib/trashApi";
import type { TrashItem } from "@/lib/types";

/** The trash: what is in it, and restoring or removing things. `onRestored` runs after something comes back so the notes list can refresh. */
export function useTrash(open: boolean, onRestored: () => void) {
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** The id being worked on, or "all" while emptying. */
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await trashApi.list());
    } catch (err) {
      setError(trashErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    setNotice(null);
    void load();
  }, [open, load]);

  const run = useCallback(
    async (key: string, work: () => Promise<string | null>, refreshNotes = false) => {
      setBusy(key);
      setError(null);
      try {
        setNotice(await work());
        await load();
        if (refreshNotes) onRestored();
      } catch (err) {
        setError(trashErrorMessage(err));
      } finally {
        setBusy(null);
      }
    },
    [load, onRestored],
  );

  const restore = useCallback(
    (id: string) =>
      run(
        id,
        async () => {
          const res = await trashApi.restore(id);
          if (res.movedToTop) return "Restored to the top level, because the folder it was in is still deleted.";
          return res.restored > 1 ? `Restored the folder and the ${res.restored - 1} item${res.restored === 2 ? "" : "s"} inside it.` : "Restored.";
        },
        true,
      ),
    [run],
  );
  const remove = useCallback((id: string) => run(id, async () => { await trashApi.remove(id); return "Deleted for good."; }), [run]);
  const empty = useCallback(() => run("all", async () => { await trashApi.empty(); return "The trash is empty."; }), [run]);

  return { items, error, notice, busy, load, restore, remove, empty };
}
