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

  if (cy.nodes().length === 0) {
    onComplete?.();
    return;
  }

  const run = (compact: boolean) => {
    cy.one("layoutstop", () => {
      fitToAll(compact ? 24 : 40);
      if (!compact && cy.zoom() <= TINY_ZOOM_THRESHOLD) {
        run(true);
        return;
      }
      onComplete?.();
    });
    cy.layout(buildLayout(noMotion, positions, compact)).run();
  };

  run(false);
}
