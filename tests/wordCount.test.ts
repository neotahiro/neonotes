import assert from "node:assert/strict";
import { test } from "node:test";
import { countWords } from "../src/lib/editor/wordCount";

test("counts words separated by spaces, tabs and new lines", () => {
  assert.equal(countWords("one two\tthree\nfour"), 4);
});

test("empty and whitespace-only text has no words", () => {
  assert.equal(countWords(""), 0);
  assert.equal(countWords("  \n\t "), 0);
});

test("extra spaces around and between words are ignored", () => {
  assert.equal(countWords("  hello    world  "), 2);
});
