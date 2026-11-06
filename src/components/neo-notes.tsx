"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, ChevronDown, ChevronLeft, ChevronRight, Clock3, FilePlus2,
  FileText, Folder, Heading1, Heading2, Italic, List, ListOrdered,
  Menu, Moon, MoreHorizontal, PanelLeftClose, Plus, Quote, Search,
  Settings2, Sparkles, Star, Strikethrough, Underline as UnderlineIcon,
  Undo2, Redo2, X,
} from "lucide-react";

type Note = { id: string; title: string; folder: string; updated: string; content: string };

const starterNotes: Note[] = [
  {
    id: "welcome", title: "A quiet place to think", folder: "Getting started", updated: "Just now",
    content: `<h2>Welcome to NeoNotes.</h2><p>This is your personal space to think, write, and collect ideas. Start with a sentence, a question, or a thought you don't want to lose.</p><blockquote><p>“The secret of getting ahead is getting started.”</p></blockquote><h2>Make yourself at home</h2><ul><li>Create a note using the <strong>New note</strong> button.</li><li>Give your writing a title at the top.</li><li>Use the toolbar to format your thoughts.</li></ul><p>Your changes are saved in this browser for now. Google Drive sync will be added in a later development phase.</p>`
  },
  {
    id: "ideas", title: "Ideas to explore", folder: "Personal", updated: "Yesterday",
    content: `<p>A small collection of ideas worth coming back to.</p><h2>Questions</h2><ul><li>What would make my daily workflow simpler?</li><li>What do I want to learn next?</li></ul>`
  },
  {
    id: "project", title: "Project notes", folder: "Work", updated: "Oct 28",
    content: `<p>Notes and next steps for ongoing projects.</p><h2>Next steps</h2><ol><li>Define the smallest useful version.</li><li>Build and test one feature at a time.</li></ol>`
  },
];

function ToolButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} className={`tool-button${active ? " is-active" : ""}`}>{children}</button>;
}

export default function NeoNotes() {
  const [notes, setNotes] = useState<Note[]>(starterNotes);
  const [selectedId, setSelectedId] = useState("welcome");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("neonotes-draft-v1");
      if (raw) {
        const parsed = JSON.parse(raw) as Note[];
        if (Array.isArray(parsed) && parsed.length) {
          setNotes(parsed);
          setSelectedId(parsed[0].id);
        }
      }
    } catch { /* Ignore invalid local drafts and keep the starter notes. */ }
  }, []);

  const selected = notes.find((note) => note.id === selectedId) ?? notes[0];
  const updateSelected = useCallback((updates: Partial<Note>) => {
    setSaved(false);
    setNotes((current) => current.map((note) => note.id === selectedId ? { ...note, ...updates, updated: "Just now" } : note));
  }, [selectedId]);

  useEffect(() => {
    if (saved) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem("neonotes-draft-v1", JSON.stringify(notes));
      setSaved(true);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [notes, saved]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: "Start writing something..." }),
    ],
    content: selected?.content ?? "",
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => updateSelected({ content: currentEditor.getHTML() }),
  }, [selectedId]);

  useEffect(() => {
    if (editor && selected && editor.getHTML() !== selected.content) {
      editor.commands.setContent(selected.content);
    }
  }, [editor, selectedId]); // Switch editor content when another note is selected.

  const visibleNotes = useMemo(() => notes.filter((note) =>
    `${note.title} ${note.folder}`.toLowerCase().includes(query.toLowerCase())
  ), [notes, query]);

  function createNote() {
    const note: Note = {
      id: crypto.randomUUID(),
      title: "Untitled note",
      folder: "Personal",
      updated: "Just now",
      content: "<p></p>",
    };
    setNotes((current) => [note, ...current]);
    setSelectedId(note.id);
    setSidebarOpen(false);
  }

  const wordCount = editor?.getText().trim().split(/\s+/).filter(Boolean).length ?? 0;

  return (
    <main className={`app-shell${dark ? " theme-dark" : ""}`}>
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={17} /></div>
          <span>NeoNotes</span>
          <button className="mobile-menu" style={{ marginLeft: "auto" }} onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <button className="nav-button active" onClick={createNote}><Plus size={16} /> New note <span style={{ marginLeft: "auto", opacity: .55 }}>⌘ N</span></button>
        <button className="nav-button"><Search size={16} /> Search</button>

        <div className="side-label">Workspace</div>
        <button className="nav-button"><Clock3 size={16} /> Recent</button>
        <button className="nav-button"><Star size={16} /> Favorites</button>

        <div className="side-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Folders <button aria-label="Add folder" style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer" }}><Plus size={14} /></button>
        </div>
        <button className="nav-button"><Folder size={16} /> Getting started <ChevronDown size={13} style={{ marginLeft: "auto" }} /></button>
        <button className="nav-button"><Folder size={16} /> Personal</button>
        <button className="nav-button"><Folder size={16} /> Work</button>

        <div className="side-label">All notes</div>
        <div style={{ padding: "0 4px 8px" }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: 10, color: "#999" }} />
            <input aria-label="Filter notes" placeholder="Filter notes..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: "100%", border: "1px solid #e1e3dc", background: "#f8f9f6", borderRadius: 7, padding: "7px 8px 7px 28px", fontSize: 11, outline: "none" }} />
          </div>
        </div>
        {visibleNotes.map((note) => (
          <button key={note.id} className={`note-button${selectedId === note.id ? " active" : ""}`} onClick={() => { setSelectedId(note.id); setSidebarOpen(false); }}>
            <FileText size={14} /><span>{note.title}</span>
          </button>
        ))}
        <div className="sidebar-bottom">
          <div className="avatar">N</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#454a40" }}>Personal workspace</div>
            <div style={{ fontSize: 10, color: "#96998f" }}>Local preview</div>
          </div>
          <Settings2 size={16} color="#85897f" />
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
            <span>My workspace</span><ChevronRight size={13} /><span style={{ color: "#41463d" }}>{selected?.folder}</span>
          </div>
          <div className="topbar-right">
            <span><span className="status-dot" />{saved ? "Saved locally" : "Saving..."}</span>
            <button className="tool-button" onClick={() => setDark((value) => !value)} aria-label="Toggle theme"><Moon size={16} /></button>
            <button className="tool-button" aria-label="More options"><MoreHorizontal size={18} /></button>
          </div>
        </header>

        <div className="editor-wrap">
          <div className="document-meta">
            <span>DOCUMENT <span style={{ padding: "0 6px", color: "#d0d1ca" }}>•</span> {selected?.folder.toUpperCase()}</span>
            <span>{wordCount} words</span>
          </div>
          <input
            className="title-input"
            aria-label="Document title"
            value={selected?.title ?? ""}
            onChange={(event) => updateSelected({ title: event.target.value })}
            placeholder="Untitled note"
          />
          <div className="toolbar">
            <ToolButton label="Undo" onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={16} /></ToolButton>
            <ToolButton label="Redo" onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={16} /></ToolButton>
            <span className="tool-divider" />
            <ToolButton label="Heading 1" active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={17} /></ToolButton>
            <ToolButton label="Heading 2" active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></ToolButton>
            <span className="tool-divider" />
            <ToolButton label="Bold" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={16} /></ToolButton>
            <ToolButton label="Italic" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolButton>
            <ToolButton label="Underline" active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></ToolButton>
            <ToolButton label="Strikethrough" active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></ToolButton>
            <span className="tool-divider" />
            <ToolButton label="Bullet list" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={17} /></ToolButton>
            <ToolButton label="Numbered list" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></ToolButton>
            <ToolButton label="Quote" active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={16} /></ToolButton>
          </div>
          <EditorContent editor={editor} />
          <div style={{ marginTop: 42, paddingTop: 15, borderTop: "1px solid #ecece6", color: "#a0a197", fontSize: 11, display: "flex", justifyContent: "space-between" }}>
            <span>Made for your thoughts.</span><span>NeoNotes · Early preview</span>
          </div>
        </div>
      </section>
    </main>
  );
}
