import assert from "node:assert/strict";
import { test } from "node:test";
import { pullFromDrive, pushToDrive } from "../src/lib/sync/engine";
import { isDirty } from "../src/lib/sync/merge";
import { SyncError } from "../src/lib/sync/remote";
import { device, edit, FakeDrive, mk } from "./helpers";

test("first upload sends parents before children", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("n1", "doc", "f1", "Lecture 1", "<p>hi</p>"), mk("f1", "folder", null, "Biology"), mk("n2", "doc", null, "Loose")]);
  await pushToDrive(A.env);
  assert.ok(drive.log.indexOf("create Biology") < drive.log.indexOf("create Lecture 1"));
  assert.equal(drive.log.length, 3);
  assert.ok(A.state.nodes.every((n) => !isDirty(n)));
  assert.equal(drive.byName("Lecture 1").n.parentId, A.state.nodes.find((n) => n.id === "f1")!.sync!.driveId);
});

test("nothing to save means no Drive calls", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("n1", "doc", null, "One")]);
  await pushToDrive(A.env);
  drive.log = [];
  await pushToDrive(A.env);
  assert.equal(drive.log.length, 0);
});

test("edit, rename, favorite and move reach Drive", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("f1", "folder", null, "Bio"), mk("n1", "doc", null, "Note", "<p>a</p>")]);
  await pushToDrive(A.env);
  edit(A, "n1", { content: "<p>b</p>", name: "Renamed", favorite: true, parentId: "f1" });
  await pushToDrive(A.env);
  const f = drive.byName("Renamed");
  assert.equal(f.content, "<p>b</p>");
  assert.equal(f.n.favorite, true);
  assert.equal(f.n.parentId, A.state.nodes.find((n) => n.id === "f1")!.sync!.driveId);
});

test("a second device imports everything, and a clean device picks up remote edits", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("f1", "folder", null, "Bio"), mk("n1", "doc", "f1", "Note", "<p>1</p>")]);
  await pushToDrive(A.env);
  const B = device(drive, "devB");
  await pullFromDrive(B.env);
  assert.equal(B.state.nodes.length, 2);
  const bn = B.state.nodes.find((n) => n.kind === "doc")!;
  assert.equal(bn.content, "<p>1</p>");
  assert.equal(bn.parentId, B.state.nodes.find((n) => n.kind === "folder")!.id);

  edit(B, bn.id, { content: "<p>from B</p>" });
  await pushToDrive(B.env);
  await pullFromDrive(A.env);
  assert.equal(A.state.nodes.find((n) => n.id === "n1")!.content, "<p>from B</p>");
  assert.deepEqual(A.state.refreshed, ["n1"]);
  assert.equal(A.state.conflicts.length, 0);
});

test("deleting a folder trashes everything in it, and other devices drop it", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("f1", "folder", null, "Bio"), mk("n1", "doc", "f1", "Note")]);
  await pushToDrive(A.env);
  const B = device(drive, "devB");
  await pullFromDrive(B.env);
  A.state.pending = A.state.nodes.map((n) => n.sync!.driveId);
  A.state.nodes = [];
  await pushToDrive(A.env);
  assert.equal(drive.live().length, 0);
  assert.deepEqual(A.state.pending, []);
  await pullFromDrive(B.env);
  assert.equal(B.state.nodes.length, 0);
});

test("a lost reply on create does not make a duplicate", async () => {
  const drive = new FakeDrive();
  const C = device(drive, "devC", [mk("x1", "doc", null, "Retry me", "<p>x</p>")]);
  drive.loseNextReply = true;
  await assert.rejects(pushToDrive(C.env), SyncError);
  await pushToDrive(C.env);
  assert.equal(drive.live().length, 1);
  assert.ok(!isDirty(C.state.nodes[0]));
});

test("a note deleted while it is being created is trashed afterwards", async () => {
  const drive = new FakeDrive();
  const E = device(drive, "devE", [mk("y1", "doc", null, "Race")]);
  const create = drive.api.create;
  drive.api.create = async (b) => {
    const r = await create(b);
    E.state.nodes = [];
    return r;
  };
  await pushToDrive(E.env);
  assert.equal(E.state.pending.length, 1);
  await pushToDrive(E.env);
  assert.equal(drive.live().length, 0);
});

test("a note removed from Drive behind our back is created again", async () => {
  const drive = new FakeDrive();
  const F = device(drive, "devF", [mk("z1", "doc", null, "Phoenix", "<p>1</p>")]);
  await pushToDrive(F.env);
  [...drive.files.values()][0].trashed = true;
  edit(F, "z1", { content: "<p>2</p>" });
  await pushToDrive(F.env);
  assert.equal(F.state.nodes[0].sync, undefined);
  await pushToDrive(F.env);
  assert.ok(!isDirty(F.state.nodes[0]));
  assert.equal(drive.live()[0].content, "<p>2</p>");
});

// ---------- conflicts ----------

async function twoDevicesWithOneNote() {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("n1", "doc", null, "Essay", "<p>start</p>")]);
  await pushToDrive(A.env);
  const B = device(drive, "devB");
  await pullFromDrive(B.env);
  return { drive, A, B, bId: B.state.nodes[0].id };
}

test("conflict found when saving: your version stays, the other is kept as a copy", async () => {
  const { drive, A, B, bId } = await twoDevicesWithOneNote();
  edit(B, bId, { content: "<p>B wrote this</p>" });
  await pushToDrive(B.env);
  edit(A, "n1", { content: "<p>A wrote this</p>" }); // A has not seen B's change
  await pushToDrive(A.env);

  assert.equal(drive.byName("Essay").content, "<p>A wrote this</p>");
  assert.equal(A.state.conflicts.length, 1);
  const copy = A.state.nodes.find((n) => n.name.startsWith("Essay (conflict copy"))!;
  assert.equal(copy.content, "<p>B wrote this</p>");
  assert.equal(A.state.nodes.find((n) => n.id === "n1")!.content, "<p>A wrote this</p>");

  await pushToDrive(A.env); // the copy itself gets saved to Drive
  assert.equal(drive.live().length, 2);
  assert.ok(A.state.nodes.every((n) => !isDirty(n)));

  await pullFromDrive(B.env); // B now sees A's version plus the copy holding B's own text
  assert.ok(B.state.nodes.some((n) => n.content === "<p>B wrote this</p>"));
});

test("conflict found when pulling: same outcome, and the next save goes through", async () => {
  const { drive, A, B, bId } = await twoDevicesWithOneNote();
  edit(B, bId, { content: "<p>B</p>" });
  await pushToDrive(B.env);
  edit(A, "n1", { content: "<p>A</p>" });
  await pullFromDrive(A.env);
  assert.equal(A.state.conflicts.length, 1);
  assert.equal(A.state.nodes.find((n) => n.id === "n1")!.content, "<p>A</p>");
  await pushToDrive(A.env);
  assert.equal(A.state.conflicts.length, 1, "no second conflict");
  assert.equal(drive.byName("Essay").content, "<p>A</p>");
});

test("our own earlier save (lost reply) is not treated as a conflict", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("n1", "doc", null, "Essay", "<p>1</p>")]);
  await pushToDrive(A.env);
  edit(A, "n1", { content: "<p>2</p>" });
  drive.loseNextReply = true;
  await assert.rejects(pushToDrive(A.env), SyncError);
  edit(A, "n1", { content: "<p>3</p>" });
  await pushToDrive(A.env);
  assert.equal(A.state.conflicts.length, 0);
  assert.equal(drive.live().length, 1);
  assert.equal(drive.live()[0].content, "<p>3</p>");
});

test("same text on both sides makes no copy", async () => {
  const { drive, A, B, bId } = await twoDevicesWithOneNote();
  edit(B, bId, { content: "<p>same</p>" });
  await pushToDrive(B.env);
  edit(A, "n1", { content: "<p>same</p>" });
  await pushToDrive(A.env);
  assert.equal(A.state.conflicts.length, 0);
  assert.equal(drive.live().length, 1);
});

test("a folder renamed on two devices keeps the local name without a copy", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("f1", "folder", null, "Bio")]);
  await pushToDrive(A.env);
  const B = device(drive, "devB");
  await pullFromDrive(B.env);
  edit(B, B.state.nodes[0].id, { name: "Biology" });
  await pushToDrive(B.env);
  edit(A, "f1", { name: "Life science" });
  await pushToDrive(A.env);
  assert.equal(A.state.conflicts.length, 0);
  assert.equal(drive.live()[0].n.name, "Life science");
});
