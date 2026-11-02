import type { Position } from "cytoscape";
import type { NodeBounds, ConnectionPort } from "./graphConnectionGeometry";

export type Segment = { a: Position; b: Position };
export const CLEARANCE = 14;
export const LANE_GAP = 12;
const EPSILON = 0.01;

export function expandBox(box: NodeBounds, padding = CLEARANCE): NodeBounds {
  return { x1: box.x1 - padding, y1: box.y1 - padding, x2: box.x2 + padding, y2: box.y2 + padding };
}

export function portExit(port: ConnectionPort): Position {
  const distance = CLEARANCE + LANE_GAP;
  return { x: port.x + (port.side === "right" ? distance : port.side === "left" ? -distance : 0),
    y: port.y + (port.side === "bottom" ? distance : port.side === "top" ? -distance : 0) };
}

export function segments(points: Position[]): Segment[] {
  return points.slice(1).map((b, index) => ({ a: points[index], b }));
}

export function hitsBox(a: Position, b: Position, box: NodeBounds): boolean {
  if (Math.abs(a.y - b.y) < EPSILON) return a.y > box.y1 + EPSILON && a.y < box.y2 - EPSILON &&
    Math.max(a.x, b.x) > box.x1 + EPSILON && Math.min(a.x, b.x) < box.x2 - EPSILON;
  return a.x > box.x1 + EPSILON && a.x < box.x2 - EPSILON &&
    Math.max(a.y, b.y) > box.y1 + EPSILON && Math.min(a.y, b.y) < box.y2 - EPSILON;
}

export function linePenalty(a: Position, b: Position, occupied: Segment[], allowedContacts: Position[] = []): number {
  let penalty = 0;
  const horizontal = Math.abs(a.y - b.y) < EPSILON;
  for (const line of occupied) {
    const otherHorizontal = Math.abs(line.a.y - line.b.y) < EPSILON;
    if (horizontal === otherHorizontal) {
      if (Math.abs((horizontal ? a.y : a.x) - (horizontal ? line.a.y : line.a.x)) > EPSILON) continue;
      const axis = horizontal ? "x" : "y";
      const overlap = Math.min(Math.max(a[axis], b[axis]), Math.max(line.a[axis], line.b[axis])) -
        Math.max(Math.min(a[axis], b[axis]), Math.min(line.a[axis], line.b[axis]));
      if (overlap > EPSILON) penalty += 200 + overlap * 30;
      continue;
    }
    const h = horizontal ? { a, b } : line, v = horizontal ? line : { a, b };
    const x = v.a.x, y = h.a.y;
    if (x < Math.min(h.a.x, h.b.x) - EPSILON || x > Math.max(h.a.x, h.b.x) + EPSILON ||
        y < Math.min(v.a.y, v.b.y) - EPSILON || y > Math.max(v.a.y, v.b.y) + EPSILON) continue;
    const sharedEnd = [a, b].some(p => Math.hypot(p.x - x, p.y - y) < EPSILON) &&
      [line.a, line.b].some(p => Math.hypot(p.x - x, p.y - y) < EPSILON);
    const allowed = allowedContacts.some(point => Math.hypot(point.x - x, point.y - y) < EPSILON);
    if (!sharedEnd && !allowed) penalty += 10000;
  }
  return penalty;
}

export function simplifyRoute(points: Position[]): Position[] {
  const result: Position[] = [];
  for (const point of points) {
    if (result.length && Math.hypot(result.at(-1)!.x - point.x, result.at(-1)!.y - point.y) < EPSILON) continue;
    while (result.length >= 2) {
      const a = result.at(-2)!, b = result.at(-1)!;
      const cross = (b.x - a.x) * (point.y - b.y) - (b.y - a.y) * (point.x - b.x);
      const forward = (b.x - a.x) * (point.x - b.x) + (b.y - a.y) * (point.y - b.y);
      if (Math.abs(cross) > EPSILON || forward < 0) break;
      result.pop();
    }
    result.push(point);
  }
  return result;
}
