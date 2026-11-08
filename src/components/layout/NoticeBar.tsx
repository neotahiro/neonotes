"use client";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

export function NoticeBar({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div role="status" className="flex shrink-0 items-start gap-2 border-y border-line bg-accent-soft px-4 py-2 text-sm">
      <p className="min-w-0 flex-1">{message}</p>
      <IconButton size="sm" icon={X} label="Dismiss" onClick={onDismiss} />
    </div>
  );
}
