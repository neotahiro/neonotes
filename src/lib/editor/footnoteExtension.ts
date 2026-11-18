import { Node, mergeAttributes } from "@tiptap/core";
import { uid } from "@/lib/utils";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
export const MAX_FOOTNOTE_LENGTH = 2000;

/** A footnote marker in the text. The footnote's words are kept in the marker itself; its number comes from its place in the note. */
export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => {
          const id = el.getAttribute("data-footnote-id") ?? "";
          return ID_PATTERN.test(id) ? id : uid();
        },
        renderHTML: (attrs) => ({ "data-footnote-id": attrs.id }),
      },
      text: {
        default: "",
        parseHTML: (el) => (el.getAttribute("data-footnote") ?? "").slice(0, MAX_FOOTNOTE_LENGTH),
        renderHTML: (attrs) => ({ "data-footnote": attrs.text }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "sup[data-footnote-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes({ class: "footnote-ref" }, HTMLAttributes)];
  },

  renderText({ node }) {
    return `[${node.attrs.text}]`;
  },
});
