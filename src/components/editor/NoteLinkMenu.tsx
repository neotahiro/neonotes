"use client";
import { useEffect, useRef, useState } from "react";
import type { NoteLinkSuggestState } from "@/lib/editor/noteLinkSuggestion";
import { filterNotes, type NoteRef } from "@/lib/editor/noteLinks";
import { NoteResults } from "./NoteResults";

interface NoteLinkMenuProps {
  state: NoteLinkSuggestState;
  notes: NoteRef[];
  currentId: string | null;
  /** Lets the editor hand this menu the keys pressed while it is open. */
  registerKeys: (handler: ((e: KeyboardEvent) => boolean) | null) => void;
  onDismiss: () => void;
}

const WIDTH = 288;
const HEIGHT = 280;

/** The menu that opens under the cursor when you type "[[". */
export function NoteLinkMenu({ state, notes, currentId, registerKeys, onDismiss }: NoteLinkMenuProps) {
  const items = filterNotes(notes, state.query, currentId);
  const [active, setActive] = useState(0);
  const latest = useRef({ items, active, state, onDismiss });
  latest.current = { items, active, state, onDismiss };

  useEffect(() => setActive(0), [state.query]);

  useEffect(() => {
    registerKeys((e) => {
      const { items: list, active: current, state: s, onDismiss: dismiss } = latest.current;
      if (e.key === "ArrowDown") { setActive((i) => (list.length ? (i + 1) % list.length : 0)); return true; }
      if (e.key === "ArrowUp") { setActive((i) => (list.length ? (i - 1 + list.length) % list.length : 0)); return true; }
      if (e.key === "Enter" || e.key === "Tab") {
        const chosen = list[current];
        if (!chosen) return false;
        s.pick({ id: chosen.id, name: chosen.name || "Untitled" });
        return true;
      }
      if (e.key === "Escape") { dismiss(); return true; }
      return false;
    });
    return () => registerKeys(null);
  }, [registerKeys]);

  if (!state.rect) return null;
  const viewH = window.visualViewport?.height ?? window.innerHeight;
  const left = Math.max(8, Math.min(state.rect.left, window.innerWidth - WIDTH - 8));
  const below = state.rect.bottom + 6 + HEIGHT <= viewH;
  const style = below ? { left, top: state.rect.bottom + 6 } : { left, bottom: window.innerHeight - state.rect.top + 6 };

  return (
    <div style={{ ...style, width: WIDTH, maxHeight: HEIGHT }} className="fixed z-40 overflow-y-auto rounded-xl border border-line bg-paper p-1.5 shadow-lg">
      <p className="px-2.5 pb-1 pt-0.5 text-xs text-muted">Link to a note</p>
      <NoteResults
        items={items}
        active={active}
        onPick={(n) => state.pick({ id: n.id, name: n.name || "Untitled" })}
      />
    </div>
  );
}
