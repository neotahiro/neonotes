import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { DriveError, NotAllowedError, deleteForever, emptyTrash, listTrashed, restoreFromTrash } from "../src/lib/drive/drive";
import { parseTrashAction } from "../src/lib/drive/http";
import { daysUntilPurge, deletedTogether, describeAge } from "../src/lib/trash";

type Call = { method: string; url: string; body?: string };
const realFetch = globalThis.fetch;
const calls: Call[] = [];
let handler: (c: Call) => { status?: number; body?: unknown } = () => ({ body: {} });

function mockFetch() {
  calls.length = 0;
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const c = { method: init.method ?? "GET", url: String(url), body: init.body as string | undefined };
    calls.push(c);
    const r = handler(c);
    return new Response(r.status === 204 ? null : JSON.stringify(r.body ?? {}), { status: r.status ?? 200 });
  }) as typeof fetch;
}
afterEach(() => { globalThis.fetch = realFetch; });

const T0 = Date.parse("2026-11-10T10:00:00.000Z");
const file = (id: string, parents: string[], minutesAfter = 0, mime = "text/html") => ({
  id, name: id, mimeType: mime, parents, modifiedTime: new Date(T0).toISOString(), trashedTime: new Date(T0 + minutesAfter * 60_000).toISOString(),
});
const FOLDER = "application/vnd.google-apps.folder";
const q = (c: Call) => new URL(c.url).searchParams;
const patches = () => calls.filter((c) => c.method === "PATCH");

/** A Drive with these trashed files; live parents are listed in `liveParents`. */
function drive(trashed: ReturnType<typeof file>[], liveParents: string[] = []) {
  mockFetch();
  handler = (c) => {
    const u = new URL(c.url);
    if (c.method === "GET" && u.pathname.endsWith("/files")) return { body: { files: trashed } };
    const m = /\/files\/([^/?]+)$/.exec(u.pathname);
    if (c.method === "GET" && m && liveParents.includes(m[1])) return { body: { id: m[1], trashed: false } };
    if (c.method === "GET" && m) return { status: 404, body: {} };
    return { body: { id: "x" } };
  };
}

test("the trash lists what the app deleted, newest first, with deletion times", async () => {
  drive([file("old", ["ROOT"], 0), file("new", ["ROOT"], 30, FOLDER)]);
  const list = await listTrashed("tok");
  assert.deepEqual(list.map((t) => [t.id, t.kind, t.trashedAt]), [["new", "folder", T0 + 30 * 60_000], ["old", "doc", T0]]);
  assert.match(decodeURIComponent(q(calls[0]).get("q")!), /trashed=true and appProperties has \{ key='noenotes' and value='node' \}/);
});

test("restoring a note whose folder still exists puts it back in place", async () => {
  drive([file("n1", ["F1"])], ["F1"]);
  const res = await restoreFromTrash("tok", "ROOT", "n1");
  assert.deepEqual(res, { restored: 1, movedToTop: false });
  assert.equal(patches().length, 1);
  assert.equal(patches()[0].body, '{"trashed":false}');
  assert.equal(q(patches()[0]).get("addParents"), null);
});

test("restoring a note whose folder is still in the trash puts it at the top level", async () => {
  drive([file("n1", ["F1"]), file("F1", ["ROOT"], 0, FOLDER)]);
  const res = await restoreFromTrash("tok", "ROOT", "n1");
  assert.deepEqual(res, { restored: 1, movedToTop: true });
  assert.equal(q(patches()[0]).get("addParents"), "ROOT");
  assert.equal(q(patches()[0]).get("removeParents"), "F1");
});

test("restoring a note whose folder was deleted for good puts it at the top level", async () => {
  drive([file("n1", ["GONE"])], []);
  assert.equal((await restoreFromTrash("tok", "ROOT", "n1")).movedToTop, true);
});

test("a note that was at the top level simply comes back", async () => {
  drive([file("n1", ["ROOT"])]);
  assert.equal((await restoreFromTrash("tok", "ROOT", "n1")).movedToTop, false);
  assert.equal(calls.some((c) => c.method === "GET" && c.url.includes("/files/ROOT")), false);
});

test("restoring a folder brings back what was deleted with it, but not older deletions", async () => {
  drive([
    file("F1", ["ROOT"], 0, FOLDER), file("A", ["F1"], 0), file("Sub", ["F1"], 0, FOLDER), file("B", ["Sub"], 1),
    file("OldNote", ["F1"], -60 * 24 * 3), // deleted days earlier, on its own
  ]);
  const res = await restoreFromTrash("tok", "ROOT", "F1");
  assert.equal(res.restored, 4);
  assert.deepEqual(patches().map((c) => new URL(c.url).pathname.split("/").pop()).sort(), ["A", "B", "F1", "Sub"]);
});

test("restoring something that isn't in the trash is refused", async () => {
  drive([]);
  await assert.rejects(restoreFromTrash("tok", "ROOT", "nope"), (e) => e instanceof DriveError && e.status === 404);
});

test("only notes in the trash can be deleted for good", async () => {
  mockFetch();
  handler = () => ({ body: { trashed: false, appProperties: { noenotes: "node" } } });
  await assert.rejects(deleteForever("tok", "live"), NotAllowedError);
  handler = () => ({ body: { trashed: true, appProperties: {} } });
  await assert.rejects(deleteForever("tok", "foreign"), NotAllowedError);
  assert.equal(calls.some((c) => c.method === "DELETE"), false);

  handler = (c) => (c.method === "DELETE" ? { status: 204 } : { body: { trashed: true, appProperties: { noenotes: "node" } } });
  await deleteForever("tok", "gone");
  assert.equal(calls.at(-1)!.method, "DELETE");
  assert.match(calls.at(-1)!.url, /\/files\/gone$/);
});

test("emptying the trash removes everything in it and counts it", async () => {
  mockFetch();
  const items = [file("a", ["ROOT"]), file("b", ["ROOT"]), file("c", ["ROOT"])];
  handler = (c) => {
    const u = new URL(c.url);
    if (c.method === "GET" && u.pathname.endsWith("/files")) return { body: { files: items } };
    if (c.method === "DELETE") return { status: 204 };
    return { body: { trashed: true, appProperties: { noenotes: "node" } } };
  };
  assert.equal(await emptyTrash("tok"), 3);
  assert.equal(calls.filter((c) => c.method === "DELETE").length, 3);
});

test("trash requests from the browser are checked", () => {
  assert.deepEqual(parseTrashAction({ action: "restore", id: "abc_1" }), { action: "restore", id: "abc_1" });
  assert.deepEqual(parseTrashAction({ action: "delete", id: "abc" }), { action: "delete", id: "abc" });
  assert.deepEqual(parseTrashAction({ action: "empty" }), { action: "empty" });
  assert.equal(parseTrashAction({ action: "restore" }), null);
  assert.equal(parseTrashAction({ action: "restore", id: "a/b" }), null);
  assert.equal(parseTrashAction({ action: "nuke", id: "a" }), null);
  assert.equal(parseTrashAction(null), null);
});

test("items deleted with a folder are found at any depth, and nothing else", () => {
  const all = [
    { id: "F", parentId: "ROOT", trashedAt: 1000 }, { id: "A", parentId: "F", trashedAt: 1500 },
    { id: "S", parentId: "F", trashedAt: 1000 }, { id: "B", parentId: "S", trashedAt: 2000 },
    { id: "Old", parentId: "F", trashedAt: 1000 - 10 * 60_000 }, { id: "Other", parentId: "X", trashedAt: 1000 },
  ];
  assert.deepEqual(deletedTogether(all, "F").map((t) => t.id).sort(), ["A", "B", "S"]);
  assert.deepEqual(deletedTogether(all, "nope"), []);
});

test("ages and the 30-day countdown read naturally", () => {
  const now = Date.parse("2026-11-20T12:00:00Z");
  const ago = (ms: number) => describeAge(now - ms, now);
  assert.equal(ago(20_000), "just now");
  assert.equal(ago(60_000), "1 minute ago");
  assert.equal(ago(5 * 60_000), "5 minutes ago");
  assert.equal(ago(3 * 3600_000), "3 hours ago");
  assert.equal(ago(30 * 3600_000), "yesterday");
  assert.equal(ago(5 * 86400_000), "5 days ago");
  assert.equal(ago(21 * 86400_000), "3 weeks ago");
  assert.equal(daysUntilPurge(now - 3 * 86400_000, now), 27);
  assert.equal(daysUntilPurge(now - 40 * 86400_000, now), 0);
});
