import assert from "node:assert/strict";
import { test } from "node:test";
import { addTag, collectTags, hasTag, removeTag } from "../src/lib/tags";

test("tag totals count notes, ignore capital letters, and show the most common spelling", () => {
  const out = collectTags([["Story", "plot"], ["story"], ["Story", "Plot"], []]);
  assert.deepEqual(out, [{ name: "plot", count: 2 }, { name: "Story", count: 3 }]);
});

test("adding a tag cleans it and ignores repeats and empties", () => {
  assert.deepEqual(addTag([], "  #Ideas! "), ["Ideas"]);
  assert.deepEqual(addTag(["Ideas"], "ideas"), ["Ideas"]);
  assert.deepEqual(addTag(["a"], "!!!"), ["a"]);
});

test("a note holds at most twelve tags", () => {
  const full = Array.from({ length: 12 }, (_, i) => `t${i}`);
  assert.deepEqual(addTag(full, "extra"), full);
});

test("removing and finding tags ignores capital letters", () => {
  assert.deepEqual(removeTag(["Story", "plot"], "STORY"), ["plot"]);
  assert.equal(hasTag(["Story"], "story"), true);
  assert.equal(hasTag(["Story"], "other"), false);
});
