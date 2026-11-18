/** How long Google Drive keeps things in its trash before removing them for good. */
export const TRASH_KEEP_DAYS = 30;

/** Items deleted within this long of their folder were deleted along with it. */
export const DELETED_TOGETHER_MS = 5 * 60_000;

interface TrashedLike {
  id: string;
  parentId: string | null;
  trashedAt: number;
}

/** Everything inside a trashed folder that was deleted together with it (at any depth). */
export function deletedTogether<T extends TrashedLike>(all: T[], folderId: string, windowMs = DELETED_TOGETHER_MS): T[] {
  const folder = all.find((t) => t.id === folderId);
  if (!folder) return [];
  const out: T[] = [];
  const seen = new Set([folderId]);
  const queue = [folderId];
  while (queue.length) {
    const parent = queue.shift()!;
    for (const t of all) {
      if (t.parentId === parent && !seen.has(t.id) && Math.abs(t.trashedAt - folder.trashedAt) <= windowMs) {
        seen.add(t.id);
        out.push(t);
        queue.push(t.id);
      }
    }
  }
  return out;
}

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago". */
export function describeAge(then: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} weeks ago`;
}

/** Whole days left before Drive removes it for good (never below 0). */
export function daysUntilPurge(trashedAt: number, now: number): number {
  const used = Math.floor(Math.max(0, now - trashedAt) / 86_400_000);
  return Math.max(0, TRASH_KEEP_DAYS - used);
}
