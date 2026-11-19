/**
 * Server-only Google Drive helpers. With the drive.file permission, Drive only
 * ever shows this app the files it created itself.
 */
import type { CreateBody, RemoteFile, RemoteNode, RemoteResult, TrashItem, UpdateBody } from "@/lib/types";
import { deletedTogether } from "@/lib/trash";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOC_MIME = "text/html";

export const ROOT_FOLDER_NAME = "Noenotes";

/** Another device changed the file since we last saw it. */
export class ConflictError extends Error {
  constructor() {
    super("conflict");
  }
}

/** The request asked for something the app doesn't allow, such as deleting a note that isn't in the trash. */
export class NotAllowedError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class DriveError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function send(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new DriveError(res.status, `Drive request failed (${res.status}): ${await res.text()}`);
  return res;
}

export async function driveRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  return (await send(token, `${API}${path}`, init)).json() as Promise<T>;
}

function multipart(metadata: object, content: string) {
  const boundary = `noenotes${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${DOC_MIME}; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`;
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

async function upload<T>(token: string, path: string, method: "POST" | "PATCH", metadata: object, content: string) {
  const mp = multipart(metadata, content);
  const res = await send(token, `${UPLOAD}${path}`, { method, body: mp.body, headers: { "Content-Type": mp.contentType } });
  return (await res.json()) as T;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  parents?: string[];
  modifiedTime: string;
  appProperties?: Record<string, string>;
}

const ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
const validId = (v: string | undefined) => (v && ID_RE.test(v) ? v : undefined);

const rootCache = new Map<string, string>();

/** Finds the app's top-level folder, creating it on first use. */
export async function ensureRootFolder(token: string): Promise<string> {
  const cached = rootCache.get(token);
  if (cached) return cached;

  const q = `mimeType='${FOLDER_MIME}' and trashed=false and appProperties has { key='noenotes' and value='root' }`;
  const params = new URLSearchParams({ q, fields: "files(id,name)", orderBy: "createdTime", pageSize: "1", spaces: "drive" });
  const found = await driveRequest<{ files: DriveFile[] }>(token, `/files?${params}`);
  let id = found.files[0]?.id;
  if (!id) {
    const created = await driveRequest<DriveFile>(token, "/files?fields=id,name", {
      method: "POST",
      body: JSON.stringify({ name: ROOT_FOLDER_NAME, mimeType: FOLDER_MIME, appProperties: { noenotes: "root" } }),
    });
    id = created.id;
  }
  rootCache.set(token, id);
  return id;
}

/** Every note and folder the app has saved. */
export async function listNodes(token: string, rootId: string): Promise<RemoteNode[]> {
  const out: RemoteNode[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: "trashed=false and appProperties has { key='noenotes' and value='node' }",
      fields: "nextPageToken,files(id,name,mimeType,parents,modifiedTime,appProperties)",
      pageSize: "1000",
      spaces: "drive",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await driveRequest<{ files: DriveFile[]; nextPageToken?: string }>(token, `/files?${params}`);
    for (const f of page.files) {
      const parent = f.parents?.[0];
      out.push({
        id: f.id,
        kind: f.mimeType === FOLDER_MIME ? "folder" : "doc",
        name: f.name,
        parentId: !parent || parent === rootId ? null : parent,
        favorite: f.appProperties?.favorite === "true",
        pinned: f.appProperties?.pinned === "true",
        createdAt: Number(f.appProperties?.createdAt) || Date.parse(f.modifiedTime),
        modified: f.modifiedTime,
        writer: f.appProperties?.writer,
        localId: validId(f.appProperties?.localId),
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out;
}

export async function getContent(token: string, id: string): Promise<string> {
  const res = await send(token, `${API}/files/${id}?alt=media`);
  return res.text();
}

/** One note's current name, modified time and content. */
export async function getFile(token: string, id: string): Promise<RemoteFile> {
  const meta = await driveRequest<{ name: string; modifiedTime: string }>(token, `/files/${id}?fields=name,modifiedTime`);
  return { name: meta.name, modified: meta.modifiedTime, content: await getContent(token, id) };
}

export async function updateNode(token: string, rootId: string, id: string, patch: UpdateBody): Promise<RemoteResult> {
  const params = new URLSearchParams({ fields: "id,modifiedTime" });

  if (patch.parentDriveId !== undefined || patch.expectedModified !== undefined) {
    const current = await driveRequest<{ parents?: string[]; modifiedTime: string; appProperties?: Record<string, string> }>(
      token,
      `/files/${id}?fields=parents,modifiedTime,appProperties`,
    );
    // Refuse to overwrite a change made by a different device that we haven't seen.
    if (
      patch.expectedModified !== undefined &&
      current.modifiedTime !== patch.expectedModified &&
      !(patch.writer && current.appProperties?.writer === patch.writer)
    ) {
      throw new ConflictError();
    }
    if (patch.parentDriveId !== undefined) {
      const target = patch.parentDriveId ?? rootId;
      const parents = current.parents ?? [];
      if (!parents.includes(target)) {
        params.set("addParents", target);
        const old = parents.filter((p) => p !== target);
        if (old.length) params.set("removeParents", old.join(","));
      }
    }
  }

  const metadata: Record<string, unknown> = {};
  if (patch.name !== undefined) metadata.name = patch.name;
  const props: Record<string, string> = {};
  if (patch.favorite !== undefined) props.favorite = String(patch.favorite);
  if (patch.pinned !== undefined) props.pinned = String(patch.pinned);
  if (patch.writer) props.writer = patch.writer;
  if (Object.keys(props).length) metadata.appProperties = props;
  if (patch.trashed) metadata.trashed = true; // goes to the Drive trash, so it's recoverable

  let file: DriveFile;
  if (patch.content !== undefined) {
    params.set("uploadType", "multipart");
    file = await upload<DriveFile>(token, `/files/${id}?${params}`, "PATCH", metadata, patch.content);
  } else {
    file = await driveRequest<DriveFile>(token, `/files/${id}?${params}`, { method: "PATCH", body: JSON.stringify(metadata) });
  }
  return { id: file.id, modified: file.modifiedTime };
}

export async function createNode(token: string, rootId: string, input: CreateBody): Promise<RemoteResult> {
  // If an earlier attempt reached Drive but its reply was lost, reuse that file instead of making a duplicate.
  const q = `trashed=false and appProperties has { key='localId' and value='${input.localId}' }`;
  const dup = await driveRequest<{ files: DriveFile[] }>(
    token,
    `/files?${new URLSearchParams({ q, fields: "files(id)", pageSize: "1", spaces: "drive" })}`,
  );
  if (dup.files[0]) {
    return updateNode(token, rootId, dup.files[0].id, {
      name: input.name,
      favorite: input.favorite,
      pinned: input.pinned,
      parentDriveId: input.parentDriveId,
      content: input.kind === "doc" ? input.content : undefined,
      writer: input.writer,
    });
  }

  const metadata = {
    name: input.name,
    mimeType: input.kind === "folder" ? FOLDER_MIME : DOC_MIME,
    parents: [input.parentDriveId ?? rootId],
    appProperties: {
      noenotes: "node",
      localId: input.localId,
      favorite: String(input.favorite),
      pinned: String(Boolean(input.pinned)),
      createdAt: String(input.createdAt),
      ...(input.writer ? { writer: input.writer } : {}),
    },
  };
  const file =
    input.kind === "folder"
      ? await driveRequest<DriveFile>(token, "/files?fields=id,modifiedTime", { method: "POST", body: JSON.stringify(metadata) })
      : await upload<DriveFile>(token, "/files?uploadType=multipart&fields=id,modifiedTime", "POST", metadata, input.content);
  return { id: file.id, modified: file.modifiedTime };
}

/** A note or folder in the Drive trash, with what is needed to put it back. */
interface TrashedNode extends TrashItem {
  /** Drive ids of its parents. */
  parents: string[];
  parentId: string | null;
}

/** Everything the app has put in the Drive trash (including notes deleted before the app had a Trash view). */
export async function listTrashed(token: string): Promise<TrashedNode[]> {
  const out: TrashedNode[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: "trashed=true and appProperties has { key='noenotes' and value='node' }",
      fields: "nextPageToken,files(id,name,mimeType,parents,modifiedTime,trashedTime)",
      pageSize: "1000",
      spaces: "drive",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await driveRequest<{ files: (DriveFile & { trashedTime?: string })[]; nextPageToken?: string }>(token, `/files?${params}`);
    for (const f of page.files) {
      out.push({
        id: f.id,
        kind: f.mimeType === FOLDER_MIME ? "folder" : "doc",
        name: f.name,
        trashedAt: Date.parse(f.trashedTime ?? f.modifiedTime) || 0,
        parents: f.parents ?? [],
        parentId: f.parents?.[0] ?? null,
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out.sort((a, b) => b.trashedAt - a.trashedAt);
}

async function untrash(token: string, id: string, move?: { to: string; from: string[] }): Promise<void> {
  const params = new URLSearchParams({ fields: "id" });
  if (move) {
    params.set("addParents", move.to);
    if (move.from.length) params.set("removeParents", move.from.join(","));
  }
  await driveRequest(token, `/files/${id}?${params}`, { method: "PATCH", body: JSON.stringify({ trashed: false }) });
}

/**
 * Puts a note or folder back. A folder comes back with what was deleted along with it. If the folder it used
 * to be in is still deleted (or gone), it is put at the top level instead.
 */
export async function restoreFromTrash(token: string, rootId: string, id: string): Promise<{ restored: number; movedToTop: boolean }> {
  const all = await listTrashed(token);
  const target = all.find((t) => t.id === id);
  if (!target) throw new DriveError(404, "Not in the trash");

  let movedToTop = false;
  if (target.parentId && target.parentId !== rootId) {
    if (all.some((t) => t.id === target.parentId)) {
      movedToTop = true;
    } else {
      try {
        const parent = await driveRequest<{ trashed?: boolean }>(token, `/files/${target.parentId}?fields=id,trashed`);
        movedToTop = Boolean(parent.trashed);
      } catch (err) {
        if (err instanceof DriveError && err.status === 404) movedToTop = true;
        else throw err;
      }
    }
  }
  await untrash(token, id, movedToTop ? { to: rootId, from: target.parents } : undefined);

  const inside = target.kind === "folder" ? deletedTogether(all, id) : [];
  for (const child of inside) await untrash(token, child.id);
  return { restored: 1 + inside.length, movedToTop };
}

/** Permanently removes something that is in the trash. Refuses anything that isn't, so a live note can never be lost this way. */
export async function deleteForever(token: string, id: string): Promise<void> {
  const meta = await driveRequest<{ trashed?: boolean; appProperties?: Record<string, string> }>(token, `/files/${id}?fields=trashed,appProperties`);
  if (!meta.trashed || meta.appProperties?.noenotes !== "node") {
    throw new NotAllowedError("Only notes in the trash can be deleted for good");
  }
  await send(token, `${API}/files/${id}`, { method: "DELETE" });
}

/** Permanently removes everything in the trash. Returns how many items were removed. */
export async function emptyTrash(token: string): Promise<number> {
  const all = await listTrashed(token);
  let removed = 0;
  for (let i = 0; i < all.length; i += 5) {
    const results = await Promise.allSettled(all.slice(i, i + 5).map((t) => deleteForever(token, t.id)));
    removed += results.filter((r) => r.status === "fulfilled").length;
  }
  return removed;
}
