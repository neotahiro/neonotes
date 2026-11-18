import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS, joinSettings, splitSettings, updateSettings } from "../src/lib/editor/noteSettings";
import { DEFAULT_SPACING } from "../src/lib/editor/spacing";
import { stripHtml } from "../src/lib/utils";

test("a note without a marker has the default settings and unchanged text", () => {
  const out = splitSettings("<p>Hello</p>");
  assert.equal(out.html, "<p>Hello</p>");
  assert.deepEqual(out.settings, DEFAULT_SETTINGS);
});

test("spacing and goal survive saving and loading", () => {
  const settings = { spacing: { lineHeight: 2, paragraph: 1.5, word: 0.1 }, goal: 1500 };
  const out = splitSettings(joinSettings("<p>Hello</p>", settings));
  assert.equal(out.html, "<p>Hello</p>");
  assert.deepEqual(out.settings, settings);
});

test("default settings add nothing to the note", () => {
  assert.equal(joinSettings("<p>Hello</p>", DEFAULT_SETTINGS), "<p>Hello</p>");
});

test("a goal alone is saved even with default spacing", () => {
  const stored = joinSettings("<p>Hi</p>", { spacing: DEFAULT_SPACING, goal: 500 });
  assert.deepEqual(splitSettings(stored).settings.goal, 500);
});

test("notes saved before goals existed still load", () => {
  const old = '<!--neonotes:{"lh":2,"ps":1.1,"ws":0}--><p>a</p>';
  const out = splitSettings(old);
  assert.equal(out.settings.goal, null);
  assert.equal(out.settings.spacing.lineHeight, 2);
});

test("damaged or unreasonable values fall back to the defaults", () => {
  assert.deepEqual(splitSettings('<!--neonotes:{"lh":99,"ps":"x","goal":-5}--><p>a</p>').settings, DEFAULT_SETTINGS);
  assert.equal(splitSettings('<!--neonotes:{"goal":1.5}--><p>a</p>').settings.goal, null);
  assert.equal(splitSettings('<!--neonotes:{"goal":99999999}--><p>a</p>').settings.goal, null);
  assert.equal(splitSettings("<!--neonotes:{oops}--><p>a</p>").html, "<p>a</p>");
});

test("updating one setting keeps the others and the text", () => {
  const first = updateSettings("<p>Hello</p>", { goal: 300 });
  const second = updateSettings(first, { spacing: { lineHeight: 2.4, paragraph: 1.1, word: 0 } });
  const out = splitSettings(second);
  assert.equal(out.html, "<p>Hello</p>");
  assert.equal(out.settings.goal, 300);
  assert.equal(out.settings.spacing.lineHeight, 2.4);
  assert.equal(splitSettings(updateSettings(second, { goal: null })).settings.goal, null);
});

test("the marker is invisible to search", () => {
  assert.equal(stripHtml(joinSettings("<p>Hello</p>", { spacing: DEFAULT_SPACING, goal: 100 })), "Hello");
});
