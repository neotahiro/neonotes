"use client";
import { useState } from "react";
import { ChevronsUpDown, LogOut } from "lucide-react";

// Placeholder identity. Replaced by the Google session in the auth step.
const user = { name: "Your name", email: "you@gmail.com" };

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative border-t border-line p-2">
      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-1 rounded-lg border border-line bg-paper p-1 shadow-lg">
          <button
            type="button"
            disabled
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Sign out (after sign-in is added)
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-hover"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-paper">
          {user.name[0]}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm">{user.name}</span>
          <span className="block truncate text-xs text-muted">{user.email}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
      </button>
    </div>
  );
}
