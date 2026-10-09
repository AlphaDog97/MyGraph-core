import { ComponentType, useEffect, useMemo, useState } from "react";
import { Alert, Spin } from "antd";
import { CanvasTexture, Sprite, SpriteMaterial } from "three";
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
type LoadState = "loading" | "ready" | "failed";

const LARGE_GRAPH_THRESHOLD = {
  nodes: 900,
  edges: 2600,
} as const;

const MEDIUM_GRAPH_THRESHOLD = {
  nodes: 350,
  edges: 900,
} as const;

export default function Overview3DCanvas({ graph, theme, onNodeSelect }: Props) {
  const [ForceGraph3D, setForceGraph3D] = useState<ForceGraph3DComponent | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    const webglUnsupported =
      typeof window !== "undefined" &&
      (!window.WebGLRenderingContext || !document.createElement("canvas").getContext("webgl"));
    if (webglUnsupported) {
      setLoadState("failed");
      return;
    }

    let mounted = true;
    import("react-force-graph-3d")
      .then((mod) => {
        if (mounted) {
          setForceGraph3D(() => mod.default as ForceGraph3DComponent);
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (mounted) {
          setForceGraph3D(null);
          setLoadState("failed");
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

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const profile = useMemo(() => {
    const nodeCount = graphData.nodes.length;
    const edgeCount = graphData.links.length;
    if (nodeCount >= LARGE_GRAPH_THRESHOLD.nodes || edgeCount >= LARGE_GRAPH_THRESHOLD.edges) {
      return {
        name: "large",
        nodeVal: 3.6,
        nodeResolution: 6,
        linkWidth: 0.8,
        arrowLength: 2.8,
        particles: 0,
        cooldownTicks: 35,
      };
    }
    if (nodeCount >= MEDIUM_GRAPH_THRESHOLD.nodes || edgeCount >= MEDIUM_GRAPH_THRESHOLD.edges) {
      return {
        name: "medium",
        nodeVal: 4.8,
        nodeResolution: 8,
        linkWidth: 1,
        arrowLength: 3.2,
        particles: 1,
        cooldownTicks: 55,
      };
    }
    return {
      name: "small",
      nodeVal: 6,
      nodeResolution: 10,
      linkWidth: 1.2,
      arrowLength: 3.8,
      particles: 1,
      cooldownTicks: 80,
    };
  }, [graphData.links.length, graphData.nodes.length]);

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

  const nodeTextSprite = useMemo(() => {
    const cache = new Map<string, Sprite>();
    const makeSprite = (text: string) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return null;

      const fontSize = 38;
      context.font = `600 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
      const textWidth = Math.max(220, Math.ceil(context.measureText(text).width) + 30);
      canvas.width = textWidth;
      canvas.height = 66;

      context.font = `600 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
      context.fillStyle = theme === "dark" ? "rgba(15, 23, 42, 0.82)" : "rgba(255, 255, 255, 0.82)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = palette.text;
      context.fillText(text, 12, 46);

      const texture = new CanvasTexture(canvas);
      const material = new SpriteMaterial({ map: texture, depthWrite: false, transparent: true });
      const sprite = new Sprite(material);
      sprite.scale.set(18, 5.2, 1);
      sprite.position.set(0, 8.8, 0);
      return sprite;
    };

    return (node: Overview3DNode) => {
      const cached = cache.get(node.id);
      if (cached) return cached.clone();
      const sprite = makeSprite(node.label || node.id);
      if (!sprite) return undefined;
      cache.set(node.id, sprite);
      return sprite.clone();
    };
  }, [palette.text, theme]);

  if (loadState === "loading") {
    return (
      <div className="overview3d-root overview3d-root--loading">
        <Spin size="large" tip="3D 画布加载中…" />
      </div>
    );
  }

  if (loadState === "failed" || !ForceGraph3D) {
    return (
      <div className="overview3d-root overview3d-root--loading">
        <Alert
          type="warning"
          showIcon
          message="当前环境无法启用 3D 渲染，已降级为概要视图"
          description={`nodes: ${graph.nodes.length} · edges: ${graph.edges.length}`}
        />
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
          nodeThreeObject={nodeTextSprite}
          nodeThreeObjectExtend
          nodeVal={profile.nodeVal}
          linkColor={() => palette.link}
          linkLabel={(link: Overview3DEdge) => `${link.label} [${link.type}]`}
          linkWidth={profile.linkWidth}
          linkDirectionalArrowLength={profile.arrowLength}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={reduceMotion ? 0 : profile.particles}
          linkDirectionalParticleSpeed={() => 0.004}
          linkDirectionalParticleColor={() => palette.particle}
          linkDirectionalParticleWidth={1.6}
          onNodeClick={(node: Overview3DNode) => {
            const selected = nodeById.get(node.id) ?? null;
            onNodeSelect(selected);
          }}
          cooldownTicks={profile.cooldownTicks}
          showNavInfo={false}
          rendererConfig={{ antialias: true, alpha: true }}
          nodeResolution={profile.nodeResolution}
          linkOpacity={0.7}
          onNodeHover={(node: Overview3DNode | null) => {
            document.body.style.cursor = node ? "pointer" : "default";
          }}
        />
      </div>
      <div className="overview3d-caption" style={{ color: palette.text }}>
        节点映射：id / label / tags（节点名常驻显示）；关系映射：source / target / type / label（性能档位：{profile.name}）
      </div>
    </div>
  );
}
