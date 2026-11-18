import assert from "node:assert/strict";
import { test } from "node:test";
import {
  IDLE, MAX_TIMER_MS, addTime, describeDuration, formatClock, fromMs, loadTimer, pauseTimer, remainingMs, resumeTimer,
  startTimer, tickTimer, toMs,
} from "../src/lib/timer";

const MIN = 60_000;

test("a timer counts down to zero and then finishes", () => {
  const s = startTimer(25 * MIN, 1000);
  assert.equal(remainingMs(s, 1000 + 10 * MIN), 15 * MIN);
  assert.equal(tickTimer(s, 1000 + 24 * MIN).status, "running");
  const done = tickTimer(s, 1000 + 25 * MIN);
  assert.equal(done.status, "done");
  assert.equal(remainingMs(done, 1000 + 26 * MIN), 0);
});

test("pausing keeps the time left, and resuming carries on from it", () => {
  const paused = pauseTimer(startTimer(10 * MIN, 0), 4 * MIN);
  assert.equal(paused.status, "paused");
  assert.equal(remainingMs(paused, 99 * MIN), 6 * MIN);
  const resumed = resumeTimer(paused, 50 * MIN);
  assert.equal(remainingMs(resumed, 52 * MIN), 4 * MIN);
});

test("adding time extends a running timer and restarts a finished one", () => {
  const running = addTime(startTimer(5 * MIN, 0), MIN, 0);
  assert.equal(remainingMs(running, 0), 6 * MIN);
  const done = tickTimer(startTimer(MIN, 0), 2 * MIN);
  const again = addTime(done, 5 * MIN, 10 * MIN);
  assert.equal(again.status, "running");
  assert.equal(remainingMs(again, 10 * MIN), 5 * MIN);
});

test("a zero-length timer does not start, and very long ones are capped", () => {
  assert.deepEqual(startTimer(0, 0), IDLE);
  assert.equal(startTimer(99 * 3600_000, 0).totalMs, MAX_TIMER_MS);
});

test("a saved timer that ran out while the app was closed shows as finished", () => {
  const saved = JSON.stringify(startTimer(5 * MIN, 0));
  assert.equal(loadTimer(saved, 3 * MIN).status, "running");
  assert.equal(loadTimer(saved, 6 * MIN).status, "done");
});

test("damaged saved timers are ignored", () => {
  assert.deepEqual(loadTimer(null, 0), IDLE);
  assert.deepEqual(loadTimer("not json", 0), IDLE);
  assert.deepEqual(loadTimer('{"status":"running","totalMs":"x"}', 0), IDLE);
  assert.deepEqual(loadTimer('{"status":"idle","totalMs":1,"endsAt":1,"pausedLeft":1}', 0), IDLE);
});

test("hours, minutes and seconds convert both ways", () => {
  assert.equal(toMs(1, 30, 15), 5415_000);
  assert.deepEqual(fromMs(5415_000), { hours: 1, minutes: 30, seconds: 15 });
  assert.equal(toMs(0, 0, 0), 0);
});

test("the clock text rounds up and adds hours only when needed", () => {
  assert.equal(formatClock(24 * MIN + 59_200), "25:00");
  assert.equal(formatClock(59_000), "0:59");
  assert.equal(formatClock(3600_000 + 5 * MIN), "1:05:00");
  assert.equal(formatClock(0), "0:00");
});

test("durations are described in plain words", () => {
  assert.equal(describeDuration(25 * MIN), "25 minutes");
  assert.equal(describeDuration(MIN), "1 minute");
  assert.equal(describeDuration(90 * MIN), "1 hour 30 minutes");
  assert.equal(describeDuration(45_000), "45 seconds");
});
