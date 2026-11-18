import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalId, findNoteById, noteAliases } from "../src/lib/noteIds";
import { pullFromDrive, pushToDrive } from "../src/lib/sync/engine";
import type { WorkspaceNode } from "../src/lib/types";
import { FakeDrive, device, edit, mk } from "./helpers";

test("a second device gives imported notes the same ids as the first device", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("f1", "folder", null, "Bio"), mk("n1", "doc", "f1", "Note", "<p>1</p>")]);
  await pushToDrive(A.env);
  const B = device(drive, "devB");
  await pullFromDrive(B.env);
  assert.deepEqual(B.state.nodes.map((n) => n.id).sort(), ["f1", "n1"]);
  assert.equal(B.state.nodes.find((n) => n.id === "n1")!.parentId, "f1");
});

test("a note restored from the trash comes back with its original id", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("n1", "doc", null, "Essay", "<p>x</p>")]);
  await pushToDrive(A.env);
  const driveId = A.state.nodes[0].sync!.driveId;
  A.state.pending = [driveId];
  A.state.nodes = [];
  await pushToDrive(A.env);
  assert.equal(A.state.nodes.length, 0);
  drive.restore(driveId);
  await pullFromDrive(A.env);
  assert.equal(A.state.nodes.length, 1);
  assert.equal(A.state.nodes[0].id, "n1");
  assert.equal(A.state.nodes[0].content, "<p>x</p>");
});

test("an id already in use is not given to a second note", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("n1", "doc", null, "One", "a")]);
  await pushToDrive(A.env);
  // A different device holds an unsynced note that happens to use the same id.
  const B = device(drive, "devB", [mk("n1", "doc", null, "Other", "b")]);
  await pullFromDrive(B.env);
  assert.equal(new Set(B.state.nodes.map((n) => n.id)).size, B.state.nodes.length);
  assert.equal(B.state.nodes.length, 2);
});

test("notes pulled before this change learn their original id, and keep it after edits", async () => {
  const drive = new FakeDrive();
  const A = device(drive, "devA", [mk("n1", "doc", null, "Note", "<p>1</p>")]);
  await pushToDrive(A.env);
  const driveId = A.state.nodes[0].sync!.driveId;
  // An older device that stored the note under its Drive id.
  const old: WorkspaceNode = { ...mk(driveId, "doc", null, "Note", "<p>1</p>"), sync: { driveId, version: 0, parentId: null, modified: drive.files.get(driveId)!.n.modified } };
  old.updatedAt = old.sync!.version;
  const B = device(drive, "devB", [old]);
  await pullFromDrive(B.env);
  assert.equal(B.state.nodes[0].id, driveId);
  assert.equal(B.state.nodes[0].sync!.localId, "n1");
  assert.equal(canonicalId(B.state.nodes[0]), "n1");
  edit(B, driveId, { content: "<p>2</p>" });
  await pushToDrive(B.env);
  assert.equal(B.state.nodes[0].sync!.localId, "n1");
});

test("a link finds its note by any id the note has had", () => {
  const n: WorkspaceNode = { ...mk("local1", "doc", null, "Note"), sync: { driveId: "drive1", version: 1, parentId: null, modified: "t", localId: "orig1" } };
  const folder = mk("fold", "folder", null, "Folder");
  assert.deepEqual(noteAliases(n).sort(), ["drive1", "local1", "orig1"]);
  for (const id of ["local1", "drive1", "orig1"]) assert.equal(findNoteById([folder, n], id), n);
  assert.equal(findNoteById([folder, n], "nope"), undefined);
  assert.equal(findNoteById([folder], "fold"), undefined);
});
