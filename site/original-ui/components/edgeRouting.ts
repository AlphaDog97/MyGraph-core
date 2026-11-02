import type { Position } from "cytoscape";
import type { ConnectionPort, NodeBounds } from "./graphConnectionGeometry";
import { expandBox, hitsBox, LANE_GAP, linePenalty, portExit, segments, simplifyRoute, type Segment } from "./edgeRoutingGeometry";
import { searchRoute } from "./edgeRoutingSearch";

function trackCoordinates(values: number[], required: number[], min: number, max: number): number[] {
  const sorted = [...new Set(values.filter(value => value >= min && value <= max))].sort((a, b) => a - b);
  // Bound work for dense category views while always retaining endpoints and outer escape lanes.
  const stride = Math.max(1, Math.ceil(sorted.length / 60));
  return [...new Set([...sorted.filter((_, index) => index % stride === 0), ...required, min, max])].sort((a, b) => a - b);
}

export function routeConnection(source: ConnectionPort, target: ConnectionPort, boxes: NodeBounds[], occupied: Segment[] = []): Position[] {
  const start = portExit(source), end = portExit(target);
  const margin = 160;
  const bounds = { x1: Math.min(start.x, end.x) - margin, x2: Math.max(start.x, end.x) + margin,
    y1: Math.min(start.y, end.y) - margin, y2: Math.max(start.y, end.y) + margin };
  const corridor = { ...bounds };
  // Include escape lanes around existing connections that span the local corridor.
  for (const { a, b } of occupied) {
    if (Math.max(a.x, b.x) < corridor.x1 || Math.min(a.x, b.x) > corridor.x2 ||
        Math.max(a.y, b.y) < corridor.y1 || Math.min(a.y, b.y) > corridor.y2) continue;
    bounds.x1 = Math.min(bounds.x1, a.x - LANE_GAP, b.x - LANE_GAP);
    bounds.x2 = Math.max(bounds.x2, a.x + LANE_GAP, b.x + LANE_GAP);
    bounds.y1 = Math.min(bounds.y1, a.y - LANE_GAP, b.y - LANE_GAP);
    bounds.y2 = Math.max(bounds.y2, a.y + LANE_GAP, b.y + LANE_GAP);
  }
  const padded = boxes.map(box => expandBox(box));
  const escapeBounds = { ...bounds };
  for (const box of padded) {
    if (box.x1 >= escapeBounds.x2 || box.x2 <= escapeBounds.x1 || box.y1 >= escapeBounds.y2 || box.y2 <= escapeBounds.y1) continue;
    bounds.x1 = Math.min(bounds.x1, box.x1 - LANE_GAP); bounds.x2 = Math.max(bounds.x2, box.x2 + LANE_GAP);
    bounds.y1 = Math.min(bounds.y1, box.y1 - LANE_GAP); bounds.y2 = Math.max(bounds.y2, box.y2 + LANE_GAP);
  }
  const obstacles = padded.filter(box =>
    box.x1 < bounds.x2 && box.x2 > bounds.x1 && box.y1 < bounds.y2 && box.y2 > bounds.y1);
  const xs = [start.x, end.x], ys = [start.y, end.y];
  for (const box of obstacles) { xs.push(box.x1, box.x2); ys.push(box.y1, box.y2); }
  for (const line of occupied) {
    for (const point of [line.a, line.b]) { xs.push(point.x - LANE_GAP, point.x + LANE_GAP); ys.push(point.y - LANE_GAP, point.y + LANE_GAP); }
  }
  const path = searchRoute(start, end,
    trackCoordinates(xs, [start.x, end.x], bounds.x1, bounds.x2),
    trackCoordinates(ys, [start.y, end.y], bounds.y1, bounds.y2), obstacles, occupied);
  if (path) return simplifyRoute([source, ...path, target]);
  // Overlapping nodes can seal an exit. Keep a bounded, least-obstructed fallback.
  const candidates = [
    [start, { x: start.x, y: end.y }, end], [start, { x: end.x, y: start.y }, end],
    [start, { x: bounds.x1, y: start.y }, { x: bounds.x1, y: end.y }, end],
    [start, { x: start.x, y: bounds.y1 }, { x: end.x, y: bounds.y1 }, end],
  ];
  const score = (points: Position[]) => segments(points).reduce((total, { a, b }) => total +
    Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + linePenalty(a, b, occupied) +
    obstacles.filter(box => hitsBox(a, b, box)).length * 100000, 0);
  candidates.sort((a, b) => score(a) - score(b));
  return simplifyRoute([source, ...candidates[0], target]);
}

/** Convert absolute bends to Cytoscape's node-relative segment representation. */
export function segmentCoordinates(points: Position[], source: Position, target: Position) {
  const dx = target.x - source.x, dy = target.y - source.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 0.001) return null;
  const length = Math.sqrt(lengthSquared);
  return {
    weights: points.slice(1, -1).map(point => ((point.x - source.x) * dx + (point.y - source.y) * dy) / lengthSquared),
    distances: points.slice(1, -1).map(point => (-(point.x - source.x) * dy + (point.y - source.y) * dx) / length),
  };
}
