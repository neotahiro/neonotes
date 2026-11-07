"use client";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { Theme } from "@/hooks/useTheme";
import { useModKey } from "@/hooks/useModKey";
import type { SaveStatus } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";

interface TopBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  crumbs: string[];
  status: SaveStatus;
  theme: Theme;
  onToggleTheme: () => void;
}

const statusText: Record<SaveStatus, string> = {
  loading: "",
  saving: "Saving…",
  synced: "Saved to Google Drive",
  offline: "Saved on this device. Drive sync will retry.",
  reauth: "Drive disconnected. Sign out and sign in again.",
  error: "Not saved. Check your connection.",
};

const tone: Record<SaveStatus, string> = {
  loading: "hidden",
  saving: "hidden text-muted sm:inline",
  synced: "hidden text-muted sm:inline",
  offline: "text-muted",
  reauth: "text-red-600 dark:text-red-400",
  error: "text-red-600 dark:text-red-400",
};

export function TopBar({ sidebarOpen, onToggleSidebar, crumbs, status, theme, onToggleTheme }: TopBarProps) {
  const mod = useModKey();
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-3">
      <IconButton
        icon={sidebarOpen ? PanelLeftClose : PanelLeft}
        label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        shortcut={`${mod}+\\`}
        onClick={onToggleSidebar}
      />
      <p className="min-w-0 flex-1 truncate text-sm text-muted">{crumbs.join(" / ")}</p>
      <span
        role="status"
        aria-live="polite"
        className={cn("max-w-[45%] truncate text-xs", tone[status])}
      >
        {statusText[status]}
      </span>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}
