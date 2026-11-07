"use client";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold, Heading1, Heading2, Heading3, Italic, Link2, List, ListOrdered,
  Pilcrow, Quote, Redo2, Strikethrough, Underline, Undo2,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

function normalizeUrl(raw: string): string {
  const url = raw.trim();
  return /^(https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`;
}

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />;

export function Toolbar({ editor }: { editor: Editor }) {
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

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt("Link address", previous ?? "https://");
    if (input === null) return;
    if (input.trim() === "" || input.trim() === "https://") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    chain().extendMarkRange("link").setLink({ href: normalizeUrl(input) }).run();
  };

  return (
    <div role="toolbar" aria-label="Formatting" className="flex h-11 shrink-0 items-center gap-0.5 overflow-x-auto border-y border-line px-3">
      <IconButton icon={Undo2} label="Undo" disabled={!s.canUndo} onClick={() => chain().undo().run()} />
      <IconButton icon={Redo2} label="Redo" disabled={!s.canRedo} onClick={() => chain().redo().run()} />
      <Divider />
      <IconButton icon={Pilcrow} label="Paragraph" active={s.p} onClick={() => chain().setParagraph().run()} />
      <IconButton icon={Heading1} label="Heading 1" active={s.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()} />
      <IconButton icon={Heading2} label="Heading 2" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <IconButton icon={Heading3} label="Heading 3" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
      <Divider />
      <IconButton icon={Bold} label="Bold" active={s.bold} onClick={() => chain().toggleBold().run()} />
      <IconButton icon={Italic} label="Italic" active={s.italic} onClick={() => chain().toggleItalic().run()} />
      <IconButton icon={Underline} label="Underline" active={s.underline} onClick={() => chain().toggleUnderline().run()} />
      <IconButton icon={Strikethrough} label="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()} />
      <Divider />
      <IconButton icon={List} label="Bullet list" active={s.bullet} onClick={() => chain().toggleBulletList().run()} />
      <IconButton icon={ListOrdered} label="Numbered list" active={s.ordered} onClick={() => chain().toggleOrderedList().run()} />
      <IconButton icon={Quote} label="Blockquote" active={s.quote} onClick={() => chain().toggleBlockquote().run()} />
      <IconButton icon={Link2} label="Link" active={s.link} onClick={setLink} />
    </div>
  );
}
