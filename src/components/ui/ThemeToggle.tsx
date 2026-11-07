"use client";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "./IconButton";
import type { Theme } from "@/hooks/useTheme";

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <IconButton
      icon={theme === "dark" ? Sun : Moon}
      label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      onClick={onToggle}
    />
  );
}
