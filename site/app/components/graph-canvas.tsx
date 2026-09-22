"use client";

import { useMemo, useState } from "react";
import { Maximize2, Network, ZoomIn, ZoomOut } from "lucide-react";
import type { GraphDetail, GraphNode } from "@/app/lib/types";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface Position {
  x: number;
  y: number;
}

interface GraphCanvasProps {
  detail: GraphDetail | null;
  selectedNodeId?: string;
  search: string;
  onSelectNode: (node: GraphNode) => void;
  onCreateNode: () => void;
}

const palette = ["#8b7cff", "#4dd4c6", "#58a6ff", "#f19cf6", "#f4b860", "#ff7b92"];

function positionNodes(nodes: GraphNode[]) {
  const positions = new Map<string, Position>();
  nodes.forEach((node, index) => {
    if (index === 0) {
      positions.set(node.id, { x: 50, y: 50 });
      return;
    }
    const angle = index * 2.399963;
    const radius = Math.min(43, 10 + Math.sqrt(index) * 5.2);
    positions.set(node.id, {
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius * 0.78,
    });
  });
  return positions;
}

function nodeColor(node: GraphNode) {
  const seed = (node.tags[0] ?? node.label)
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return palette[seed % palette.length];
}

export function GraphCanvas({
  detail,
  selectedNodeId,
  search,
  onSelectNode,
  onCreateNode,
}: GraphCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const positions = useMemo(
    () => positionNodes(detail?.nodes ?? []),
    [detail?.nodes],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleIds = useMemo(() => {
    if (!normalizedSearch) return new Set(detail?.nodes.map((node) => node.id));
    return new Set(
      detail?.nodes
        .filter((node) =>
          [node.label, node.nodeKey, node.description, ...node.tags]
            .join(" ")
            .toLocaleLowerCase()
            .includes(normalizedSearch),
        )
        .map((node) => node.id),
    );
  }, [detail?.nodes, normalizedSearch]);

  if (!detail) {
    return (
      <div className="canvas-empty">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Network /></EmptyMedia>
            <EmptyTitle>还没有可显示的图谱</EmptyTitle>
            <EmptyDescription>
              先在左侧创建分类和图谱，再添加知识节点。
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (detail.nodes.length === 0) {
    return (
      <div className="canvas-empty">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Network /></EmptyMedia>
            <EmptyTitle>这个图谱还是空的</EmptyTitle>
            <EmptyDescription>添加第一个节点，开始建立知识之间的连接。</EmptyDescription>
          </EmptyHeader>
          <Button onClick={onCreateNode}>添加节点</Button>
        </Empty>
      </div>
    );
  }

  const connectedIds = new Set<string>();
  if (selectedNodeId) {
    connectedIds.add(selectedNodeId);
    detail.edges.forEach((edge) => {
      if (edge.sourceNodeId === selectedNodeId) connectedIds.add(edge.targetNodeId);
      if (edge.targetNodeId === selectedNodeId) connectedIds.add(edge.sourceNodeId);
    });
  }

  return (
    <div className="graph-stage">
      <svg
        className="edge-layer"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        <g
          style={{
            transform: `translate(50px,50px) scale(${zoom}) translate(-50px,-50px)`,
            transformOrigin: "center",
          }}
        >
          {detail.edges.map((edge) => {
            const source = positions.get(edge.sourceNodeId);
            const target = positions.get(edge.targetNodeId);
            if (!source || !target) return null;
            const active =
              !selectedNodeId ||
              edge.sourceNodeId === selectedNodeId ||
              edge.targetNodeId === selectedNodeId;
            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                className={active ? "edge-line is-active" : "edge-line"}
                markerEnd="url(#arrow)"
              />
            );
          })}
        </g>
      </svg>

      <div
        className="node-layer"
        style={{ transform: `scale(${zoom})` }}
      >
        {detail.nodes.map((node) => {
          const position = positions.get(node.id)!;
          const matches = visibleIds.has(node.id);
          const related = !selectedNodeId || connectedIds.has(node.id);
          const color = nodeColor(node);
          return (
            <button
              type="button"
              key={node.id}
              className={[
                "graph-node",
                node.id === selectedNodeId ? "is-selected" : "",
                matches ? "" : "is-filtered",
                related ? "" : "is-distant",
              ].join(" ")}
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                "--node-color": color,
              } as React.CSSProperties}
              onClick={() => onSelectNode(node)}
              aria-label={`查看节点 ${node.label}`}
            >
              <span className="node-core" />
              <span className="node-label">{node.label}</span>
            </button>
          );
        })}
      </div>

      <div className="canvas-controls" aria-label="画布缩放">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setZoom((value) => Math.max(0.72, value - 0.12))}
          aria-label="缩小"
        >
          <ZoomOut />
        </Button>
        <span>{Math.round(zoom * 100)}%</span>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setZoom((value) => Math.min(1.45, value + 0.12))}
          aria-label="放大"
        >
          <ZoomIn />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setZoom(1)}
          aria-label="重置缩放"
        >
          <Maximize2 />
        </Button>
      </div>
    </div>
  );
}

