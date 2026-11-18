import assert from "node:assert/strict";
import { test } from "node:test";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Comment } from "../src/lib/editor/commentExtension";
import { Footnote } from "../src/lib/editor/footnoteExtension";
import { collectComments, collectFootnotes } from "../src/lib/editor/annotations";

const schema = getSchema([StarterKit, Comment, Footnote]);
const cm = (id: string, text: string, resolved = false) => ({ type: "comment", attrs: { id, text, created: 1000, resolved } });

const doc = schema.nodeFromJSON({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Once " },
        { type: "text", text: "upon", marks: [cm("c1", "Too cliché?")] },
        { type: "text", text: " a time" },
        { type: "footnote", attrs: { id: "f1", text: "A very old phrase." } },
      ],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "there ", marks: [cm("c2", "Fix", true)] },
        { type: "text", text: "was", marks: [cm("c2", "Fix", true), { type: "bold" }] },
        { type: "footnote", attrs: { id: "f2", text: "" } },
      ],
    },
  ],
});

test("comments are found in reading order with their quoted words", () => {
  const found = collectComments(doc);
  assert.deepEqual(found.map((c) => c.id), ["c1", "c2"]);
  assert.equal(found[0].quote, "upon");
  assert.equal(found[0].text, "Too cliché?");
  assert.equal(found[0].resolved, false);
});

test("a comment split across formatting is still one comment", () => {
  const c2 = collectComments(doc).find((c) => c.id === "c2")!;
  assert.equal(c2.quote, "there was");
  assert.equal(c2.resolved, true);
});

test("footnotes are found in reading order, empty ones included", () => {
  const found = collectFootnotes(doc);
  assert.deepEqual(found.map((f) => [f.id, f.text]), [["f1", "A very old phrase."], ["f2", ""]]);
});

test("a note with no comments or footnotes gives empty lists", () => {
  const plain = schema.nodeFromJSON({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] });
  assert.deepEqual(collectComments(plain), []);
  assert.deepEqual(collectFootnotes(plain), []);
});
