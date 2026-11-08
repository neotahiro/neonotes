"use client";
import { useEffect, useState } from "react";
import { FilePlus } from "lucide-react";
import type { UserInfo } from "@/lib/types";
import { useTheme } from "@/hooks/useTheme";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Editor } from "@/components/editor/Editor";
import { NoticeBar } from "./NoticeBar";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ user }: { user: UserInfo }) {
  const ws = useWorkspace();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusSignal, setFocusSignal] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarOpen(false);
  }, []);

  // Ctrl/⌘ + \ toggles the sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setSidebarOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const active = ws.nodes.find((n) => n.id === ws.activeId && n.kind === "doc") ?? null;
  const parent = active ? ws.nodes.find((n) => n.id === active.parentId) : null;
  const crumbs = active ? [...(parent ? [parent.name] : []), active.name || "Untitled"] : [];

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} ws={ws} user={user} onFocusEditor={() => setFocusSignal((n) => n + 1)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          crumbs={crumbs}
          status={ws.status}
          onRetry={ws.syncNow}
          theme={theme}
          onToggleTheme={toggle}
        />
        {ws.notice && <NoticeBar message={ws.notice} onDismiss={ws.dismissNotice} />}
        {!ws.ready ? (
          <main className="flex-1" aria-busy="true" />
        ) : active ? (
          <Editor
            key={`${active.id}:${ws.revision}`}
            focusSignal={focusSignal}
            title={active.name}
            content={active.content}
            onTitleChange={(name) => ws.rename(active.id, name)}
            onContentChange={(html) => ws.setContent(active.id, html)}
          />
        ) : (
          <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-serif text-xl">Nothing open</p>
            <p className="max-w-xs text-sm text-muted">Pick a document from the sidebar, or start a new one.</p>
            <button
              type="button"
              onClick={() => ws.create("doc", null)}
              className="mt-1 inline-flex items-center gap-2 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
            >
              <FilePlus className="h-4 w-4" strokeWidth={1.75} /> New document
            </button>
          </main>
        )}
      </div>
    </div>
  );
}
