"use client";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { Theme } from "@/hooks/useTheme";

interface TopBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  crumbs: string[];
  theme: Theme;
  onToggleTheme: () => void;
}

export function TopBar({ sidebarOpen, onToggleSidebar, crumbs, theme, onToggleTheme }: TopBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-3">
      <IconButton
        icon={sidebarOpen ? PanelLeftClose : PanelLeft}
        label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        onClick={onToggleSidebar}
      />
      <p className="min-w-0 flex-1 truncate text-sm text-muted">{crumbs.join(" / ")}</p>
      {/* Becomes live status (saving / offline / saved) in the Drive step */}
      <span className="hidden text-xs text-muted sm:inline">Not synced · sample data</span>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}
