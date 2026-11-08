"use client";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { pullFromDrive, pushToDrive, type SyncEnv } from "@/lib/sync/engine";
import { isDirty } from "@/lib/sync/merge";
import { getDeviceId } from "@/lib/sync/device";
import { remoteApi, SyncError } from "@/lib/sync/remote";
import type { WorkspaceNode } from "@/lib/types";

export type DriveState = "idle" | "syncing" | "offline" | "reauth";

const SYNC_DELAY_MS = 1500;
const REFRESH_AFTER_MS = 60_000;

interface Args {
  ready: boolean;
  nodes: WorkspaceNode[];
  pendingDeletes: string[];
  nodesRef: MutableRefObject<WorkspaceNode[]>;
  pendingRef: MutableRefObject<string[]>;
  mutate: SyncEnv["mutate"];
  mutatePending: SyncEnv["mutatePending"];
  onRefreshed: (id: string) => void;
  onConflict: (copyName: string) => void;
}

/** Keeps the workspace in step with Google Drive: pulls on start and when you return, pushes shortly after edits. */
export function useDriveSync(a: Args) {
  const { ready, nodes, pendingDeletes } = a;
  const [driveState, setDriveState] = useState<DriveState>("idle");
  const running = useRef(false);
  const rerun = useRef<{ pull: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failures = useRef(0);
  const lastPull = useRef(0);
  const stopped = useRef(false); // set when Drive access is lost; needs a fresh sign-in
  const started = useRef(false);
  const runRef = useRef<(pull: boolean) => Promise<void>>(async () => {});

  const hasWork = nodes.some(isDirty) || pendingDeletes.length > 0;

  runRef.current = async (withPull: boolean) => {
    if (stopped.current) return;
    if (running.current) {
      rerun.current = { pull: (rerun.current?.pull ?? false) || withPull };
      return;
    }
    running.current = true;
    setDriveState("syncing");
    const env: SyncEnv = {
      nodes: () => a.nodesRef.current,
      pending: () => a.pendingRef.current,
      mutate: a.mutate,
      mutatePending: a.mutatePending,
      onRefreshed: a.onRefreshed,
      onConflict: a.onConflict,
      deviceId: getDeviceId(),
      api: remoteApi,
    };
    try {
      if (withPull) {
        await pullFromDrive(env);
        lastPull.current = Date.now();
      }
      await pushToDrive(env);
      failures.current = 0;
      setDriveState("idle");
    } catch (err) {
      if (err instanceof SyncError && err.kind === "reauth") {
        stopped.current = true;
        setDriveState("reauth");
      } else {
        failures.current += 1;
        setDriveState("offline");
        if (timer.current) clearTimeout(timer.current);
        const delay = Math.min(60_000, 5_000 * 2 ** (failures.current - 1));
        timer.current = setTimeout(() => void runRef.current(withPull), delay);
      }
    } finally {
      running.current = false;
      const again = rerun.current;
      rerun.current = null;
      if (again && !stopped.current) void runRef.current(again.pull);
    }
  };

  // First sync as soon as the local data is loaded.
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    void runRef.current(true);
  }, [ready]);

  // Sync shortly after any change.
  useEffect(() => {
    if (!ready || stopped.current || !hasWork) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void runRef.current(false), SYNC_DELAY_MS);
  }, [nodes, pendingDeletes, ready, hasWork]);

  // Retry when the connection comes back; refresh when you return to the tab.
  const retry = useCallback(() => void runRef.current(true), []);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastPull.current > REFRESH_AFTER_MS) retry();
    };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [retry]);

  // If Drive can't be reached, warn before the tab is closed with changes that exist only on this device.
  const atRisk = hasWork && (driveState === "offline" || driveState === "reauth");
  useEffect(() => {
    if (!atRisk) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [atRisk]);

  return { driveState, hasWork, syncNow: retry };
}
