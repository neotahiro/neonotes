import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/** Marks the top-level block (paragraph, heading, list...) the cursor is in. Focus mode uses it to dim everything else. */
export const ActiveBlock = Extension.create({
  name: "activeBlock",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const { $from } = state.selection;
            if ($from.depth < 1) return null;
            const from = $from.before(1);
            const to = $from.after(1);
            return DecorationSet.create(state.doc, [Decoration.node(from, to, { class: "is-active-block" })]);
          },
        },
      }),
    ];
  },
});
