import { ComponentType, useEffect, useMemo, useState } from "react";
import { Alert, Spin } from "antd";
import { KnowledgeGraph, KnowledgeNode } from "../domain/types";

interface Props {
  graph: KnowledgeGraph;
  theme: "light" | "dark";
  onNodeSelect: (node: KnowledgeNode | null) => void;
}

type Overview3DNode = {
  id: string;
  label: string;
  tags: string[];
};

type Overview3DEdge = {
  source: string;
  target: string;
  type: string;
  label: string;
};

type ForceGraph3DComponent = ComponentType<Record<string, unknown>>;

export default function Overview3DCanvas({ graph, theme, onNodeSelect }: Props) {
  const [ForceGraph3D, setForceGraph3D] = useState<ForceGraph3DComponent | null>(null);

  useEffect(() => {
    let mounted = true;
    import("react-force-graph-3d")
      .then((mod) => {
        if (mounted) {
          setForceGraph3D(() => mod.default as ForceGraph3DComponent);
        }
      })
      .catch(() => {
        if (mounted) {
          setForceGraph3D(null);
        }
      });
    return () => {
      mounted = false;
      document.body.style.cursor = "default";
    };
  }, []);

  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes]
  );

  const graphData = useMemo(
    () => ({
      nodes: graph.nodes.map<Overview3DNode>((node) => ({
        id: node.id,
        label: node.label,
        tags: node.tags,
      })),
      links: graph.edges.map<Overview3DEdge>((edge) => ({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label: edge.label,
      })),
    }),
    [graph.edges, graph.nodes]
  );

  const palette =
    theme === "dark"
      ? {
          background: "#111827",
          node: "#a5b4fc",
          link: "#94a3b8",
          text: "#e5e7eb",
          particle: "#c4b5fd",
        }
      : {
          background: "#f8fafc",
          node: "#4f46e5",
          link: "#64748b",
          text: "#0f172a",
          particle: "#4338ca",
        };

  if (!ForceGraph3D) {
    return (
      <div className="overview3d-root overview3d-root--loading">
        <Spin size="large" tip="3D 画布加载中…" />
      </div>
    );
  }

  return (
    <div className="overview3d-root">
      <div className="overview3d-hint-wrap">
        <Alert
          className="overview3d-hint"
          type="info"
          showIcon
          message="拖拽旋转，滚轮缩放，点击节点打开详情"
        />
      </div>
      <div className="overview3d-canvas">
        <ForceGraph3D
          graphData={graphData}
          backgroundColor={palette.background}
          nodeLabel={(node: Overview3DNode) =>
            `${node.label} (${node.id})${node.tags.length > 0 ? `\n#${node.tags.join(" #")}` : ""}`
          }
          nodeColor={() => palette.node}
          nodeVal={6}
          linkColor={() => palette.link}
          linkLabel={(link: Overview3DEdge) => `${link.label} [${link.type}]`}
          linkWidth={1.2}
          linkDirectionalArrowLength={3.8}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={1}
          linkDirectionalParticleSpeed={() => 0.004}
          linkDirectionalParticleColor={() => palette.particle}
          linkDirectionalParticleWidth={1.6}
          onNodeClick={(node: Overview3DNode) => {
            const selected = nodeById.get(node.id) ?? null;
            onNodeSelect(selected);
          }}
          cooldownTicks={80}
          showNavInfo={false}
          rendererConfig={{ antialias: true, alpha: true }}
          nodeResolution={10}
          linkOpacity={0.7}
          onNodeHover={(node: Overview3DNode | null) => {
            document.body.style.cursor = node ? "pointer" : "default";
          }}
        />
      </div>
      <div className="overview3d-caption" style={{ color: palette.text }}>
        节点映射：id / label / tags；关系映射：source / target / type / label
      </div>
    </div>
  );
}
