"use client";
import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    cancelButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="relative w-full max-w-sm rounded-xl border border-line bg-paper p-5 shadow-xl"
      >
        <h2 id="confirm-title" className="font-serif text-lg font-semibold">{title}</h2>
        <p id="confirm-message" className="mt-1.5 text-sm text-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelButton}
            type="button"
            onClick={onCancel}
            className="rounded-md px-3.5 py-2 text-sm transition-colors hover:bg-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
