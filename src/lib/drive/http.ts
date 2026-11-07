import { NextRequest, NextResponse } from "next/server";
import type { CreateBody, UpdateBody } from "@/lib/types";
import { DriveAuthError, getDriveAccess } from "./access";
import { DriveError, ensureRootFolder } from "./drive";

const noStore = { "Cache-Control": "no-store" };
const MAX_CONTENT = 3_000_000; // characters; Vercel rejects request bodies over ~4.5 MB

/** Drive ids and our local ids are letters, digits, "-" and "_". */
export const ID_RE = /^[A-Za-z0-9_-]{1,100}$/;

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Common wrapper: same-origin check for writes, Drive access token, root folder, and tidy errors. */
export async function withDrive(
  req: NextRequest,
  mutating: boolean,
  handler: (ctx: { token: string; rootId: string }) => Promise<Response>,
): Promise<Response> {
  if (mutating && !sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  try {
    const token = await getDriveAccess(req);
    const rootId = await ensureRootFolder(token);
    return await handler({ token, rootId });
  } catch (err) {
    if (err instanceof DriveAuthError) return json({ reason: err.reason }, 401);
    if (err instanceof DriveError && err.status === 404) return json({ error: "Not found" }, 404);
    console.error("Drive route failed:", err);
    return json({ error: "Drive request failed" }, 502);
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const cleanName = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 255) || "Untitled" : null);
const parentOk = (v: unknown): v is string | null => v === null || (typeof v === "string" && ID_RE.test(v));

export function parseCreate(b: unknown): CreateBody | null {
  if (!isRecord(b)) return null;
  const name = cleanName(b.name);
  const content = typeof b.content === "string" ? b.content : "";
  if (
    typeof b.localId !== "string" || !ID_RE.test(b.localId) ||
    (b.kind !== "doc" && b.kind !== "folder") ||
    name === null ||
    typeof b.favorite !== "boolean" ||
    typeof b.createdAt !== "number" || !Number.isFinite(b.createdAt) ||
    !parentOk(b.parentDriveId ?? null) ||
    content.length > MAX_CONTENT
  ) {
    return null;
  }
  return {
    localId: b.localId, kind: b.kind, name, favorite: b.favorite, createdAt: b.createdAt,
    parentDriveId: (b.parentDriveId ?? null) as string | null, content,
  };
}

export function parseUpdate(b: unknown): UpdateBody | null {
  if (!isRecord(b)) return null;
  const out: UpdateBody = {};
  if (b.name !== undefined) {
    const name = cleanName(b.name);
    if (name === null) return null;
    out.name = name;
  }
  if (b.favorite !== undefined) {
    if (typeof b.favorite !== "boolean") return null;
    out.favorite = b.favorite;
  }
  if (b.parentDriveId !== undefined) {
    if (!parentOk(b.parentDriveId)) return null;
    out.parentDriveId = b.parentDriveId;
  }
  if (b.content !== undefined) {
    if (typeof b.content !== "string" || b.content.length > MAX_CONTENT) return null;
    out.content = b.content;
  }
  if (b.trashed !== undefined) {
    if (b.trashed !== true) return null;
    out.trashed = true;
  }
  return out;
}
