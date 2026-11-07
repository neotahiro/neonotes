"use client";
import { byCreated } from "@/lib/tree";
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

export function FileTree({ nodes, parentId, depth = 0, ...rest }: FileTreeProps) {
  const children = nodes.filter((n) => n.parentId === parentId).sort(byCreated);

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
