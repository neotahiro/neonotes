"use client";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Minus, Plus, type LucideIcon } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import { FONTS, FONT_GROUPS } from "@/lib/editor/fonts";
import { DEFAULT_SIZE, emToPx, sizeToEm, stepSize } from "@/lib/editor/fontSize";
import { HIGHLIGHT_COLORS, TEXT_COLORS, toHex } from "@/lib/editor/palette";
import { useModKey } from "@/hooks/useModKey";

type Align = "left" | "center" | "right" | "justify";
const ALIGNS: { value: Align; label: string; icon: LucideIcon; key: string }[] = [
  { value: "left", label: "Align left", icon: AlignLeft, key: "L" },
  { value: "center", label: "Align centre", icon: AlignCenter, key: "E" },
  { value: "right", label: "Align right", icon: AlignRight, key: "R" },
  { value: "justify", label: "Justify", icon: AlignJustify, key: "J" },
];

function SwatchButton({ color, label, active, onClick }: { color: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      style={{ background: color }}
      className={cn(
        "h-6 w-6 shrink-0 rounded-full border border-black/10 dark:border-white/20",
        active && "ring-2 ring-accent ring-offset-2 ring-offset-sidebar",
      )}
    />
  );
}

const Label = ({ children }: { children: string }) => (
  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{children}</p>
);

const textButton = "h-7 rounded-md px-2 text-xs text-muted transition-colors hover:bg-hover hover:text-ink";

export function StylePanel({ editor }: { editor: Editor }) {
  const mod = useModKey();
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const text = e?.getAttributes("textStyle") ?? {};
      return {
        family: (text.fontFamily as string | undefined) ?? null,
        size: emToPx(text.fontSize as string | undefined) ?? DEFAULT_SIZE,
        color: toHex(text.color as string | undefined),
        highlight: toHex(e?.getAttributes("highlight").color as string | undefined),
        align: (ALIGNS.find((a) => e?.isActive({ textAlign: a.value }))?.value ?? "left") as Align,
      };
    },
  });
  const chain = () => editor.chain().focus();

  const setSize = (px: number) => {
    if (px === DEFAULT_SIZE) chain().unsetFontSize().run();
    else chain().setFontSize(sizeToEm(px)).run();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Alignment" className="flex gap-0.5">
          {ALIGNS.map((a) => (
            <IconButton
              key={a.value}
              icon={a.icon}
              label={a.label}
              shortcut={`${mod}+Shift+${a.key}`}
              active={s.align === a.value}
              onClick={() => chain().setTextAlign(a.value).run()}
            />
          ))}
        </div>
        <div role="group" aria-label="Font size" className="flex items-center gap-1">
          <IconButton icon={Minus} label="Smaller text" onClick={() => setSize(stepSize(s.size, -1))} />
          <span className="w-9 text-center text-sm tabular-nums" aria-live="polite">{s.size}</span>
          <IconButton icon={Plus} label="Larger text" onClick={() => setSize(stepSize(s.size, 1))} />
          <button type="button" className={textButton} onClick={() => setSize(DEFAULT_SIZE)}>Reset</button>
        </div>
      </div>

      <div>
        <Label>Font</Label>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => chain().unsetFontFamily().run()}
            aria-pressed={s.family === null}
            className={cn("h-8 w-full rounded-md px-2.5 text-left text-sm transition-colors", s.family === null ? "bg-accent-soft text-accent" : "hover:bg-hover")}
          >
            Default
          </button>
          {FONT_GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-1 text-[11px] text-muted">{group}</p>
              <div className="grid grid-cols-2 gap-1">
                {FONTS.filter((f) => f.group === group).map((f) => (
                  <button
                    key={f.css}
                    type="button"
                    onClick={() => chain().setFontFamily(f.css).run()}
                    aria-pressed={s.family === f.css}
                    style={{ fontFamily: f.css }}
                    className={cn("h-9 truncate rounded-md px-2.5 text-left text-base transition-colors", s.family === f.css ? "bg-accent-soft text-accent" : "hover:bg-hover")}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Text colour</Label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={textButton} onClick={() => chain().unsetColor().removeEmptyTextStyle().run()}>Default</button>
          {TEXT_COLORS.map((c) => (
            <SwatchButton
              key={c.value}
              color={c.value}
              label={c.name}
              active={s.color === c.value}
              onClick={() => chain().setColor(c.value).run()}
            />
          ))}
        </div>
      </div>

      <div>
        <Label>Highlight</Label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={textButton} onClick={() => chain().unsetHighlight().run()}>None</button>
          {HIGHLIGHT_COLORS.map((c) => (
            <SwatchButton
              key={c.value}
              color={c.value}
              label={c.name}
              active={s.highlight === c.value}
              onClick={() => chain().setHighlight({ color: c.value }).run()}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
