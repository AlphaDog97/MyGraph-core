import cytoscape, { Core } from "cytoscape";
import { KnowledgeGraph } from "../domain/types";

const LAYOUT_DEPTH_X_STEP = 260;
const BASE_VERTICAL_GAP = 88;
const DEGREE_GAP_WEIGHT = 10;
const TINY_ZOOM_THRESHOLD = 0.1;

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

function resolveLayoutRoots(graph: KnowledgeGraph): string[] {
  const metrics = buildGraphMetrics(graph);
  const roots = graph.nodes
    .filter((node) => (metrics.indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  if (roots.length > 0) return roots;

  return [...graph.nodes]
    .sort((a, b) => {
      const outDiff =
        (metrics.outdegree.get(b.id) ?? 0) - (metrics.outdegree.get(a.id) ?? 0);
      if (outDiff !== 0) return outDiff;
      return (metrics.indegree.get(a.id) ?? 0) - (metrics.indegree.get(b.id) ?? 0);
    })
    .slice(0, 1)
    .map((node) => node.id);
}

function buildDepthMap(
  graph: KnowledgeGraph,
  roots: string[]
): { depthById: Map<string, number>; maxDepth: number } {
  const { childrenById } = buildGraphMetrics(graph);
  const depthById = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = roots.map((id) => ({
    id,
    depth: 0,
  }));

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
  return {
    depthById,
    maxDepth: Math.max(0, ...depthById.values()),
  };
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
    const bucket = nodesByDepth.get(depth) ?? [];
    bucket.push(node.id);
    nodesByDepth.set(depth, bucket);
  }

  const orderById = new Map<string, number>();
  const positions = new Map<string, cytoscape.Position>();

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const nodeIds = nodesByDepth.get(depth) ?? [];
    nodeIds.sort((a, b) => {
      const parentsA = metrics.parentsById.get(a) ?? [];
      const parentsB = metrics.parentsById.get(b) ?? [];
      const averageParentIndex = (parents: string[]) =>
        parents.length > 0
          ? parents.reduce(
              (sum, parentId) => sum + (orderById.get(parentId) ?? 0),
              0
            ) / parents.length
          : Number.POSITIVE_INFINITY;

      const parentDiff = averageParentIndex(parentsA) - averageParentIndex(parentsB);
      if (parentDiff !== 0) return parentDiff;

      const degreeA =
        (metrics.indegree.get(a) ?? 0) + (metrics.outdegree.get(a) ?? 0);
      const degreeB =
        (metrics.indegree.get(b) ?? 0) + (metrics.outdegree.get(b) ?? 0);
      if (degreeA !== degreeB) return degreeB - degreeA;
      return a.localeCompare(b);
    });

    const gaps = nodeIds.map((id) => {
      const degree =
        (metrics.indegree.get(id) ?? 0) + (metrics.outdegree.get(id) ?? 0);
      return BASE_VERTICAL_GAP + degree * DEGREE_GAP_WEIGHT;
    });
    const totalHeight =
      gaps.reduce((sum, gap) => sum + gap, 0) -
      (gaps[gaps.length - 1] ?? BASE_VERTICAL_GAP);
    let y = -totalHeight / 2;

    nodeIds.forEach((nodeId, index) => {
      orderById.set(nodeId, index);
      positions.set(nodeId, { x: depth * LAYOUT_DEPTH_X_STEP, y });
      y += gaps[index] ?? BASE_VERTICAL_GAP;
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
      return { x: planned.x * scale, y: planned.y * scale };
    },
  } as cytoscape.LayoutOptions;
}

export function createGraphLayoutPlan(graph: KnowledgeGraph) {
  const roots = resolveLayoutRoots(graph);
  const { depthById, maxDepth } = buildDepthMap(graph, roots);
  const positions = planNodePositions(graph, depthById, maxDepth);
  return { depthById, positions };
}

export function initialGraphLayout(
  noMotion: boolean,
  positions: Map<string, cytoscape.Position>
): cytoscape.LayoutOptions {
  return buildLayout(noMotion, positions);
}

export function runLayoutWithAdaptiveFit(
  cy: Core,
  noMotion: boolean,
  positions: Map<string, cytoscape.Position>
): void {
  const fitToAll = (padding: number) => {
    cy.fit(cy.elements(), padding);
    cy.center(cy.elements());
  };

  cy.one("layoutstop", () => {
    fitToAll(40);
    if (cy.zoom() <= TINY_ZOOM_THRESHOLD) {
      cy.one("layoutstop", () => fitToAll(24));
      cy.layout(buildLayout(noMotion, positions, true)).run();
    }
  });
}

function escapeSelectorId(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }
  return id.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
}

export function runDepthStaggerReveal(
  cy: Core,
  graph: KnowledgeGraph,
  depthById: Map<string, number>,
  noMotion: boolean
): number[] {
  if (noMotion) return [];

  const nodeIdsByDepth = new Map<number, string[]>();
  const edgeIdsByDepth = new Map<number, string[]>();
  let maxDepth = 0;

  for (const node of graph.nodes) {
    const depth = depthById.get(node.id) ?? 0;
    const bucket = nodeIdsByDepth.get(depth) ?? [];
    bucket.push(node.id);
    nodeIdsByDepth.set(depth, bucket);
    maxDepth = Math.max(maxDepth, depth);
  }
  for (const edge of graph.edges) {
    const depth = Math.max(
      depthById.get(edge.source) ?? 0,
      depthById.get(edge.target) ?? 0
    );
    const bucket = edgeIdsByDepth.get(depth) ?? [];
    bucket.push(edge.id);
    edgeIdsByDepth.set(depth, bucket);
  }

  cy.batch(() => {
    cy.nodes().style("opacity", 0);
    cy.edges().style("opacity", 0);
  });

  const timers: number[] = [];
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const timer = window.setTimeout(() => {
      if (cy.destroyed()) return;
      const nodeSelector = (nodeIdsByDepth.get(depth) ?? [])
        .map((id) => `#${escapeSelectorId(id)}`)
        .join(", ");
      const edgeSelector = (edgeIdsByDepth.get(depth) ?? [])
        .map((id) => `#${escapeSelectorId(id)}`)
        .join(", ");

      if (nodeSelector) {
        cy.$(nodeSelector).animate(
          { style: { opacity: 1 } },
          { duration: 220, queue: false }
        );
      }
      if (edgeSelector) {
        cy.$(edgeSelector).animate(
          { style: { opacity: 0.95 } },
          { duration: 180, queue: false }
        );
      }
    }, depth * 90);
    timers.push(timer);
  }

  return timers;
}
