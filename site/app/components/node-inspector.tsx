"use client";

import { ArrowRight, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { GraphEdge, GraphNode } from "@/app/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NodeInspectorProps {
  node: GraphNode | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onClose: () => void;
  onEditNode: (node: GraphNode) => void;
  onDeleteNode: (node: GraphNode) => void;
  onCreateEdge: (sourceId: string) => void;
  onEditEdge: (edge: GraphEdge) => void;
  onDeleteEdge: (edge: GraphEdge) => void;
  onSelectNode: (node: GraphNode) => void;
}

export function NodeInspector({
  node,
  nodes,
  edges,
  onClose,
  onEditNode,
  onDeleteNode,
  onCreateEdge,
  onEditEdge,
  onDeleteEdge,
  onSelectNode,
}: NodeInspectorProps) {
  if (!node) {
    return (
      <aside className="node-inspector empty-inspector">
        <div className="inspector-pulse"><Link2 /></div>
        <h2>选择一个节点</h2>
        <p>点击画布中的节点，查看说明、标签与关系。</p>
      </aside>
    );
  }

  const outgoing = edges.filter((edge) => edge.sourceNodeId === node.id);
  const incoming = edges.filter((edge) => edge.targetNodeId === node.id);
  const findNode = (id: string) => nodes.find((item) => item.id === id);

  const relationRow = (edge: GraphEdge, direction: "out" | "in") => {
    const other = findNode(
      direction === "out" ? edge.targetNodeId : edge.sourceNodeId,
    );
    return (
      <div className="relation-row" key={edge.id}>
        <button
          type="button"
          className="relation-main"
          onClick={() => other && onSelectNode(other)}
        >
          <span className="relation-type">{edge.type}</span>
          <span className="relation-path">
            {direction === "in" ? other?.label : node.label}
            <ArrowRight />
            {direction === "in" ? node.label : other?.label}
          </span>
          {edge.label ? <small>{edge.label}</small> : null}
        </button>
        <div className="relation-actions">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => onEditEdge(edge)}
            aria-label="编辑关系"
          >
            <Pencil />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => onDeleteEdge(edge)}
            aria-label="删除关系"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <aside className="node-inspector">
      <div className="inspector-top">
        <span className="eyebrow">NODE DETAIL</span>
        <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="关闭详情">
          <X />
        </Button>
      </div>
      <div className="inspector-title-row">
        <div>
          <h2>{node.label}</h2>
          <code>{node.nodeKey}</code>
        </div>
        <div className="inspector-actions">
          <Button size="icon-sm" variant="ghost" onClick={() => onEditNode(node)} aria-label="编辑节点">
            <Pencil />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => onDeleteNode(node)} aria-label="删除节点">
            <Trash2 />
          </Button>
        </div>
      </div>

      <p className="node-description">
        {node.description || "这个节点还没有说明。"}
      </p>

      <div className="tag-list">
        {node.tags.map((tag) => (
          <Badge key={tag} variant="secondary">{tag}</Badge>
        ))}
      </div>

      {node.globalConceptId ? (
        <div className="concept-id">
          <span>全局概念</span>
          <code>{node.globalConceptId}</code>
        </div>
      ) : null}

      <div className="relations-heading">
        <div>
          <span>关系</span>
          <small>{outgoing.length + incoming.length}</small>
        </div>
        <Button size="sm" variant="outline" onClick={() => onCreateEdge(node.id)}>
          <Plus /> 添加关系
        </Button>
      </div>

      <div className="relations-list">
        {outgoing.map((edge) => relationRow(edge, "out"))}
        {incoming.map((edge) => relationRow(edge, "in"))}
        {outgoing.length + incoming.length === 0 ? (
          <p className="no-relations">暂无关系。添加一条连接，让这个概念进入知识网络。</p>
        ) : null}
      </div>
    </aside>
  );
}

