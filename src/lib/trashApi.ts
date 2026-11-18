import { SyncError, call } from "@/lib/sync/remote";
import type { TrashItem } from "@/lib/types";

const post = <T>(body: object) => call<T>("/api/drive/trash", { method: "POST", body: JSON.stringify(body) });

export const trashApi = {
  list: async () => (await call<{ items: TrashItem[] }>("/api/drive/trash")).items,
  restore: (id: string) => post<{ restored: number; movedToTop: boolean }>({ action: "restore", id }),
  remove: (id: string) => post<{ deleted: number }>({ action: "delete", id }),
  empty: () => post<{ deleted: number }>({ action: "empty" }),
};

/** A plain-language reason for a failed trash request. */
export function trashErrorMessage(err: unknown): string {
  if (err instanceof SyncError) {
    if (err.kind === "offline") return "You’re offline. The trash needs a connection to Google Drive.";
    if (err.kind === "reauth") return "Your sign-in has expired. Sign in again to use the trash.";
  }
  return "Couldn’t reach Google Drive. Please try again.";
}
