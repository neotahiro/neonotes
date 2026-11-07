export type NodeKind = "folder" | "doc";

/** One flat record per folder or document. Maps 1:1 to a Drive file later. */
export interface WorkspaceNode {
  id: string;
  kind: NodeKind;
  name: string;
  parentId: string | null;
  favorite: boolean;
  /** TipTap HTML. Empty for folders. */
  content: string;
  /** Sort key: notes appear in the order they were created. */
  createdAt: number;
  updatedAt: number;
}
