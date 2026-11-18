import assert from "node:assert/strict";
import { test } from "node:test";
import { LINE_HEIGHTS, stepValue } from "../src/lib/editor/spacing";

test("stepping moves through the list and stops at the ends", () => {
  assert.equal(stepValue(LINE_HEIGHTS, 1.75, 1), 2);
  assert.equal(stepValue(LINE_HEIGHTS, 1.75, -1), 1.6);
  assert.equal(stepValue(LINE_HEIGHTS, 3, 1), 3);
  assert.equal(stepValue(LINE_HEIGHTS, 1.2, -1), 1.2);
});
