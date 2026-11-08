import { NextRequest } from "next/server";
import { getContent, getFile, updateNode } from "@/lib/drive/drive";
import { ID_RE, json, parseUpdate, withDrive } from "@/lib/drive/http";

export const dynamic = "force-dynamic";

function idOf(req: NextRequest): string | null {
  const id = req.nextUrl.searchParams.get("id");
  return id && ID_RE.test(id) ? id : null;
}

/** Read one note: /api/drive/file?id=... (add &meta=1 for name and modified time too). */
export function GET(req: NextRequest) {
  return withDrive(req, false, async ({ token }) => {
    const id = idOf(req);
    if (!id) return json({ error: "Bad request" }, 400);
    // ?meta=1 also returns the name and modified time (used when resolving conflicts)
    if (req.nextUrl.searchParams.get("meta") === "1") return json(await getFile(token, id));
    return json({ content: await getContent(token, id) });
  });
}

/** Rename, move, favorite, change content, or trash. */
export function PATCH(req: NextRequest) {
  return withDrive(req, true, async ({ token, rootId }) => {
    const id = idOf(req);
    const body = parseUpdate(await req.json().catch(() => null));
    if (!id || !body) return json({ error: "Bad request" }, 400);
    return json(await updateNode(token, rootId, id, body));
  });
}
