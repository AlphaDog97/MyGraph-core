import type cytoscape from "cytoscape";
import type { KnowledgeGraph } from "../domain/types";

export interface LayoutPlan {
  depthById: Map<string, number>;
  positions: Map<string, cytoscape.Position>;
}

interface GraphMetrics {
  indegree: Map<string, number>;
  outdegree: Map<string, number>;
  parentsById: Map<string, string[]>;
  childrenById: Map<string, string[]>;
  neighborsById: Map<string, string[]>;
}

interface BranchAssignment {
  anchorIds: string[];
  branchByNodeId: Map<string, string>;
  distanceByNodeId: Map<string, number>;
  nodesByBranchId: Map<string, string[]>;
}

interface BranchSector {
  branchId: string;
  centerAngle: number;
  span: number;
}

const TWO_PI = Math.PI * 2;
const FIRST_RING_RADIUS = 170;
const RING_STEP = 150;
const MIN_RING_GAP = 34;
const MIN_SECTOR_SPAN = Math.PI / 5;
const SECTOR_GAP = 0.12;
const SECTOR_PADDING = 0.08;
const MAX_ORDER_PASSES = 3;
const CROSSING_WEIGHT = 50_000;
const EDGE_LENGTH_WEIGHT = 0.002;

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function nodeDegree(metrics: GraphMetrics, nodeId: string): number {
  return (
    (metrics.indegree.get(nodeId) ?? 0) +
    (metrics.outdegree.get(nodeId) ?? 0)
  );
}

function estimateNodeWidth(graph: KnowledgeGraph, nodeId: string): number {
  const label = graph.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
  return Math.min(230, Math.max(118, label.length * 7.4 + 34));
}

function buildGraphMetrics(graph: KnowledgeGraph): GraphMetrics {
  const indegree = new Map<string, number>();
  const outdegree = new Map<string, number>();
  const parentsById = new Map<string, string[]>();
  const childrenById = new Map<string, string[]>();
  const neighborsById = new Map<string, string[]>();

  for (const node of graph.nodes) {
    indegree.set(node.id, 0);
    outdegree.set(node.id, 0);
    parentsById.set(node.id, []);
    childrenById.set(node.id, []);
    neighborsById.set(node.id, []);
  }

  for (const edge of graph.edges) {
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    outdegree.set(edge.source, (outdegree.get(edge.source) ?? 0) + 1);
    parentsById.get(edge.target)?.push(edge.source);
    childrenById.get(edge.source)?.push(edge.target);
    neighborsById.get(edge.source)?.push(edge.target);
    neighborsById.get(edge.target)?.push(edge.source);
  }

  for (const node of graph.nodes) {
    parentsById.set(node.id, unique(parentsById.get(node.id) ?? []));
    childrenById.set(node.id, unique(childrenById.get(node.id) ?? []));
    neighborsById.set(node.id, unique(neighborsById.get(node.id) ?? []));
  }

  return { indegree, outdegree, parentsById, childrenById, neighborsById };
}

function resolveLayoutRoots(graph: KnowledgeGraph, metrics: GraphMetrics): string[] {
  const roots = graph.nodes
    .filter((node) => (metrics.indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id)
    .sort((a, b) => {
      const degreeDiff = nodeDegree(metrics, b) - nodeDegree(metrics, a);
      return degreeDiff !== 0 ? degreeDiff : a.localeCompare(b);
    });
  if (roots.length > 0) return roots;

  return [...graph.nodes]
    .sort((a, b) => {
      const outDiff =
        (metrics.outdegree.get(b.id) ?? 0) -
        (metrics.outdegree.get(a.id) ?? 0);
      if (outDiff !== 0) return outDiff;
      const degreeDiff = nodeDegree(metrics, b.id) - nodeDegree(metrics, a.id);
      return degreeDiff !== 0 ? degreeDiff : a.id.localeCompare(b.id);
    })
    .slice(0, 1)
    .map((node) => node.id);
}

function buildDepthMap(
  graph: KnowledgeGraph,
  roots: string[],
  metrics: GraphMetrics
): Map<string, number> {
  const depthById = new Map<string, number>();
  const queue = roots.map((id) => ({ id, depth: 0 }));

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    const knownDepth = depthById.get(next.id);
    if (knownDepth !== undefined && knownDepth <= next.depth) continue;

    depthById.set(next.id, next.depth);
    for (const childId of metrics.childrenById.get(next.id) ?? []) {
      queue.push({ id: childId, depth: next.depth + 1 });
    }
  }

  for (const node of graph.nodes) {
    if (!depthById.has(node.id)) depthById.set(node.id, 0);
  }
  return depthById;
}

function assignBranches(
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

function createInitialBranchOrder(
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

function allocateSectors(
  order: string[],
  nodesByBranchId: Map<string, string[]>
): BranchSector[] {
  if (order.length === 0) return [];
  if (order.length === 1) {
    return [{ branchId: order[0], centerAngle: -Math.PI / 2, span: TWO_PI - 0.3 }];
  }

  const gapTotal = SECTOR_GAP * order.length;
  const usableAngle = Math.max(Math.PI, TWO_PI - gapTotal);
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

function normalizeAngle(angle: number): number {
  let normalized = angle;
  while (normalized <= -Math.PI) normalized += TWO_PI;
  while (normalized > Math.PI) normalized -= TWO_PI;
  return normalized;
}

function averageParentAngle(
  nodeId: string,
  metrics: GraphMetrics,
  positions: Map<string, cytoscape.Position>,
  fallback: number
): number {
  const angles = (metrics.parentsById.get(nodeId) ?? [])
    .map((parentId) => positions.get(parentId))
    .filter((position): position is cytoscape.Position => Boolean(position))
    .map((position) => Math.atan2(position.y, position.x));
  if (angles.length === 0) return fallback;
  const x = angles.reduce((sum, angle) => sum + Math.cos(angle), 0);
  const y = angles.reduce((sum, angle) => sum + Math.sin(angle), 0);
  return Math.atan2(y, x);
}

function placeBranchLayer(
  graph: KnowledgeGraph,
  nodeIds: string[],
  sector: BranchSector,
  layerIndex: number,
  metrics: GraphMetrics,
  positions: Map<string, cytoscape.Position>
): void {
  const sorted = [...nodeIds].sort((a, b) => {
    const angleA = averageParentAngle(a, metrics, positions, sector.centerAngle);
    const angleB = averageParentAngle(b, metrics, positions, sector.centerAngle);
    const angleDiff =
      normalizeAngle(angleA - sector.centerAngle) -
      normalizeAngle(angleB - sector.centerAngle);
    if (angleDiff !== 0) return angleDiff;
    const degreeDiff = nodeDegree(metrics, b) - nodeDegree(metrics, a);
    return degreeDiff !== 0 ? degreeDiff : a.localeCompare(b);
  });

  const availableSpan = Math.max(0.3, sector.span - SECTOR_PADDING * 2);
  const widths = sorted.map((nodeId) => estimateNodeWidth(graph, nodeId));
  const requiredArc =
    widths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, sorted.length - 1) * MIN_RING_GAP;
  const baseRadius = FIRST_RING_RADIUS + layerIndex * RING_STEP;
  const radius = Math.max(baseRadius, requiredArc / availableSpan);

  if (sorted.length === 1) {
    positions.set(sorted[0], {
      x: Math.cos(sector.centerAngle) * radius,
      y: Math.sin(sector.centerAngle) * radius,
    });
    return;
  }

  let cursor = -requiredArc / 2;
  sorted.forEach((nodeId, index) => {
    const width = widths[index];
    const centerArc = cursor + width / 2;
    const angle = sector.centerAngle + centerArc / radius;
    positions.set(nodeId, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
    cursor += width + MIN_RING_GAP;
  });
}

function createPositionsForOrder(
  graph: KnowledgeGraph,
  roots: string[],
  assignment: BranchAssignment,
  order: string[],
  metrics: GraphMetrics
): Map<string, cytoscape.Position> {
  const positions = new Map<string, cytoscape.Position>();
  if (roots.length === 1) positions.set(roots[0], { x: 0, y: 0 });

  const sectors = allocateSectors(order, assignment.nodesByBranchId);
  for (const sector of sectors) {
    const nodeIds = assignment.nodesByBranchId.get(sector.branchId) ?? [];
    const nodesByDistance = new Map<number, string[]>();
    for (const nodeId of nodeIds) {
      const distance = assignment.distanceByNodeId.get(nodeId) ?? 0;
      const bucket = nodesByDistance.get(distance) ?? [];
      bucket.push(nodeId);
      nodesByDistance.set(distance, bucket);
    }

    const distances = [...nodesByDistance.keys()].sort((a, b) => a - b);
    for (const distance of distances) {
      placeBranchLayer(
        graph,
        nodesByDistance.get(distance) ?? [],
        sector,
        distance,
        metrics,
        positions
      );
    }
  }

  return positions;
}

function orientation(
  a: cytoscape.Position,
  b: cytoscape.Position,
  c: cytoscape.Position
): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function segmentsCross(
  a: cytoscape.Position,
  b: cytoscape.Position,
  c: cytoscape.Position,
  d: cytoscape.Position
): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function scoreLayout(
  graph: KnowledgeGraph,
  positions: Map<string, cytoscape.Position>
): number {
  let crossings = 0;
  let edgeLength = 0;

  for (let leftIndex = 0; leftIndex < graph.edges.length; leftIndex += 1) {
    const left = graph.edges[leftIndex];
    const leftSource = positions.get(left.source);
    const leftTarget = positions.get(left.target);
    if (!leftSource || !leftTarget) continue;
    edgeLength += Math.hypot(
      leftTarget.x - leftSource.x,
      leftTarget.y - leftSource.y
    );

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < graph.edges.length;
      rightIndex += 1
    ) {
      const right = graph.edges[rightIndex];
      if (
        left.source === right.source ||
        left.source === right.target ||
        left.target === right.source ||
        left.target === right.target
      ) {
        continue;
      }
      const rightSource = positions.get(right.source);
      const rightTarget = positions.get(right.target);
      if (
        rightSource &&
        rightTarget &&
        segmentsCross(leftSource, leftTarget, rightSource, rightTarget)
      ) {
        crossings += 1;
      }
    }
  }

  return crossings * CROSSING_WEIGHT + edgeLength * EDGE_LENGTH_WEIGHT;
}

function optimizeBranchOrder(
  graph: KnowledgeGraph,
  roots: string[],
  assignment: BranchAssignment,
  initialOrder: string[],
  metrics: GraphMetrics
): Map<string, cytoscape.Position> {
  if (initialOrder.length <= 2) {
    return createPositionsForOrder(graph, roots, assignment, initialOrder, metrics);
  }

  let bestOrder = [...initialOrder];
  let bestPositions = createPositionsForOrder(
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
      const candidatePositions = createPositionsForOrder(
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
