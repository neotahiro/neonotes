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
  saved: "Saved on this device",
  error: "Not saved: browser storage is unavailable",
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
        className={cn(
          "text-xs",
          status === "error" ? "text-red-600 dark:text-red-400" : "hidden text-muted sm:inline",
        )}
      >
        {statusText[status]}
      </span>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}
