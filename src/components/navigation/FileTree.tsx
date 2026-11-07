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

  if (children.length === 0 && parentId !== null) {
    return (
      <button
        type="button"
        onClick={() => rest.onAddDoc(parentId)}
        style={{ paddingLeft: 6 + depth * 14 + 20 }}
        className="flex h-8 w-full items-center rounded-md text-left text-xs text-muted transition-colors hover:bg-hover hover:text-ink"
      >
        Empty · add a note
      </button>
    );
  }

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
