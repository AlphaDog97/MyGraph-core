import { useEffect, useRef, useCallback } from "react";
import cytoscape, { Core } from "cytoscape";
import { KnowledgeNode, KnowledgeGraph, TagColorAssignment } from "../domain/types";
import { toCytoscapeElements } from "../data/loader";

interface Props {
  graph: KnowledgeGraph;
  tagColors: TagColorAssignment;
  searchQuery: string;
  cyRef: React.MutableRefObject<Core | null>;
  onNodeSelect: (node: KnowledgeNode | null) => void;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const COMPACT_LAYOUT_ZOOM_THRESHOLD = 0.1;
const LAYOUT_DEPTH_X_STEP = 260;
const BASE_VERTICAL_GAP = 88;
const DEGREE_GAP_WEIGHT = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildStyles(noMotion: boolean): any[] {
  return [
    {
      selector: "node",
      style: {
        shape: "roundrectangle",
        label: "data(label)",
        "background-color": "#f7fafc",
        "border-width": 3,
        "border-color": "data(borderColor)",
        "text-valign": "center",
        "text-halign": "center",
        "font-family": "Inter, system-ui, sans-serif",
        "font-size": "13px",
        "font-weight": 500,
        color: "#2d3748",
        "text-outline-color": "#ffffff",
        "text-outline-width": 2,
        width: "label",
        "min-width": 110,
        height: 36,
        "min-height": 36,
        padding: 14,
        "text-wrap": "none",
        "overlay-padding": 4,
        "transition-property": "border-color, opacity, background-color",
        "transition-duration": noMotion ? 0 : 250,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: "edge",
      style: {
        width: 2.4,
        opacity: 0.95,
        "line-color": "data(edgeColor)",
        "target-arrow-color": "data(edgeColor)",
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.95,
        "curve-style": "bezier",
        label: "data(label)",
        "font-family": "Inter, system-ui, sans-serif",
        "font-size": "10px",
        color: "data(edgeColor)",
        "text-rotation": "autorotate",
        "text-outline-color": "#f7f8fa",
        "text-outline-width": 2,
        "transition-property": "opacity, line-color",
        "transition-duration": noMotion ? 0 : 250,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: "node.dimmed",
      style: { opacity: 0.15 },
    },
    {
      selector: "edge.dimmed",
      style: { opacity: 0.08 },
    },
    {
      selector: "node.highlighted",
      style: { "border-width": 5, "font-weight": 600 },
    },
    {
      selector: "node.selected-node",
      style: { "border-width": 4, "background-color": "#f7fafc", "font-weight": 600 },
    },
  ];
}


function resolveLayoutRoots(graph: KnowledgeGraph): string[] {
  const indegree = new Map<string, number>();
  const outdegree = new Map<string, number>();

  for (const node of graph.nodes) {
    indegree.set(node.id, 0);
    outdegree.set(node.id, 0);
  }

  for (const edge of graph.edges) {
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    outdegree.set(edge.source, (outdegree.get(edge.source) ?? 0) + 1);
  }

  const roots = graph.nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  if (roots.length > 0) return roots;

  const fallback = [...graph.nodes].sort((a, b) => {
    const outDiff = (outdegree.get(b.id) ?? 0) - (outdegree.get(a.id) ?? 0);
    if (outDiff !== 0) return outDiff;
    return (indegree.get(a.id) ?? 0) - (indegree.get(b.id) ?? 0);
  });
  return fallback.slice(0, 1).map((node) => node.id);
}

interface GraphMetrics {
  indegree: Map<string, number>;
  outdegree: Map<string, number>;
  parentsById: Map<string, string[]>;
  childrenById: Map<string, string[]>;
}

function buildGraphMetrics(graph: KnowledgeGraph): GraphMetrics {
  const indegree = new Map<string, number>();
  const outdegree = new Map<string, number>();
  const parentsById = new Map<string, string[]>();
  const childrenById = new Map<string, string[]>();

  for (const node of graph.nodes) {
    indegree.set(node.id, 0);
    outdegree.set(node.id, 0);
    parentsById.set(node.id, []);
    childrenById.set(node.id, []);
  }

  for (const edge of graph.edges) {
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    outdegree.set(edge.source, (outdegree.get(edge.source) ?? 0) + 1);
    parentsById.get(edge.target)?.push(edge.source);
    childrenById.get(edge.source)?.push(edge.target);
  }

  return { indegree, outdegree, parentsById, childrenById };
}

function buildDepthMap(graph: KnowledgeGraph, roots: string[]): { depthById: Map<string, number>; maxDepth: number } {
  const { childrenById } = buildGraphMetrics(graph);

  const depthById = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = roots.map((id) => ({ id, depth: 0 }));

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;

    const knownDepth = depthById.get(next.id);
    if (knownDepth !== undefined && knownDepth <= next.depth) continue;

    depthById.set(next.id, next.depth);
    for (const childId of childrenById.get(next.id) ?? []) {
      queue.push({ id: childId, depth: next.depth + 1 });
    }
  }

  for (const node of graph.nodes) {
    if (!depthById.has(node.id)) depthById.set(node.id, 0);
  }

  const maxDepth = Math.max(0, ...depthById.values());
  return { depthById, maxDepth };
}

function planNodePositions(
  graph: KnowledgeGraph,
  depthById: Map<string, number>,
  maxDepth: number
): Map<string, cytoscape.Position> {
  const metrics = buildGraphMetrics(graph);
  const nodesByDepth = new Map<number, string[]>();
  for (const node of graph.nodes) {
    const depth = depthById.get(node.id) ?? 0;
    const list = nodesByDepth.get(depth) ?? [];
    list.push(node.id);
    nodesByDepth.set(depth, list);
  }

  const orderById = new Map<string, number>();
  const positions = new Map<string, cytoscape.Position>();

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const nodeIds = nodesByDepth.get(depth) ?? [];

    nodeIds.sort((a, b) => {
      const parentsA = metrics.parentsById.get(a) ?? [];
      const parentsB = metrics.parentsById.get(b) ?? [];

      const avgParentIndexA =
        parentsA.length > 0
          ? parentsA.reduce((sum, parentId) => sum + (orderById.get(parentId) ?? 0), 0) / parentsA.length
          : Number.POSITIVE_INFINITY;
      const avgParentIndexB =
        parentsB.length > 0
          ? parentsB.reduce((sum, parentId) => sum + (orderById.get(parentId) ?? 0), 0) / parentsB.length
          : Number.POSITIVE_INFINITY;
      if (avgParentIndexA !== avgParentIndexB) return avgParentIndexA - avgParentIndexB;

      const degreeA = (metrics.indegree.get(a) ?? 0) + (metrics.outdegree.get(a) ?? 0);
      const degreeB = (metrics.indegree.get(b) ?? 0) + (metrics.outdegree.get(b) ?? 0);
      if (degreeA !== degreeB) return degreeB - degreeA;

      return a.localeCompare(b);
    });

    const verticalGaps = nodeIds.map((id) => {
      const degree = (metrics.indegree.get(id) ?? 0) + (metrics.outdegree.get(id) ?? 0);
      return BASE_VERTICAL_GAP + degree * DEGREE_GAP_WEIGHT;
    });

    const totalHeight =
      verticalGaps.reduce((sum, gap) => sum + gap, 0) - (verticalGaps[verticalGaps.length - 1] ?? BASE_VERTICAL_GAP);
    let y = -totalHeight / 2;

    nodeIds.forEach((nodeId, index) => {
      orderById.set(nodeId, index);
      positions.set(nodeId, {
        x: depth * LAYOUT_DEPTH_X_STEP,
        y,
      });
      y += verticalGaps[index] ?? BASE_VERTICAL_GAP;
    });
  }

  return positions;
}

function buildLayout(
  noMotion: boolean,
  positions: Map<string, cytoscape.Position>,
  compact = false
): cytoscape.LayoutOptions {
  const scale = compact ? 0.86 : 1;
  return {
    name: "preset",
    fit: true,
    padding: compact ? 30 : 44,
    animate: !noMotion,
    animationDuration: noMotion ? 0 : 350,
    positions: (node: cytoscape.NodeSingular) => {
      const planned = positions.get(node.id()) ?? { x: 0, y: 0 };
      return {
        x: planned.x * scale,
        y: planned.y * scale,
      };
    },
  } as cytoscape.LayoutOptions;
}

const TINY_ZOOM_THRESHOLD = 0.1;

function runLayoutWithAdaptiveFit(
  cy: Core,
  noMotion: boolean,
  positions: Map<string, cytoscape.Position>
) {
  const fitToAll = (padding: number) => {
    cy.fit(cy.elements(), padding);
    cy.center(cy.elements());
  };

  cy.one("layoutstop", () => {
    fitToAll(40);

    if (cy.zoom() <= TINY_ZOOM_THRESHOLD) {
      cy.one("layoutstop", () => {
        fitToAll(24);
      });
      cy.layout(buildLayout(noMotion, positions, true)).run();
    }
  });
}

function runDepthStaggerReveal(
  cy: Core,
  graph: KnowledgeGraph,
  depthById: Map<string, number>,
  noMotion: boolean
): number[] {
  if (noMotion) return [];

  const nodeIdsByDepth = new Map<number, string[]>();
  let maxDepth = 0;

  for (const node of graph.nodes) {
    const depth = depthById.get(node.id) ?? 0;
    const bucket = nodeIdsByDepth.get(depth) ?? [];
    bucket.push(node.id);
    nodeIdsByDepth.set(depth, bucket);
    if (depth > maxDepth) maxDepth = depth;
  }

  const edgeIdsByDepth = new Map<number, string[]>();
  for (const edge of graph.edges) {
    const depth = Math.max(depthById.get(edge.source) ?? 0, depthById.get(edge.target) ?? 0);
    const bucket = edgeIdsByDepth.get(depth) ?? [];
    bucket.push(edge.id);
    edgeIdsByDepth.set(depth, bucket);
  }

  cy.batch(() => {
    cy.nodes().forEach((node) => {
      node.style("opacity", 0);
    });
    cy.edges().forEach((edge) => {
      edge.style("opacity", 0);
    });
  });

  const timers: number[] = [];
  const DEPTH_DELAY_MS = 90;
  const NODE_FADE_MS = 220;
  const EDGE_FADE_MS = 180;

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const timer = window.setTimeout(() => {
      if (cy.destroyed()) return;

      const nodeSelector = (nodeIdsByDepth.get(depth) ?? [])
        .map((id) => `#${CSS.escape(id)}`)
        .join(", ");
      const edgeSelector = (edgeIdsByDepth.get(depth) ?? [])
        .map((id) => `#${CSS.escape(id)}`)
        .join(", ");

      if (nodeSelector) {
        cy.$(nodeSelector).animate(
          { style: { opacity: 1 } },
          { duration: NODE_FADE_MS, queue: false }
        );
      }

      if (edgeSelector) {
        cy.$(edgeSelector).animate(
          { style: { opacity: 0.95 } },
          { duration: EDGE_FADE_MS, queue: false }
        );
      }
    }, depth * DEPTH_DELAY_MS);
    timers.push(timer);
  }

  return timers;
}

export default function GraphCanvas({
  graph,
  tagColors,
  searchQuery,
  cyRef,
  onNodeSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const revealTimerRef = useRef<number[]>([]);

  const initCy = useCallback(() => {
    if (!containerRef.current) return;
    revealTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    revealTimerRef.current = [];
    if (cyRef.current) cyRef.current.destroy();

    const elements = toCytoscapeElements(graph, tagColors);
    const noMotion = prefersReducedMotion();
    const roots = resolveLayoutRoots(graph);
    const { depthById, maxDepth } = buildDepthMap(graph, roots);
    const plannedPositions = planNodePositions(graph, depthById, maxDepth);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: buildStyles(noMotion),
      layout: buildLayout(noMotion, plannedPositions),
      minZoom: COMPACT_LAYOUT_ZOOM_THRESHOLD,
      maxZoom: 4,
    });

    runLayoutWithAdaptiveFit(cy, noMotion, plannedPositions);
    revealTimerRef.current = runDepthStaggerReveal(cy, graph, depthById, noMotion);

    cy.on("tap", "node", (evt) => {
      const nodeId = evt.target.id();
      const kn = graph.nodes.find((n) => n.id === nodeId);
      if (kn) {
        cy.nodes().removeClass("selected-node");
        evt.target.addClass("selected-node");
        onNodeSelect(kn);
      }
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        cy.nodes().removeClass("selected-node");
        onNodeSelect(null);
      }
    });

    cyRef.current = cy;
  }, [graph, tagColors, cyRef, onNodeSelect]);

  useEffect(() => {
    initCy();
    return () => {
      revealTimerRef.current.forEach((timer) => window.clearTimeout(timer));
      revealTimerRef.current = [];
      cyRef.current?.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initCy]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.nodes().forEach((node) => {
        const kn = graph.nodes.find((n) => n.id === node.id());
        if (kn) {
          node.data("borderColor", kn.resolveBorderColor(tagColors));
        }
      });
    });
  }, [tagColors, graph, cyRef]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const q = searchQuery.toLowerCase().trim();
    cy.batch(() => {
      if (!q) {
        cy.elements().removeClass("dimmed highlighted");
        return;
      }

      cy.elements().addClass("dimmed").removeClass("highlighted");

      const matched = cy.nodes().filter((node) => {
        const kn = graph.nodes.find((n) => n.id === node.id());
        return kn ? kn.searchText().includes(q) : false;
      });

      matched.removeClass("dimmed").addClass("highlighted");
      matched.connectedEdges().removeClass("dimmed");
      matched.connectedEdges().connectedNodes().removeClass("dimmed");
    });

  }, [searchQuery, graph, cyRef]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      cy.resize();
      cy.fit(cy.elements(), 40);
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [cyRef]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        inset: 0,
      }}
    />
  );
}
