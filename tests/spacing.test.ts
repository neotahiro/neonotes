import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SPACING, LINE_HEIGHTS, joinSpacing, splitSpacing, stepValue } from "../src/lib/editor/spacing";
import { stripHtml } from "../src/lib/utils";

test("a note without a marker has the default spacing and unchanged text", () => {
  const out = splitSpacing("<p>Hello</p>");
  assert.equal(out.html, "<p>Hello</p>");
  assert.deepEqual(out.spacing, DEFAULT_SPACING);
});

test("spacing survives saving and loading", () => {
  const spacing = { lineHeight: 2, paragraph: 1.5, word: 0.1 };
  const stored = joinSpacing("<p>Hello</p>", spacing);
  const out = splitSpacing(stored);
  assert.equal(out.html, "<p>Hello</p>");
  assert.deepEqual(out.spacing, spacing);
});

test("default spacing adds nothing to the note", () => {
  assert.equal(joinSpacing("<p>Hello</p>", DEFAULT_SPACING), "<p>Hello</p>");
});

test("damaged or unexpected values fall back to the defaults", () => {
  assert.deepEqual(splitSpacing('<!--neonotes:{"lh":99,"ps":"x"}--><p>a</p>').spacing, DEFAULT_SPACING);
  assert.equal(splitSpacing("<!--neonotes:{oops}--><p>a</p>").html, "<p>a</p>");
});

test("the marker is invisible to search", () => {
  const stored = joinSpacing("<p>Hello</p>", { lineHeight: 2, paragraph: 1.1, word: 0 });
  assert.equal(stripHtml(stored), "Hello");
});

test("stepping moves through the list and stops at the ends", () => {
  assert.equal(stepValue(LINE_HEIGHTS, 1.75, 1), 2);
  assert.equal(stepValue(LINE_HEIGHTS, 1.75, -1), 1.6);
  assert.equal(stepValue(LINE_HEIGHTS, 3, 1), 3);
  assert.equal(stepValue(LINE_HEIGHTS, 1.2, -1), 1.2);
});
