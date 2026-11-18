import { Node, mergeAttributes } from "@tiptap/core";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** A link to another note. It remembers the note's id, so it keeps working when the note is renamed. */
export const NoteLink = Node.create({
  name: "noteLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-note-link"),
        renderHTML: (attrs) => ({ "data-note-link": attrs.id }),
      },
      label: {
        default: "Untitled",
        parseHTML: (el) => (el.textContent || "Untitled").slice(0, 200),
        renderHTML: () => ({}),
      },
      missing: {
        default: false,
        parseHTML: (el) => el.hasAttribute("data-missing"),
        renderHTML: (attrs) => (attrs.missing ? { "data-missing": "true" } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-note-link]", getAttrs: (el) => (ID_PATTERN.test((el as HTMLElement).getAttribute("data-note-link") ?? "") ? null : false) }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["span", mergeAttributes({ class: "note-link" }, HTMLAttributes), node.attrs.label];
  },

  renderText({ node }) {
    return node.attrs.label;
  },
});
