import { Mark, mergeAttributes } from "@tiptap/core";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
export const MAX_COMMENT_LENGTH = 2000;

/** A private comment attached to a piece of text, like a margin note in Notion. */
export const Comment = Mark.create({
  name: "comment",
  inclusive: false,
  // Lets two comments cover the same words.
  excludes: "",

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-comment-id"),
        renderHTML: (attrs) => ({ "data-comment-id": attrs.id }),
      },
      text: {
        default: "",
        parseHTML: (el) => (el.getAttribute("data-comment") ?? "").slice(0, MAX_COMMENT_LENGTH),
        renderHTML: (attrs) => ({ "data-comment": attrs.text }),
      },
      created: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute("data-created")) || 0,
        renderHTML: (attrs) => ({ "data-created": String(attrs.created) }),
      },
      resolved: {
        default: false,
        parseHTML: (el) => el.hasAttribute("data-resolved"),
        renderHTML: (attrs) => (attrs.resolved ? { "data-resolved": "true" } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]", getAttrs: (el) => (ID_PATTERN.test((el as HTMLElement).getAttribute("data-comment-id") ?? "") ? null : false) }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});
