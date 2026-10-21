import type { Position } from "cytoscape";
import type { NodeBounds } from "./graphConnectionGeometry";

const midpoint = (a: Position, b: Position): Position => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Match Cytoscape's quadratic chains: adjacent controls join at their midpoint. */
export function sampleCurve(source: Position, target: Position, controls: Position[]): Position[] {
  const result = [source];
  let start = source;
  controls.forEach((control, index) => {
    const end = index + 1 < controls.length ? midpoint(control, controls[index + 1]) : target;
    for (let step = 1; step <= 20; step++) {
      const t = step / 20, u = 1 - t;
      result.push({ x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
        y: u * u * start.y + 2 * u * t * control.y + t * t * end.y });
    }
    start = end;
  });
  return result;
}

function crossesBody(a: Position, b: Position, box: NodeBounds): boolean {
  let low = 0, high = 1;
  for (const axis of ["x", "y"] as const) {
    const min = (axis === "x" ? box.x1 : box.y1) + 0.1;
    const max = (axis === "x" ? box.x2 : box.y2) - 0.1;
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 0.001) { if (a[axis] <= min || a[axis] >= max) return false; continue; }
    const t1 = (min - a[axis]) / delta, t2 = (max - a[axis]) / delta;
    low = Math.max(low, Math.min(t1, t2)); high = Math.min(high, Math.max(t1, t2));
    if (low >= high) return false;
  }
  return low < 1 && high > 0;
}

export function curveCollisions(points: Position[], boxes: NodeBounds[]): number {
  return points.slice(1).reduce((count, point, index) => count +
    boxes.filter(box => crossesBody(points[index], point, box)).length, 0);
}

function tightenedControls(points: Position[], radius: number): Position[] {
  const controls: Position[] = [];
  for (let index = 1; index + 1 < points.length; index++) {
    const previous = points[index - 1], corner = points[index], next = points[index + 1];
    const before = Math.hypot(previous.x - corner.x, previous.y - corner.y);
    const after = Math.hypot(next.x - corner.x, next.y - corner.y);
    const distance = Math.min(radius, before / 3, after / 3);
    if (before < 0.001 || after < 0.001) continue;
    controls.push({ x: corner.x + (previous.x - corner.x) * distance / before,
      y: corner.y + (previous.y - corner.y) * distance / before }, corner,
    { x: corner.x + (next.x - corner.x) * distance / after,
      y: corner.y + (next.y - corner.y) * distance / after });
  }
  return controls;
}

/** Prefer broad, natural curves; tighten only where smoothing would cut through a node. */
export function smoothRoute(points: Position[], boxes: NodeBounds[]): Position[] {
  const source = points[0], target = points.at(-1)!;
  let best = points.slice(1, -1);
  if (!best.length) return [midpoint(source, target)];
  let collisions = curveCollisions(sampleCurve(source, target, best), boxes);
  if (!collisions) return best;
  for (const radius of [96, 48, 24, 12, 6]) {
    const controls = tightenedControls(points, radius);
    const next = curveCollisions(sampleCurve(source, target, controls), boxes);
    if (next < collisions) { best = controls; collisions = next; }
    if (!collisions) break;
  }
  return best;
}
