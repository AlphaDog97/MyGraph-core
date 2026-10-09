import type { KnowledgeGraph } from "../domain/types";
import type { GraphMetrics } from "./graphLayoutModel";
import { nodeDegree } from "./graphLayoutModel";

export interface BranchAssignment {
  anchorIds: string[];
  branchByNodeId: Map<string, string>;
  distanceByNodeId: Map<string, number>;
  nodesByBranchId: Map<string, string[]>;
}

export interface BranchSector {
  branchId: string;
  centerAngle: number;
  span: number;
}

const TWO_PI = Math.PI * 2;
const MIN_SECTOR_SPAN = Math.PI / 5;
const SECTOR_GAP = 0.12;

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function assignBranches(
  graph: KnowledgeGraph,
  roots: string[],
  metrics: GraphMetrics
): BranchAssignment {
  const centralRoot = roots.length === 1 ? roots[0] : null;
  let anchorIds = centralRoot
    ? [...(metrics.childrenById.get(centralRoot) ?? [])]
    : [...roots];

  if (anchorIds.length === 0 && centralRoot) {
    return {
      anchorIds: [],
      branchByNodeId: new Map(),
      distanceByNodeId: new Map(),
      nodesByBranchId: new Map(),
    };
  }

  anchorIds = unique(anchorIds).sort((a, b) => {
    const degreeDiff = nodeDegree(metrics, b) - nodeDegree(metrics, a);
    return degreeDiff !== 0 ? degreeDiff : a.localeCompare(b);
  });

  const branchByNodeId = new Map<string, string>();
  const distanceByNodeId = new Map<string, number>();
  const queue: Array<{ nodeId: string; branchId: string; distance: number }> = [];

  for (const anchorId of anchorIds) {
    branchByNodeId.set(anchorId, anchorId);
    distanceByNodeId.set(anchorId, 0);
    queue.push({ nodeId: anchorId, branchId: anchorId, distance: 0 });
  }

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;

    for (const neighborId of metrics.neighborsById.get(next.nodeId) ?? []) {
      if (neighborId === centralRoot) continue;
      const knownDistance = distanceByNodeId.get(neighborId);
      const knownBranch = branchByNodeId.get(neighborId);
      const candidateDistance = next.distance + 1;
      const isBetter =
        knownDistance === undefined ||
        candidateDistance < knownDistance ||
        (candidateDistance === knownDistance && next.branchId < (knownBranch ?? ""));
      if (!isBetter) continue;

      branchByNodeId.set(neighborId, next.branchId);
      distanceByNodeId.set(neighborId, candidateDistance);
      queue.push({
        nodeId: neighborId,
        branchId: next.branchId,
        distance: candidateDistance,
      });
    }
  }

  for (const node of graph.nodes) {
    if (node.id === centralRoot || branchByNodeId.has(node.id)) continue;
    const fallbackBranch = anchorIds
      .map((branchId) => ({
        branchId,
        linked: (metrics.neighborsById.get(node.id) ?? []).filter(
          (neighborId) => branchByNodeId.get(neighborId) === branchId
        ).length,
      }))
      .sort((a, b) => b.linked - a.linked || a.branchId.localeCompare(b.branchId))[0]
      ?.branchId;
    if (!fallbackBranch) continue;
    branchByNodeId.set(node.id, fallbackBranch);
    distanceByNodeId.set(node.id, 1);
  }

  const nodesByBranchId = new Map<string, string[]>();
  for (const anchorId of anchorIds) nodesByBranchId.set(anchorId, []);
  for (const [nodeId, branchId] of branchByNodeId) {
    nodesByBranchId.get(branchId)?.push(nodeId);
  }

  return { anchorIds, branchByNodeId, distanceByNodeId, nodesByBranchId };
}

function branchConnectionCounts(
  graph: KnowledgeGraph,
  branchByNodeId: Map<string, string>
): Map<string, Map<string, number>> {
  const counts = new Map<string, Map<string, number>>();
  for (const edge of graph.edges) {
    const sourceBranch = branchByNodeId.get(edge.source);
    const targetBranch = branchByNodeId.get(edge.target);
    if (!sourceBranch || !targetBranch || sourceBranch === targetBranch) continue;
    const sourceCounts = counts.get(sourceBranch) ?? new Map<string, number>();
    sourceCounts.set(targetBranch, (sourceCounts.get(targetBranch) ?? 0) + 1);
    counts.set(sourceBranch, sourceCounts);
    const targetCounts = counts.get(targetBranch) ?? new Map<string, number>();
    targetCounts.set(sourceBranch, (targetCounts.get(sourceBranch) ?? 0) + 1);
    counts.set(targetBranch, targetCounts);
  }
  return counts;
}

export function createInitialBranchOrder(
  graph: KnowledgeGraph,
  assignment: BranchAssignment,
  metrics: GraphMetrics
): string[] {
  if (assignment.anchorIds.length <= 2) return [...assignment.anchorIds];

  const connections = branchConnectionCounts(graph, assignment.branchByNodeId);
  const weight = (branchId: string) =>
    (assignment.nodesByBranchId.get(branchId)?.length ?? 0) * 10 +
    nodeDegree(metrics, branchId);
  const remaining = new Set(assignment.anchorIds);
  const first = [...remaining].sort(
    (a, b) => weight(b) - weight(a) || a.localeCompare(b)
  )[0];
  if (!first) return [];

  const order = [first];
  remaining.delete(first);
  while (remaining.size > 0) {
    const last = order[order.length - 1];
    const next = [...remaining].sort((a, b) => {
      const connectionDiff =
        (connections.get(last)?.get(b) ?? 0) -
        (connections.get(last)?.get(a) ?? 0);
      if (connectionDiff !== 0) return connectionDiff;
      const weightDiff = weight(b) - weight(a);
      return weightDiff !== 0 ? weightDiff : a.localeCompare(b);
    })[0];
    order.push(next);
    remaining.delete(next);
  }
  return order;
}

export function allocateSectors(
  order: string[],
  nodesByBranchId: Map<string, string[]>
): BranchSector[] {
  if (order.length === 0) return [];
  if (order.length === 1) {
    return [{ branchId: order[0], centerAngle: -Math.PI / 2, span: TWO_PI - 0.3 }];
  }

  const usableAngle = Math.max(Math.PI, TWO_PI - SECTOR_GAP * order.length);
  const minimumTotal = Math.min(usableAngle, MIN_SECTOR_SPAN * order.length);
  const flexibleAngle = Math.max(0, usableAngle - minimumTotal);
  const weights = order.map((branchId) =>
    Math.max(1, nodesByBranchId.get(branchId)?.length ?? 0)
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = -Math.PI / 2;

  return order.map((branchId, index) => {
    const span =
      minimumTotal / order.length +
      flexibleAngle * (weights[index] / totalWeight);
    const centerAngle = cursor + span / 2;
    cursor += span + SECTOR_GAP;
    return { branchId, centerAngle, span };
  });
}
