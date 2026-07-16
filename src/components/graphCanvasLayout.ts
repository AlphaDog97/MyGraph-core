import cytoscape, { Core } from "cytoscape";
import { KnowledgeGraph } from "../domain/types";
import {
  createGraphGroups,
  measureLayoutPlan,
  packLayoutPlans,
} from "./graphLayoutPacking";
import {
  createRadialLayoutPlan,
  type LayoutPlan,
} from "./graphLayoutRadial";

const TINY_ZOOM_THRESHOLD = 0.1;

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

export function createGraphLayoutPlan(graph: KnowledgeGraph): LayoutPlan {
  const groups = createGraphGroups(graph);
  if (groups.length <= 1) return createRadialLayoutPlan(graph);
  return packLayoutPlans(
    groups.map((group) => measureLayoutPlan(createRadialLayoutPlan(group)))
  );
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
  positions: Map<string, cytoscape.Position>,
  onComplete?: () => void
): void {
  const fitToAll = (padding: number) => {
    cy.fit(cy.elements(), padding);
    cy.center(cy.elements());
  };

  cy.one("layoutstop", () => {
    fitToAll(40);
    if (cy.zoom() <= TINY_ZOOM_THRESHOLD) {
      cy.one("layoutstop", () => {
        fitToAll(24);
        onComplete?.();
      });
      cy.layout(buildLayout(noMotion, positions, true)).run();
      return;
    }
    onComplete?.();
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
