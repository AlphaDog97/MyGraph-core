import type cytoscape from "cytoscape";
import type { KnowledgeGraph } from "../domain/types";
import type {
  BranchAssignment,
  BranchSector,
} from "./graphLayoutBranches";
import { allocateSectors } from "./graphLayoutBranches";
import type { GraphMetrics } from "./graphLayoutModel";
import { estimateNodeWidth, nodeDegree } from "./graphLayoutModel";

const TWO_PI = Math.PI * 2;
const FIRST_RING_RADIUS = 170;
const RING_STEP = 150;
const MIN_RING_GAP = 34;
const SECTOR_PADDING = 0.08;

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

export function createPositionsForOrder(
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
