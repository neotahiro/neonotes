/**
 * Server-only Google Drive helpers. With the drive.file permission, Drive only
 * ever shows this app the files it created itself.
 */
const API = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export const ROOT_FOLDER_NAME = "Noenotes";

export class DriveError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function driveRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new DriveError(res.status, `Drive request failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as T;
}

interface DriveFile {
  id: string;
  name: string;
}

/** Finds the app's top-level folder, creating it on first use. */
export async function ensureRootFolder(token: string): Promise<string> {
  const q = `mimeType='${FOLDER_MIME}' and trashed=false and appProperties has { key='noenotes' and value='root' }`;
  const params = new URLSearchParams({ q, fields: "files(id,name)", orderBy: "createdTime", pageSize: "1", spaces: "drive" });
  const found = await driveRequest<{ files: DriveFile[] }>(token, `/files?${params}`);
  if (found.files[0]) return found.files[0].id;

  const created = await driveRequest<DriveFile>(token, "/files?fields=id,name", {
    method: "POST",
    body: JSON.stringify({ name: ROOT_FOLDER_NAME, mimeType: FOLDER_MIME, appProperties: { noenotes: "root" } }),
  });
  return created.id;
}
