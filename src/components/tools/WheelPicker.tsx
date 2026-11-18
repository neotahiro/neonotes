"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const ITEM = 40; // px per row, and the picker shows three rows

function scrollWheel(el: HTMLElement, top: number, smooth = false) {
  if (typeof el.scrollTo === "function") el.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  else el.scrollTop = top;
}

interface WheelPickerProps {
  label: string;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

/** A scrolling number wheel, like the one on a phone's alarm clock. Scroll, swipe, tap a number, or use the arrow keys. */
export function WheelPicker({ label, max, value, onChange }: WheelPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const items = Array.from({ length: max + 1 }, (_, i) => i);

  // Move the wheel when the value is changed from outside (the preset buttons).
  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ITEM) !== value) scrollWheel(el, value * ITEM);
  }, [value]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const next = Math.min(max, Math.max(0, Math.round(el.scrollTop / ITEM)));
      if (next !== value) onChange(next);
    }, 80);
  };

  const go = (next: number) => {
    const clamped = Math.min(max, Math.max(0, next));
    if (ref.current) scrollWheel(ref.current, clamped * ITEM, true);
    onChange(clamped);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[120px] w-16">
        <div className="pointer-events-none absolute inset-x-0 top-10 h-10 rounded-lg bg-hover" aria-hidden />
        <div
          ref={ref}
          role="spinbutton"
          tabIndex={0}
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          onScroll={onScroll}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); go(value - 1); }
            if (e.key === "ArrowDown") { e.preventDefault(); go(value + 1); }
          }}
          className="relative h-full snap-y snap-mandatory overflow-y-scroll py-10 outline-none [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)] [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)] [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-scrollbar]:hidden"
        >
          {items.map((i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onClick={() => go(i)}
              className={cn(
                "flex h-10 w-full snap-center items-center justify-center text-xl tabular-nums transition-colors",
                i === value ? "font-semibold text-ink" : "text-muted",
              )}
            >
              {String(i).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>
      <span className="mt-1 text-xs text-muted">{label}</span>
    </div>
  );
}
