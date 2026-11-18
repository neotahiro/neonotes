import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SIZE, emToPx, sizeToEm, stepSize } from "../src/lib/editor/fontSize";

test("sizes convert to em and back", () => {
  assert.equal(sizeToEm(16), "1em");
  assert.equal(sizeToEm(24), "1.5em");
  assert.equal(emToPx("1.5em"), 24);
  assert.equal(emToPx(sizeToEm(18)), 18);
});

test("only sensible em values are accepted", () => {
  assert.equal(emToPx("18px"), null);
  assert.equal(emToPx("calc(1em)"), null);
  assert.equal(emToPx("0.1em"), null);
  assert.equal(emToPx("50em"), null);
  assert.equal(emToPx(""), null);
  assert.equal(emToPx(null), null);
});

test("stepping moves through the size list and stops at the ends", () => {
  assert.equal(stepSize(DEFAULT_SIZE, 1), 18);
  assert.equal(stepSize(DEFAULT_SIZE, -1), 14);
  assert.equal(stepSize(17, 1), 18);
  assert.equal(stepSize(17, -1), 16);
  assert.equal(stepSize(64, 1), 64);
  assert.equal(stepSize(10, -1), 10);
});

import { toHex } from "../src/lib/editor/palette";

test("saved rgb colours match the hex swatches", () => {
  assert.equal(toHex("rgb(239, 68, 68)"), "#ef4444");
  assert.equal(toHex("#EF4444"), "#ef4444");
  assert.equal(toHex(null), null);
});
