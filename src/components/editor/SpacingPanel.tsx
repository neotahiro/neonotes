"use client";
import { Minus, Plus } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import {
  DEFAULT_SPACING, LINE_HEIGHTS, PARAGRAPH_GAPS, WORD_GAPS, isDefaultSpacing, stepValue, type Spacing,
} from "@/lib/editor/spacing";

interface RowProps {
  label: string;
  hint: string;
  list: number[];
  value: number;
  onChange: (value: number) => void;
}

function Row({ label, hint, list, value, onChange }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div role="group" aria-label={label} className="flex shrink-0 items-center gap-1">
        <IconButton icon={Minus} label={`Decrease ${label.toLowerCase()}`} disabled={value === list[0]} onClick={() => onChange(stepValue(list, value, -1))} />
        <span className="w-10 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
        <IconButton icon={Plus} label={`Increase ${label.toLowerCase()}`} disabled={value === list[list.length - 1]} onClick={() => onChange(stepValue(list, value, 1))} />
      </div>
    </div>
  );
}

export function SpacingPanel({ spacing, onChange }: { spacing: Spacing; onChange: (next: Spacing) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Spacing for the whole note</p>
        <button
          type="button"
          disabled={isDefaultSpacing(spacing)}
          onClick={() => onChange(DEFAULT_SPACING)}
          className="h-7 rounded-md px-2 text-xs text-muted transition-colors hover:bg-hover hover:text-ink disabled:opacity-35"
        >
          Reset
        </button>
      </div>
      <Row label="Line spacing" hint="Space between lines" list={LINE_HEIGHTS} value={spacing.lineHeight} onChange={(lineHeight) => onChange({ ...spacing, lineHeight })} />
      <Row label="Paragraph spacing" hint="Gap between paragraphs" list={PARAGRAPH_GAPS} value={spacing.paragraph} onChange={(paragraph) => onChange({ ...spacing, paragraph })} />
      <Row label="Word spacing" hint="Space between words" list={WORD_GAPS} value={spacing.word} onChange={(word) => onChange({ ...spacing, word })} />
    </div>
  );
}
