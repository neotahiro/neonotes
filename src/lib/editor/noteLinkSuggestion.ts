import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";

/** What the "[[" menu needs to know while it is open. */
export interface NoteLinkSuggestState {
  query: string;
  rect: DOMRect | null;
  /** Replaces the typed "[[..." with a link to this note. */
  pick: (note: { id: string; name: string }) => void;
}

interface Options {
  onChange: (state: NoteLinkSuggestState | null) => void;
  /** Gets arrow keys, Enter and Escape while the menu is open. Return true when the key was used. */
  onKey: (event: KeyboardEvent) => boolean;
}

/** Typing "[[" opens a menu of notes to link to. */
export const NoteLinkSuggestion = Extension.create<Options>({
  name: "noteLinkSuggestion",

  addOptions() {
    return { onChange: () => {}, onKey: () => false };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      Suggestion({
        editor: this.editor,
        char: "[[",
        allowSpaces: true,
        allowedPrefixes: null,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: "noteLink", attrs: { id: props.id, label: props.label } },
              { type: "text", text: " " },
            ])
            .run();
        },
        render: () => {
          const toState = (p: SuggestionProps): NoteLinkSuggestState => ({
            query: p.query,
            rect: p.clientRect?.() ?? null,
            pick: (note) => p.command({ id: note.id, label: note.name }),
          });
          return {
            onStart: (p) => options.onChange(toState(p)),
            onUpdate: (p) => options.onChange(toState(p)),
            onKeyDown: ({ event }) => options.onKey(event),
            onExit: () => options.onChange(null),
          };
        },
      }),
    ];
  },
});
