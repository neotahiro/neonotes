import { NextRequest } from "next/server";
import { createNode, listNodes } from "@/lib/drive/drive";
import { json, parseCreate, withDrive } from "@/lib/drive/http";

export const dynamic = "force-dynamic";

/** List everything the app has saved. */
export function GET(req: NextRequest) {
  return withDrive(req, false, async ({ token, rootId }) => json({ files: await listNodes(token, rootId) }));
}

/** Create a note or folder. */
export function POST(req: NextRequest) {
  return withDrive(req, true, async ({ token, rootId }) => {
    const body = parseCreate(await req.json().catch(() => null));
    if (!body) return json({ error: "Bad request" }, 400);
    return json(await createNode(token, rootId, body));
  });
}
