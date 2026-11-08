import type { CreateBody, RemoteFile, RemoteNode, RemoteResult, UpdateBody } from "@/lib/types";

/** kind: "offline" = no network, "reauth" = signed out or Drive access lost, "server" = Drive or our server failed. */
export class SyncError extends Error {
  constructor(public kind: "offline" | "reauth" | "server", public status = 0) {
    super(kind);
  }
}

export interface RemoteApi {
  list(): Promise<RemoteNode[]>;
  content(driveId: string): Promise<string>;
  get(driveId: string): Promise<RemoteFile>;
  create(body: CreateBody): Promise<RemoteResult>;
  update(driveId: string, body: UpdateBody): Promise<RemoteResult>;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new SyncError("offline");
  }
  if (res.status === 401) throw new SyncError("reauth", 401);
  if (!res.ok) throw new SyncError("server", res.status);
  return (await res.json()) as T;
}

const fileUrl = (id: string) => `/api/drive/file?id=${encodeURIComponent(id)}`;

export const remoteApi: RemoteApi = {
  list: async () => (await call<{ files: RemoteNode[] }>("/api/drive/files")).files,
  content: async (id) => (await call<{ content: string }>(fileUrl(id))).content,
  get: (id) => call<RemoteFile>(`${fileUrl(id)}&meta=1`),
  create: (body) => call<RemoteResult>("/api/drive/files", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => call<RemoteResult>(fileUrl(id), { method: "PATCH", body: JSON.stringify(body) }),
};
