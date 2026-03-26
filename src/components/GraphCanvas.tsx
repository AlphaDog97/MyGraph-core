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

const COMPACT_LAYOUT_ZOOM_THRESHOLD = 0.05;
const LAYOUT_DEPTH_X_STEP = 240;
const LAYOUT_Y_SCALE = 0.64;

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
        width: 1.5,
        "line-color": "data(edgeColor)",
        "target-arrow-color": "data(edgeColor)",
        "target-arrow-shape": "triangle",
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

function buildDepthMap(graph: KnowledgeGraph, roots: string[]): { depthById: Map<string, number>; maxDepth: number } {
  const childrenById = new Map<string, string[]>();
  for (const node of graph.nodes) childrenById.set(node.id, []);
  for (const edge of graph.edges) {
    const children = childrenById.get(edge.source);
    if (children) children.push(edge.target);
  }

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

function buildLayout(
  noMotion: boolean,
  roots: string[],
  depthById: Map<string, number>,
  maxDepth: number,
  compact = false
): cytoscape.LayoutOptions {
  const spacingFactor = compact ? 1.08 : 1.28;
  const minNodeSpacing = compact ? 30 : 54;

  return {
    name: "breadthfirst",
    directed: true,
    direction: "rightward",
    circle: false,
    roots,
    fit: true,
    padding: compact ? 30 : 44,
    animate: !noMotion,
    animationDuration: 600,
    avoidOverlap: true,
    spacingFactor,
    nodeDimensionsIncludeLabels: true,
    equidistant: true,
    startAngle: -Math.PI / 2,
    sweep: 2 * Math.PI,
    clockwise: true,
    minNodeSpacing,
    transform: (node: cytoscape.NodeSingular, position: cytoscape.Position) => {
      const depth = depthById.get(node.id()) ?? 0;
      return {
        x: depth * LAYOUT_DEPTH_X_STEP + position.x * 0.1,
        y: position.y * LAYOUT_Y_SCALE,
      };
    },
    concentric: (node: cytoscape.NodeSingular) =>
      maxDepth - (depthById.get(node.id()) ?? maxDepth),
    levelWidth: () => 1,
  } as cytoscape.LayoutOptions;
}

const TINY_ZOOM_THRESHOLD = 0.05;

function runLayoutWithAdaptiveFit(
  cy: Core,
  noMotion: boolean,
  roots: string[],
  depthById: Map<string, number>,
  maxDepth: number
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
      cy.layout(buildLayout(noMotion, roots, depthById, maxDepth, true)).run();
    }
  });
}

export default function GraphCanvas({
  graph,
  tagColors,
  searchQuery,
  cyRef,
  onNodeSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const initCy = useCallback(() => {
    if (!containerRef.current) return;
    if (cyRef.current) cyRef.current.destroy();

    const elements = toCytoscapeElements(graph, tagColors);
    const noMotion = prefersReducedMotion();
    const roots = resolveLayoutRoots(graph);
    const { depthById, maxDepth } = buildDepthMap(graph, roots);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: buildStyles(noMotion),
      layout: buildLayout(noMotion, roots, depthById, maxDepth),
      minZoom: COMPACT_LAYOUT_ZOOM_THRESHOLD,
      maxZoom: 4,
    });

    runLayoutWithAdaptiveFit(cy, noMotion, roots, depthById, maxDepth);

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

    if (q) {
      const matched = cy.nodes(".highlighted");
      if (matched.length > 0) {
        cy.animate({
          fit: { eles: matched, padding: 60 },
          duration: prefersReducedMotion() ? 0 : 400,
        });
      }
    }
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
