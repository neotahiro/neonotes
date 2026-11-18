import { NextRequest } from "next/server";
import { deleteForever, emptyTrash, listTrashed, restoreFromTrash } from "@/lib/drive/drive";
import { json, parseTrashAction, withDrive } from "@/lib/drive/http";

export const dynamic = "force-dynamic";

/** Everything in the trash, newest first. */
export function GET(req: NextRequest) {
  return withDrive(req, false, async ({ token }) => {
    const items = (await listTrashed(token)).map(({ id, kind, name, trashedAt }) => ({ id, kind, name, trashedAt }));
    return json({ items });
  });
}

/** Restore one item, delete one item for good, or empty the trash. */
export function POST(req: NextRequest) {
  return withDrive(req, true, async ({ token, rootId }) => {
    const body = parseTrashAction(await req.json().catch(() => null));
    if (!body) return json({ error: "Bad request" }, 400);
    if (body.action === "restore") return json(await restoreFromTrash(token, rootId, body.id));
    if (body.action === "delete") {
      await deleteForever(token, body.id);
      return json({ deleted: 1 });
    }
    return json({ deleted: await emptyTrash(token) });
  });
}
