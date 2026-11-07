import type { WorkspaceNode } from "./types";

/** Created once, the first time the app opens in a browser. */
export const seedNodes: WorkspaceNode[] = [
  {
    id: "welcome",
    kind: "doc",
    name: "Welcome to Noenotes",
    parentId: null,
    favorite: true,
    updatedAt: Date.now(),
    content:
      "<h2>A quiet place to write</h2><p>Your notes are saved in this browser, so they are still here after a refresh. Syncing to Google Drive arrives in a later step.</p><blockquote><p>Write first. Organize later.</p></blockquote><ul><li>Use the sidebar to create folders and documents</li><li>Star a document to pin it under Favorites</li><li>Select text and press Ctrl or ⌘ + K to add a link</li></ul>",
  },
];
