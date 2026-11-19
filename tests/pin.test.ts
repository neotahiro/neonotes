import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createNode, listNodes, updateNode } from "../src/lib/drive/drive";
import { parseCreate, parseUpdate } from "../src/lib/drive/http";
import { pullFromDrive, pushToDrive } from "../src/lib/sync/engine";
import { byDisplayOrder, folderOptions } from "../src/lib/tree";
import type { WorkspaceNode } from "../src/lib/types";
import { FakeDrive, device, edit, mk } from "./helpers";

const pin = (n: WorkspaceNode): WorkspaceNode => ({ ...n, pinned: true });

test("pinned items come first, then everything else oldest first", () => {
  const a = mk("a", "doc", null, "A");
  const b = pin(mk("b", "doc", null, "B"));
  const c = mk("c", "doc", null, "C");
  const d = pin(mk("d", "folder", null, "D"));
  assert.deepEqual([a, b, c, d].sort(byDisplayOrder).map((n) => n.id), ["b", "d", "a", "c"]);
});

test("the Move list shows folders in the same order as the sidebar", () => {
  const older = mk("f1", "folder", null, "Older");
  const newer = pin(mk("f2", "folder", null, "Newer"));
  assert.deepEqual(folderOptions([older, newer]).map((f) => f.id), ["f2", "f1"]);
});

test("a node saved before pinning existed counts as not pinned", () => {
  const plain = mk("p", "doc", null, "P");
  assert.equal(plain.pinned, undefined);
  assert.deepEqual([pin(mk("q", "doc", null, "Q")), plain].sort(byDisplayOrder).map((n) => n.id), ["q", "p"]);
});

test("pinning on one device shows on another, and unpinning too", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("n1", "doc", null, "Note", "<p>1</p>"), mk("n2", "doc", null, "Other")]);
  await pushToDrive(A.env);
  const B = device(drive, "devB");
  await pullFromDrive(B.env);
  assert.ok(B.state.nodes.every((n) => !n.pinned));

  edit(A, "n2", { pinned: true });
  await pushToDrive(A.env);
  await pullFromDrive(B.env);
  assert.deepEqual(B.state.nodes.filter((n) => n.pinned).map((n) => n.id), ["n2"]);

  edit(A, "n2", { pinned: false });
  await pushToDrive(A.env);
  await pullFromDrive(B.env);
  assert.equal(B.state.nodes.filter((n) => n.pinned).length, 0);
});

test("a folder can be pinned too", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("f1", "folder", null, "Folder")]);
  await pushToDrive(A.env);
  edit(A, "f1", { pinned: true });
  await pushToDrive(A.env);
  const B = device(drive, "devB");
  await pullFromDrive(B.env);
  assert.equal(B.state.nodes[0].pinned, true);
});

test("a note created already pinned arrives pinned", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [pin(mk("n1", "doc", null, "Note"))]);
  await pushToDrive(A.env);
  const B = device(drive, "devB");
  await pullFromDrive(B.env);
  assert.equal(B.state.nodes[0].pinned, true);
});

// ---- the Drive side
const realFetch = globalThis.fetch;
const calls: { method: string; url: string; body?: string }[] = [];
let reply: unknown = {};
const mock = () => {
  calls.length = 0;
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    calls.push({ method: init.method ?? "GET", url: String(url), body: init.body as string | undefined });
    return new Response(JSON.stringify(reply));
  }) as typeof fetch;
};
afterEach(() => { globalThis.fetch = realFetch; });

test("pinned is saved in Drive's app properties, and read back", async () => {
  mock();
  reply = { id: "N1", modifiedTime: "T1" };
  await updateNode("tok", "ROOT", "N1", { pinned: true });
  assert.match(calls[0].body!, /"pinned":"true"/);

  mock();
  reply = { files: [] };
  await createNode("tok", "ROOT", { localId: "abc", kind: "doc", name: "X", favorite: false, pinned: true, createdAt: 1, parentDriveId: null, content: "" });
  assert.match(calls.at(-1)!.body!, /"pinned":"true"/);

  mock();
  reply = { files: [
    { id: "a", name: "A", mimeType: "text/html", parents: ["ROOT"], modifiedTime: "2026-01-01T00:00:00Z", appProperties: { pinned: "true" } },
    { id: "b", name: "B", mimeType: "text/html", parents: ["ROOT"], modifiedTime: "2026-01-01T00:00:00Z" },
  ] };
  assert.deepEqual((await listNodes("tok", "ROOT")).map((n) => [n.id, n.pinned]), [["a", true], ["b", false]]);
});

test("pin requests from the browser are checked", () => {
  const base = { localId: "a1", kind: "doc", name: "N", favorite: false, createdAt: 5, parentDriveId: null, content: "" };
  assert.equal(parseCreate({ ...base, pinned: true })!.pinned, true);
  assert.equal(parseCreate(base)!.pinned, false);
  assert.equal(parseCreate({ ...base, pinned: "yes" }), null);
  assert.equal(parseUpdate({ pinned: false })!.pinned, false);
  assert.equal(parseUpdate({ pinned: "true" }), null);
  assert.equal(parseUpdate({})!.pinned, undefined);
});
