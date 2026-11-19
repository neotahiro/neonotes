"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FilePlus } from "lucide-react";
import type { UserInfo } from "@/lib/types";
import { useTheme } from "@/hooks/useTheme";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTimer } from "@/hooks/useTimer";
import { useTagIndex } from "@/hooks/useTagIndex";
import { splitSettings, updateSettings } from "@/lib/editor/noteSettings";
import { canonicalId, findNoteById, noteAliases } from "@/lib/noteIds";
import { FocusBar } from "@/components/tools/FocusBar";
import { TimerDoneDialog } from "@/components/tools/TimerDoneDialog";
import { Editor } from "@/components/editor/Editor";
import { NoticeBar } from "./NoticeBar";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { TopTools } from "./TopTools";

const DIM_KEY = "noenotes-focus-dim";

export function AppShell({ user }: { user: UserInfo }) {
  const ws = useWorkspace();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusSignal, setFocusSignal] = useState(0);
  const [focus, setFocus] = useState(false);
  const [dimOthers, setDimOthers] = useState(false);
  const [words, setWords] = useState(0);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const timer = useTimer();

  useEffect(() => {
    try { setDimOthers(localStorage.getItem(DIM_KEY) === "1"); } catch { /* storage unavailable */ }
  }, []);
  const changeDim = useCallback((dim: boolean) => {
    setDimOthers(dim);
    try { localStorage.setItem(DIM_KEY, dim ? "1" : "0"); } catch { /* storage unavailable */ }
  }, []);

  // Esc leaves focus mode.
  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFocus(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

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
  // Every note, for linking between notes. Each shows the folders it sits in.
  const noteRefs = useMemo(() => {
    const byId = new Map(ws.nodes.map((n) => [n.id, n]));
    return ws.nodes
      .filter((n) => n.kind === "doc")
      .map((n) => {
        const folders: string[] = [];
        for (let p = n.parentId ? byId.get(n.parentId) : undefined; p && folders.length < 5; p = p.parentId ? byId.get(p.parentId) : undefined) {
          folders.unshift(p.name || "Untitled");
        }
        return { id: canonicalId(n), aliases: noteAliases(n), name: n.name || "Untitled", path: folders.join(" / ") };
      });
  }, [ws.nodes]);

  const tagIndex = useTagIndex(ws.nodes);
  const activeTags = active ? (tagIndex.byNote.get(active.id) ?? []) : [];
  const changeTags = (next: string[]) => {
    if (active) ws.setContent(active.id, updateSettings(active.content, { tags: next }));
  };
  const showTag = (tag: string) => {
    setTagFilter(tag);
    setSidebarOpen(true);
  };

  const goal = active ? splitSettings(active.content).settings.goal : null;
  const changeGoal = (next: number | null) => {
    if (active) ws.setContent(active.id, updateSettings(active.content, { goal: next }));
  };

  // Focus mode only makes sense with a note open.
  useEffect(() => {
    if (!active) setFocus(false);
  }, [active]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        open={sidebarOpen && !focus}
        onClose={() => setSidebarOpen(false)}
        ws={ws}
        user={user}
        onFocusEditor={() => setFocusSignal((n) => n + 1)}
        tagIndex={tagIndex}
        tagFilter={tagFilter}
        onTagFilter={setTagFilter}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {!focus && (
          <TopBar
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            crumbs={crumbs}
            status={ws.status}
            onRetry={ws.syncNow}
            theme={theme}
            onToggleTheme={toggle}
            tools={
              <TopTools
                hasNote={active !== null}
                goal={goal}
                words={words}
                onGoalChange={changeGoal}
                dim={dimOthers}
                onDimChange={changeDim}
                onStartFocus={() => setFocus(true)}
                timer={timer}
                tags={activeTags}
                allTags={tagIndex.all}
                onTagsChange={changeTags}
              />
            }
          />
        )}
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
            focusMode={focus}
            dimOthers={dimOthers}
            onWordCount={setWords}
            onTagClick={showTag}
            notes={noteRefs}
            currentId={canonicalId(active)}
            onOpenNote={(linkId) => {
              const target = findNoteById(ws.nodes, linkId);
              if (target) ws.select(target.id);
            }}
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
      {focus && <FocusBar onExit={() => setFocus(false)} timer={timer} goal={goal} words={words} />}
      <TimerDoneDialog timer={timer} />
    </div>
  );
}
