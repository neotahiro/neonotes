import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ConflictError, createNode, ensureRootFolder, getContent, getFile, listNodes, updateNode } from "../src/lib/drive/drive";
import { parseCreate, parseUpdate } from "../src/lib/drive/http";

type Call = { method: string; url: string; headers: Record<string, string>; body?: string };
const realFetch = globalThis.fetch;
const calls: Call[] = [];
let respond: (c: Call) => unknown = () => ({});

function mockFetch() {
  calls.length = 0;
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const c = { method: init.method ?? "GET", url: String(url), headers: (init.headers ?? {}) as Record<string, string>, body: init.body as string | undefined };
    calls.push(c);
    const r = respond(c);
    return typeof r === "string" ? new Response(r) : new Response(JSON.stringify(r));
  }) as typeof fetch;
}
afterEach(() => { globalThis.fetch = realFetch; });
const query = (c: Call) => new URL(c.url).searchParams;

test("creating a note sends one multipart upload into the root folder", async () => {
  mockFetch();
  respond = (c) => (c.method === "GET" ? { files: [] } : { id: "N1", modifiedTime: "T1" });
  const r = await createNode("tok", "ROOT", { localId: "abc123", kind: "doc", name: "Hi", favorite: true, createdAt: 42, parentDriveId: null, content: "<p>x</p>", writer: "devA" });
  assert.deepEqual(r, { id: "N1", modified: "T1" });
  assert.match(decodeURIComponent(query(calls[0]).get("q")!), /key='localId' and value='abc123'/);
  const post = calls[1];
  assert.match(post.url, /upload\/drive\/v3\/files\?uploadType=multipart/);
  assert.match(post.headers["Content-Type"], /^multipart\/related; boundary=/);
  for (const part of ['"parents":["ROOT"]', '"mimeType":"text/html"', '"createdAt":"42"', '"writer":"devA"', "<p>x</p>"]) assert.ok(post.body!.includes(part), part);
  assert.equal(post.headers.Authorization, "Bearer tok");
});

test("creating a folder uses plain JSON inside the given parent", async () => {
  mockFetch();
  respond = (c) => (c.method === "GET" ? { files: [] } : { id: "F1", modifiedTime: "T2" });
  await createNode("tok", "ROOT", { localId: "f1", kind: "folder", name: "Bio", favorite: false, createdAt: 1, parentDriveId: "P9", content: "" });
  assert.match(calls[1].body!, /vnd\.google-apps\.folder/);
  assert.match(calls[1].body!, /"parents":\["P9"\]/);
});

test("a repeated create reuses the existing file instead of duplicating", async () => {
  mockFetch();
  respond = (c) => (c.url.includes("localId") ? { files: [{ id: "OLD" }] } : { id: "OLD", modifiedTime: "T3" });
  const r = await createNode("tok", "ROOT", { localId: "abc123", kind: "doc", name: "Hi", favorite: false, createdAt: 1, parentDriveId: null, content: "c" });
  assert.equal(r.id, "OLD");
  assert.ok(!calls.some((c) => c.method === "POST"));
});

test("moving a note adds the new parent and removes the old one", async () => {
  mockFetch();
  respond = (c) => (c.url.includes("fields=parents") ? { parents: ["OLDP"], modifiedTime: "T" } : { id: "N1", modifiedTime: "T4" });
  await updateNode("tok", "ROOT", "N1", { name: "New", parentDriveId: null, content: "<p>y</p>" });
  const patch = calls[1];
  assert.equal(query(patch).get("addParents"), "ROOT");
  assert.equal(query(patch).get("removeParents"), "OLDP");
  assert.equal(query(patch).get("uploadType"), "multipart");
});

test("an update is refused when another device changed the file", async () => {
  mockFetch();
  respond = () => ({ modifiedTime: "NEWER", appProperties: { writer: "devB" }, parents: ["ROOT"] });
  await assert.rejects(updateNode("tok", "ROOT", "N1", { content: "x", expectedModified: "OLDER", writer: "devA" }), ConflictError);
  assert.equal(calls.length, 1, "nothing was written");
});

test("an update goes through when the newer change was our own", async () => {
  mockFetch();
  respond = (c) => (c.url.includes("fields=parents") ? { modifiedTime: "NEWER", appProperties: { writer: "devA" }, parents: ["ROOT"] } : { id: "N1", modifiedTime: "T9" });
  const r = await updateNode("tok", "ROOT", "N1", { content: "x", expectedModified: "OLDER", writer: "devA" });
  assert.equal(r.modified, "T9");
  assert.match(calls[1].body!, /"writer":"devA"/);
});

test("an update goes through when nothing changed in Drive", async () => {
  mockFetch();
  respond = (c) => (c.url.includes("fields=parents") ? { modifiedTime: "SAME", parents: ["ROOT"] } : { id: "N1", modifiedTime: "T9" });
  await updateNode("tok", "ROOT", "N1", { name: "x", expectedModified: "SAME", writer: "devA" });
  assert.equal(calls.length, 2);
});

test("trashing sends a metadata-only change", async () => {
  mockFetch();
  respond = () => ({ id: "N1", modifiedTime: "T5" });
  await updateNode("tok", "ROOT", "N1", { trashed: true });
  assert.equal(calls.length, 1);
  assert.match(calls[0].body!, /"trashed":true/);
  assert.ok(!calls[0].url.includes("upload"));
});

test("listing handles paging, the root folder, favorites and creation dates", async () => {
  mockFetch();
  let page = 0;
  respond = () => page++ === 0
    ? { files: [{ id: "a", name: "A", mimeType: "text/html", parents: ["ROOT"], modifiedTime: "2024-01-01T00:00:00.000Z", appProperties: { favorite: "true", createdAt: "77", writer: "devA" } }], nextPageToken: "n2" }
    : { files: [{ id: "b", name: "B", mimeType: "application/vnd.google-apps.folder", parents: ["a"], modifiedTime: "2024-01-02T00:00:00.000Z" }] };
  const list = await listNodes("tok", "ROOT");
  assert.deepEqual(list.map((x) => [x.id, x.kind, x.parentId, x.favorite, x.createdAt, x.writer]), [
    ["a", "doc", null, true, 77, "devA"],
    ["b", "folder", "a", false, Date.parse("2024-01-02T00:00:00.000Z"), undefined],
  ]);
});

test("reading a note returns raw text; with metadata it also returns name and time", async () => {
  mockFetch();
  respond = (c) => (c.url.includes("alt=media") ? "<p>raw</p>" : { name: "Essay", modifiedTime: "T7" });
  assert.equal(await getContent("tok", "N1"), "<p>raw</p>");
  assert.deepEqual(await getFile("tok", "N1"), { name: "Essay", modified: "T7", content: "<p>raw</p>" });
});

test("the root folder is found once and then remembered", async () => {
  mockFetch();
  respond = () => ({ files: [{ id: "R" }] });
  assert.equal(await ensureRootFolder("t2"), "R");
  calls.length = 0;
  await ensureRootFolder("t2");
  assert.equal(calls.length, 0);
});

test("requests from the browser are checked before use", () => {
  const good = { localId: "a_b-1", kind: "doc", name: "  Hello  ", favorite: false, createdAt: 5, parentDriveId: null, content: "x" };
  assert.equal(parseCreate(good)!.name, "Hello");
  assert.equal(parseCreate({ ...good, localId: "a' or 1=1" }), null);
  assert.equal(parseCreate({ ...good, kind: "file" }), null);
  assert.equal(parseCreate({ ...good, parentDriveId: "../x" }), null);
  assert.equal(parseCreate({ ...good, content: "x".repeat(3_000_001) }), null);
  assert.equal(parseCreate({ ...good, writer: "bad writer!" }), null);
  assert.equal(parseCreate("nope"), null);
  assert.deepEqual(parseUpdate({ trashed: true }), { trashed: true });
  assert.equal(parseUpdate({ trashed: false }), null);
  assert.equal(parseUpdate({ favorite: "yes" }), null);
  assert.equal(parseUpdate({ expectedModified: 5 }), null);
  assert.deepEqual(parseUpdate({ parentDriveId: null, expectedModified: "T", writer: "devA" }), { parentDriveId: null, expectedModified: "T", writer: "devA" });
});
