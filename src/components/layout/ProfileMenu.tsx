"use client";
import { useEffect, useState } from "react";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions";
import type { UserInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

type DriveState = "idle" | "checking" | "connected" | "reauth" | "error";

const driveText: Record<DriveState, string> = {
  idle: "",
  checking: "Checking Google Drive…",
  connected: "Google Drive connected",
  reauth: "Drive not connected. Sign out and sign in again.",
  error: "Couldn’t reach Google Drive. Try again later.",
};

export function ProfileMenu({ user }: { user: UserInfo }) {
  const [open, setOpen] = useState(false);
  const [drive, setDrive] = useState<DriveState>("idle");

  // Check the Drive connection each time the menu opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDrive("checking");
    fetch("/api/drive/status", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) return setDrive("connected");
        const body = (await res.json().catch(() => ({}))) as { reason?: string };
        setDrive(body.reason === "reauth" || body.reason === "signed-out" ? "reauth" : "error");
      })
      .catch(() => !cancelled && setDrive("error"));
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <div className="relative border-t border-line p-2">
      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-1 rounded-lg border border-line bg-paper p-1 shadow-lg">
          <p
            role="status"
            className={cn(
              "px-2 py-1.5 text-xs",
              drive === "connected" ? "text-accent" : drive === "reauth" || drive === "error" ? "text-red-600 dark:text-red-400" : "text-muted",
            )}
          >
            {driveText[drive]}
          </p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-hover"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Sign out
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-hover"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-8 w-8 shrink-0 rounded-full" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-paper">
            {(user.name[0] ?? "?").toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm">{user.name}</span>
          <span className="block truncate text-xs text-muted">{user.email}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
      </button>
    </div>
  );
}
