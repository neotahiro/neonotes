"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignVerticalSpaceAround, Bold, Heading1, Heading2, Heading3, Italic, Link2, List, ListOrdered, Minus,
  Pilcrow, Quote, Redo2, Strikethrough, Type, Underline, Undo2,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useModKey } from "@/hooks/useModKey";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { StylePanel } from "./StylePanel";
import { SpacingPanel } from "./SpacingPanel";
import type { Spacing } from "@/lib/editor/spacing";

/** Returns a safe address, or null if it can't be used. Only http, https and mailto are allowed. */
function parseUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return /^(https?:|mailto:)/i.test(url) ? url : null;
  return `https://${url}`;
}

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />;

interface ToolbarProps {
  editor: Editor;
  spacing: Spacing;
  onSpacingChange: (next: Spacing) => void;
}

export function Toolbar({ editor, spacing, onSpacingChange }: ToolbarProps) {
  const mod = useModKey();
  const keyboard = useKeyboardInset();
  const [linkOpen, setLinkOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [spacingOpen, setSpacingOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState("");
  const [hasTarget, setHasTarget] = useState(true);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
      p: e?.isActive("paragraph") ?? false,
      h1: e?.isActive("heading", { level: 1 }) ?? false,
      h2: e?.isActive("heading", { level: 2 }) ?? false,
      h3: e?.isActive("heading", { level: 3 }) ?? false,
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      underline: e?.isActive("underline") ?? false,
      strike: e?.isActive("strike") ?? false,
      bullet: e?.isActive("bulletList") ?? false,
      ordered: e?.isActive("orderedList") ?? false,
      quote: e?.isActive("blockquote") ?? false,
      link: e?.isActive("link") ?? false,
    }),
  });
  const chain = () => editor.chain().focus();

  const openLink = useCallback(() => {
    const existing = (editor.getAttributes("link").href as string | undefined) ?? "";
    setLinkValue(existing);
    setLinkError("");
    setHasTarget(!editor.state.selection.empty || editor.isActive("link"));
    setStyleOpen(false);
    setSpacingOpen(false);
    setLinkOpen(true);
  }, [editor]);

  const closeLink = () => {
    setLinkOpen(false);
    editor.commands.focus();
  };

  const applyLink = () => {
    const href = parseUrl(linkValue);
    if (!href) {
      setLinkError("Enter a web address (http or https) or an email link (mailto).");
      return;
    }
    chain().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  };

  const removeLink = () => {
    chain().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && editor.isFocused) {
        e.preventDefault();
        openLink();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, openLink]);

  // The style and spacing panels close when you click or tap anywhere outside them, or press Escape.
  const panelOpen = styleOpen || spacingOpen;
  useEffect(() => {
    if (!panelOpen) return;
    const close = () => { setStyleOpen(false); setSpacingOpen(false); };
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [panelOpen]);

  const togglePanel = (which: "style" | "spacing") => {
    setLinkOpen(false);
    setStyleOpen(which === "style" ? (o) => !o : false);
    setSpacingOpen(which === "spacing" ? (o) => !o : false);
  };

  return (
    // Floats at the bottom of the writing space. On a phone it is full width and sits above the keyboard.
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-x-0 z-10 flex flex-col items-center sm:px-4 sm:pb-4"
      style={{ bottom: Math.max(0, keyboard - 32) }}
    >
      {styleOpen && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="pointer-events-auto max-h-[45vh] w-full overflow-y-auto border-t border-line bg-sidebar px-3 py-3 sm:mb-2 sm:w-[26rem] sm:max-w-full sm:rounded-xl sm:border sm:shadow-lg"
        >
          <StylePanel editor={editor} />
        </div>
      )}
      {spacingOpen && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="pointer-events-auto max-h-[45vh] w-full overflow-y-auto border-t border-line bg-sidebar px-3 py-3 sm:mb-2 sm:w-[26rem] sm:max-w-full sm:rounded-xl sm:border sm:shadow-lg"
        >
          <SpacingPanel spacing={spacing} onChange={onSpacingChange} />
        </div>
      )}
      {linkOpen && (
        <div className="pointer-events-auto w-full border-t border-line bg-sidebar px-3 py-2 sm:mb-2 sm:w-auto sm:min-w-[28rem] sm:max-w-full sm:rounded-xl sm:border sm:shadow-lg">
          {hasTarget ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); applyLink(); }}
            >
              <input
                autoFocus
                value={linkValue}
                onChange={(e) => { setLinkValue(e.target.value); setLinkError(""); }}
                onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); closeLink(); } }}
                placeholder="Paste or type a web address"
                aria-label="Link address"
                aria-invalid={!!linkError}
                className="h-8 min-w-0 flex-1 basis-56 rounded-md border border-line bg-paper px-2.5 text-sm outline-none placeholder:text-muted focus:border-accent"
              />
              <button type="submit" className="h-8 rounded-md bg-accent px-3 text-sm font-medium text-paper transition-opacity hover:opacity-90">
                Apply
              </button>
              {s.link && (
                <button type="button" onClick={removeLink} className="h-8 rounded-md px-3 text-sm transition-colors hover:bg-hover">
                  Remove link
                </button>
              )}
              <button type="button" onClick={closeLink} className="h-8 rounded-md px-3 text-sm text-muted transition-colors hover:bg-hover">
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2 text-sm text-muted">
              <p>Select the text you want to turn into a link, then try again.</p>
              <button type="button" onClick={closeLink} className="h-8 rounded-md px-3 transition-colors hover:bg-hover">
                Close
              </button>
            </div>
          )}
          {linkError && <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">{linkError}</p>}
        </div>
      )}
      <div
        role="toolbar"
        aria-label="Formatting"
        onMouseDown={(e) => e.preventDefault()}
        className="pointer-events-auto flex h-11 w-full items-center gap-0.5 overflow-x-auto border-t border-line bg-paper px-3 sm:w-auto sm:max-w-full sm:rounded-xl sm:border sm:bg-paper/95 sm:shadow-lg sm:shadow-black/10 sm:backdrop-blur"
      >
        <IconButton icon={Undo2} label="Undo" shortcut={`${mod}+Z`} disabled={!s.canUndo} onClick={() => chain().undo().run()} />
        <IconButton icon={Redo2} label="Redo" shortcut={`${mod}+Shift+Z`} disabled={!s.canRedo} onClick={() => chain().redo().run()} />
        <Divider />
        <IconButton icon={Pilcrow} label="Paragraph" shortcut={`${mod}+Alt+0`} active={s.p} onClick={() => chain().setParagraph().run()} />
        <IconButton icon={Heading1} label="Heading 1" shortcut={`${mod}+Alt+1`} active={s.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()} />
        <IconButton icon={Heading2} label="Heading 2" shortcut={`${mod}+Alt+2`} active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
        <IconButton icon={Heading3} label="Heading 3" shortcut={`${mod}+Alt+3`} active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
        <Divider />
        <IconButton icon={Type} label="Text style" active={styleOpen} onClick={() => togglePanel("style")} />
        <IconButton icon={Bold} label="Bold" shortcut={`${mod}+B`} active={s.bold} onClick={() => chain().toggleBold().run()} />
        <IconButton icon={Italic} label="Italic" shortcut={`${mod}+I`} active={s.italic} onClick={() => chain().toggleItalic().run()} />
        <IconButton icon={Underline} label="Underline" shortcut={`${mod}+U`} active={s.underline} onClick={() => chain().toggleUnderline().run()} />
        <IconButton icon={Strikethrough} label="Strikethrough" shortcut={`${mod}+Shift+S`} active={s.strike} onClick={() => chain().toggleStrike().run()} />
        <Divider />
        <IconButton icon={AlignVerticalSpaceAround} label="Spacing" active={spacingOpen} onClick={() => togglePanel("spacing")} />
        <IconButton icon={List} label="Bullet list" shortcut={`${mod}+Shift+8`} active={s.bullet} onClick={() => chain().toggleBulletList().run()} />
        <IconButton icon={ListOrdered} label="Numbered list" shortcut={`${mod}+Shift+7`} active={s.ordered} onClick={() => chain().toggleOrderedList().run()} />
        <IconButton icon={Quote} label="Blockquote" shortcut={`${mod}+Shift+B`} active={s.quote} onClick={() => chain().toggleBlockquote().run()} />
        <IconButton icon={Link2} label="Link" shortcut={`${mod}+K`} active={s.link || linkOpen} onClick={openLink} />
        <Divider />
        <IconButton icon={Minus} label="Divider" shortcut="---" onClick={() => chain().setHorizontalRule().run()} />
      </div>
    </div>
  );
}
