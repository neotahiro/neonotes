import type { WorkspaceNode } from "./types";

const now = Date.now();

export const seedNodes: WorkspaceNode[] = [
  { id: "f1", kind: "folder", name: "Journal", parentId: null, favorite: false, content: "", updatedAt: now },
  { id: "f2", kind: "folder", name: "Stories", parentId: null, favorite: false, content: "", updatedAt: now },
  {
    id: "d1", kind: "doc", name: "Welcome to Noenotes", parentId: null, favorite: true, updatedAt: now,
    content:
      "<h2>A quiet place to write</h2><p>Select text to see the formatting you can use, or press the toolbar buttons above. Everything here is a sample kept in memory — real saving arrives with the Google Drive step.</p><blockquote><p>Write first. Organize later.</p></blockquote><ul><li>Use the sidebar to create folders and documents</li><li>Star a document to pin it under Favorites</li><li>Switch between light and dark from the top bar</li></ul>",
  },
  {
    id: "d2", kind: "doc", name: "Morning pages", parentId: "f1", favorite: false, updatedAt: now,
    content: "<p>The light came in sideways today, and the kettle took forever.</p>",
  },
  {
    id: "d3", kind: "doc", name: "The lighthouse keeper", parentId: "f2", favorite: false, updatedAt: now,
    content: "<h1>The lighthouse keeper</h1><p>Every evening he climbed the same ninety-one steps.</p>",
  },
];
