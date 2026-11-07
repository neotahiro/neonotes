import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function IconButton({ icon: Icon, label, onClick, active, disabled, size = "md", className }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-35",
        size === "md" ? "h-8 w-8" : "h-6 w-6",
        active ? "bg-accent-soft text-accent" : "text-muted hover:bg-hover hover:text-ink",
        className,
      )}
    >
      <Icon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} strokeWidth={1.75} />
    </button>
  );
}
