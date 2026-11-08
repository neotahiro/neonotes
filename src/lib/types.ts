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
  /** Present once the node has been saved to Drive. */
  sync?: SyncInfo;
  /** Sort key: notes appear in the order they were created. */
  createdAt: number;
  updatedAt: number;
}

export interface UserInfo {
  name: string;
  email: string;
  image: string | null;
}

/** What we last wrote to (or read from) Google Drive for a node. */
export interface SyncInfo {
  driveId: string;
  /** The node's updatedAt value that Drive has. If it differs from updatedAt, the node has unsaved changes. */
  version: number;
  /** Local id of the parent as Drive knows it, to detect moves. */
  parentId: string | null;
  /** Drive's modifiedTime after our last write or read. */
  modified: string;
}

/** A file or folder as listed by Drive. parentId is a Drive id, or null for the top level. */
export interface RemoteNode {
  id: string;
  kind: NodeKind;
  name: string;
  parentId: string | null;
  favorite: boolean;
  createdAt: number;
  modified: string;
  /** Id of the device that last wrote this file. */
  writer?: string;
}

export interface CreateBody {
  localId: string;
  kind: NodeKind;
  name: string;
  favorite: boolean;
  createdAt: number;
  parentDriveId: string | null;
  content: string;
  writer?: string;
}

export interface UpdateBody {
  name?: string;
  favorite?: boolean;
  /** Drive id of the new parent, or null for the top level. Omit if the parent didn't change. */
  parentDriveId?: string | null;
  content?: string;
  trashed?: boolean;
  /** Drive's modifiedTime as we last saw it. If Drive has moved on (written by another device), the update is refused with 409. */
  expectedModified?: string;
  writer?: string;
}

export interface RemoteResult {
  id: string;
  modified: string;
}

export interface RemoteFile {
  name: string;
  modified: string;
  content: string;
}
