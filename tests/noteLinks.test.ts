import assert from "node:assert/strict";
import { test } from "node:test";
import { filterNotes, type NoteRef } from "../src/lib/editor/noteLinks";

const notes: NoteRef[] = [
  { id: "a", name: "Chapter 1", path: "Novel" },
  { id: "b", name: "Character list", path: "Novel" },
  { id: "c", name: "Plot chapter ideas", path: "" },
  { id: "d", name: "", path: "" },
  { id: "me", name: "Current note", path: "" },
];

test("titles that start with the search come before titles that only contain it", () => {
  const out = filterNotes(notes, "cha", "me").map((n) => n.id);
  assert.deepEqual(out, ["a", "b", "c"]);
});

test("the note being edited is never offered", () => {
  assert.ok(!filterNotes(notes, "", "me").some((n) => n.id === "me"));
  assert.equal(filterNotes(notes, "current", "me").length, 0);
});

test("searching ignores capital letters and extra spaces", () => {
  assert.deepEqual(filterNotes(notes, "  PLOT ", "me").map((n) => n.id), ["c"]);
});

test("untitled notes can be found by typing Untitled", () => {
  assert.deepEqual(filterNotes(notes, "untitled", "me").map((n) => n.id), ["d"]);
});

test("the list is capped", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, name: `Note ${i}`, path: "" }));
  assert.equal(filterNotes(many, "", null).length, 8);
  assert.equal(filterNotes(many, "", null, 3).length, 3);
});
