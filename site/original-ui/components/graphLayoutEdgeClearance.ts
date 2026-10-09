import type cytoscape from "cytoscape";
import type { KnowledgeEdge, KnowledgeGraph } from "../domain/types";
import { estimateNodeWidth } from "./graphLayoutModel";

const ESTIMATED_NODE_HEIGHT = 60;
const EDGE_LABEL_SIDE_GAP = 18;
const MIN_EDGE_DISTANCE = 1;
const SCALE_EPSILON = 0.001;

function isWideCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xffef)
  );
}

function estimateCharacterWidth(character: string): number {
  if (/\s/.test(character)) return 3.2;
  if (isWideCharacter(character)) return 9.5;
  if (/[MW@#%&]/.test(character)) return 8.2;
  if (/[ilI1.,:;|'`]/.test(character)) return 3.4;
  if (/[A-Z]/.test(character)) return 6.6;
  return 5.5;
}

export function estimateEdgeLabelWidth(label: string): number {
  return Array.from(label).reduce(
    (width, character) => width + estimateCharacterWidth(character),
    0
  );
}

function projectedNodeRadius(
  graph: KnowledgeGraph,
  nodeId: string,
  unitX: number,
  unitY: number
): number {
  const halfWidth = estimateNodeWidth(graph, nodeId) / 2;
  const halfHeight = ESTIMATED_NODE_HEIGHT / 2;
  return Math.abs(unitX) * halfWidth + Math.abs(unitY) * halfHeight;
}

function requiredEdgeDistance(
  graph: KnowledgeGraph,
  edge: KnowledgeEdge,
  source: cytoscape.Position,
  target: cytoscape.Position
): number {
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance < MIN_EDGE_DISTANCE) return 0;

  const unitX = deltaX / distance;
  const unitY = deltaY / distance;
  const sourceRadius = projectedNodeRadius(graph, edge.source, unitX, unitY);
  const targetRadius = projectedNodeRadius(graph, edge.target, unitX, unitY);
  const labelWidth = estimateEdgeLabelWidth(edge.label);

  return (
    sourceRadius +
    targetRadius +
    labelWidth +
    EDGE_LABEL_SIDE_GAP * 2
  );
}

function resolveClearanceScale(
  graph: KnowledgeGraph,
  positions: Map<string, cytoscape.Position>
): number {
  let scale = 1;

  for (const edge of graph.edges) {
    if (edge.source === edge.target) continue;
    const source = positions.get(edge.source);
    const target = positions.get(edge.target);
    if (!source || !target) continue;

    const distance = Math.hypot(target.x - source.x, target.y - source.y);
    if (distance < MIN_EDGE_DISTANCE) continue;
    const requiredDistance = requiredEdgeDistance(graph, edge, source, target);
    scale = Math.max(scale, requiredDistance / distance);
  }

  return scale;
}

export function ensureEdgeLabelClearance(
  graph: KnowledgeGraph,
  positions: Map<string, cytoscape.Position>
): Map<string, cytoscape.Position> {
  const scale = resolveClearanceScale(graph, positions);
  if (scale <= 1 + SCALE_EPSILON) return positions;

  return new Map(
    [...positions].map(([nodeId, position]) => [
      nodeId,
      { x: position.x * scale, y: position.y * scale },
    ])
  );
}
