"use client";
import type { WorkspaceNode } from "@/lib/types";
import { TreeRow, type TreeActions } from "./TreeRow";

interface FileTreeProps extends TreeActions {
  nodes: WorkspaceNode[];
  parentId: string | null;
  depth?: number;
  activeId: string | null;
  expanded: Set<string>;
  editingId: string | null;
}

const byKindThenName = (a: WorkspaceNode, b: WorkspaceNode) =>
  a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "folder" ? -1 : 1;

export function FileTree({ nodes, parentId, depth = 0, ...rest }: FileTreeProps) {
  const children = nodes.filter((n) => n.parentId === parentId).sort(byKindThenName);
  return (
    <>
      {children.map((node) => {
        const open = rest.expanded.has(node.id);
        return (
          <div key={node.id}>
            <TreeRow
              {...rest}
              node={node}
              depth={depth}
              active={node.id === rest.activeId}
              expanded={open}
              editing={node.id === rest.editingId}
            />
            {node.kind === "folder" && open && (
              <FileTree {...rest} nodes={nodes} parentId={node.id} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </>
  );
}
