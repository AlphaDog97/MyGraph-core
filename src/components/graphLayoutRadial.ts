import type cytoscape from "cytoscape";
import type { KnowledgeGraph } from "../domain/types";
import {
  assignBranches,
  createInitialBranchOrder,
  type BranchAssignment,
} from "./graphLayoutBranches";
import { ensureEdgeLabelClearance } from "./graphLayoutEdgeClearance";
import {
  buildDepthMap,
  buildGraphMetrics,
  resolveLayoutRoots,
  type GraphMetrics,
  type LayoutPlan,
} from "./graphLayoutModel";
import { createPositionsForOrder } from "./graphLayoutPlacement";
import { scoreLayout } from "./graphLayoutScoring";

export type { LayoutPlan } from "./graphLayoutModel";

const MAX_ORDER_PASSES = 3;

function createCandidatePositions(
  graph: KnowledgeGraph,
  roots: string[],
  assignment: BranchAssignment,
  order: string[],
  metrics: GraphMetrics
): Map<string, cytoscape.Position> {
  const positions = createPositionsForOrder(
    graph,
    roots,
    assignment,
    order,
    metrics
  );
  return ensureEdgeLabelClearance(graph, positions);
}

function optimizeBranchOrder(
  graph: KnowledgeGraph,
  roots: string[],
  assignment: BranchAssignment,
  initialOrder: string[],
  metrics: GraphMetrics
): Map<string, cytoscape.Position> {
  if (initialOrder.length <= 2) {
    return createCandidatePositions(
      graph,
      roots,
      assignment,
      initialOrder,
      metrics
    );
  }

  let bestOrder = [...initialOrder];
  let bestPositions = createCandidatePositions(
    graph,
    roots,
    assignment,
    bestOrder,
    metrics
  );
  let bestScore = scoreLayout(graph, bestPositions);

  for (let pass = 0; pass < MAX_ORDER_PASSES; pass += 1) {
    let improved = false;
    for (let index = 0; index < bestOrder.length; index += 1) {
      const nextIndex = (index + 1) % bestOrder.length;
      const candidateOrder = [...bestOrder];
      [candidateOrder[index], candidateOrder[nextIndex]] = [
        candidateOrder[nextIndex],
        candidateOrder[index],
      ];
      const candidatePositions = createCandidatePositions(
        graph,
        roots,
        assignment,
        candidateOrder,
        metrics
      );
      const candidateScore = scoreLayout(graph, candidatePositions);
      if (candidateScore + 0.001 >= bestScore) continue;

      bestOrder = candidateOrder;
      bestPositions = candidatePositions;
      bestScore = candidateScore;
      improved = true;
    }
    if (!improved) break;
  }

  return bestPositions;
}

export function createRadialLayoutPlan(graph: KnowledgeGraph): LayoutPlan {
  if (graph.nodes.length === 0) {
    return { depthById: new Map(), positions: new Map() };
  }

  const metrics = buildGraphMetrics(graph);
  const roots = resolveLayoutRoots(graph, metrics);
  const depthById = buildDepthMap(graph, roots, metrics);
  const assignment = assignBranches(graph, roots, metrics);

  if (assignment.anchorIds.length === 0) {
    const rootId = roots[0] ?? graph.nodes[0].id;
    return {
      depthById,
      positions: new Map([[rootId, { x: 0, y: 0 }]]),
    };
  }

  const initialOrder = createInitialBranchOrder(graph, assignment, metrics);
  const positions = optimizeBranchOrder(
    graph,
    roots,
    assignment,
    initialOrder,
    metrics
  );

  return { depthById, positions };
}
