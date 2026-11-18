"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { playAlarm } from "@/lib/alarm";
import {
  DEFAULT_TIMER_MS, IDLE, addTime, loadTimer, pauseTimer, remainingMs, resumeTimer, startTimer, tickTimer, type TimerState,
} from "@/lib/timer";

const KEY = "noenotes-timer";
const LAST_KEY = "noenotes-timer-last";

/** The writing timer. It lives for the whole app, so it keeps running while you switch notes. */
export function useTimer() {
  const [state, setState] = useState<TimerState>(IDLE);
  const [now, setNow] = useState(() => Date.now());
  const [lastMs, setLastMs] = useState(DEFAULT_TIMER_MS);
  const [loaded, setLoaded] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const previous = useRef<TimerState["status"]>("idle");

  // Pick up a saved timer (and the last length used) when the app opens.
  useEffect(() => {
    try {
      const t = Date.now();
      setNow(t);
      setState(loadTimer(localStorage.getItem(KEY), t));
      const last = Number(localStorage.getItem(LAST_KEY));
      if (Number.isFinite(last) && last > 0) setLastMs(last);
    } catch {
      /* storage unavailable */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state, loaded]);

  // Tick while running, and re-check the moment the app comes back to the front.
  useEffect(() => {
    if (state.status !== "running") return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      setState((s) => tickTimer(s, t));
    };
    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [state.status]);

  // Ring once, only when we actually watched it run out (not when a finished timer is loaded from storage).
  useEffect(() => {
    if (previous.current === "running" && state.status === "done") playAlarm(audio.current);
    previous.current = state.status;
  }, [state.status]);

  const start = useCallback((ms: number) => {
    try {
      // Created here, inside the tap, so the browser lets the alarm make sound later.
      audio.current ??= new AudioContext();
      void audio.current.resume();
    } catch {
      /* no sound available */
    }
    const t = Date.now();
    const next = startTimer(ms, t);
    if (next.status === "running") {
      setLastMs(next.totalMs);
      try { localStorage.setItem(LAST_KEY, String(next.totalMs)); } catch { /* storage unavailable */ }
    }
    setNow(t);
    setState(next);
  }, []);

  const pause = useCallback(() => setState((s) => pauseTimer(s, Date.now())), []);
  const resume = useCallback(() => { setNow(Date.now()); setState((s) => resumeTimer(s, Date.now())); }, []);
  const addMs = useCallback((ms: number) => { setNow(Date.now()); setState((s) => addTime(s, ms, Date.now())); }, []);
  const cancel = useCallback(() => setState(IDLE), []);

  return { state, remaining: remainingMs(state, now), lastMs, start, pause, resume, addMs, cancel };
}

export type TimerApi = ReturnType<typeof useTimer>;
