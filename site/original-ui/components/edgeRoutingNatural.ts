import type { Position } from "cytoscape";
import { connectionPorts, nearestPort, type ConnectionPort, type NodeBounds, type PortSide } from "./graphConnectionGeometry";
import { routeConnection } from "./edgeRouting";
import { curveCollisions, sampleCurve, smoothRoute } from "./edgeRoutingCurves";
import { segments, type Segment } from "./edgeRoutingGeometry";

const center = (box: NodeBounds): Position => ({ x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2 });
const distance = (a: Position, b: Position) => Math.hypot(a.x - b.x, a.y - b.y);
const LINE_GAP = 24;
const LANE_STEP = 48;

function endpoint(box: NodeBounds, toward: Position, side?: PortSide | null): ConnectionPort {
  if (side) return connectionPorts(box).find(port => port.side === side)!;
  const origin = center(box), dx = toward.x - origin.x, dy = toward.y - origin.y;
  const scale = Math.min((box.x2 - box.x1) / 2 / (Math.abs(dx) || 0.001),
    (box.y2 - box.y1) / 2 / (Math.abs(dy) || 0.001));
  return { ...nearestPort(box, toward), x: origin.x + dx * scale, y: origin.y + dy * scale };
}

function outward(port: ConnectionPort, amount: number): Position {
  return { x: port.x + (port.side === "left" ? -amount : port.side === "right" ? amount : 0),
    y: port.y + (port.side === "top" ? -amount : port.side === "bottom" ? amount : 0) };
}

function crossing(a: Segment, b: Segment): boolean {
  const cross = (u: Position, v: Position, w: Position) => (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
  return cross(a.a, a.b, b.a) * cross(a.a, a.b, b.b) < -0.01 &&
    cross(b.a, b.b, a.a) * cross(b.a, b.b, a.b) < -0.01;
}

function pointDistance(point: Position, line: Segment): number {
  const dx = line.b.x - line.a.x, dy = line.b.y - line.a.y;
  const t = Math.max(0, Math.min(1, ((point.x - line.a.x) * dx + (point.y - line.a.y) * dy) / (dx * dx + dy * dy || 1)));
  return distance(point, { x: line.a.x + t * dx, y: line.a.y + t * dy });
}

export function endpointValue(port: Position, box: NodeBounds): string {
  const origin = center(box);
  return `${(port.x - origin.x) / (box.x2 - box.x1) * 100}% ${(port.y - origin.y) / (box.y2 - box.y1) * 100}%`;
}

/** Short, shallow curves first. Crossings have a bounded cost, never a graph-wide detour. */
export function naturalConnection(sourceBox: NodeBounds, targetBox: NodeBounds,
  sourceSide: PortSide | null, targetSide: PortSide | null, boxes: NodeBounds[], occupied: Segment[]) {
  const a = center(sourceBox), b = center(targetBox), length = distance(a, b) || 1;
  const normal = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
  const candidates = [0, 1, -1, 2, -2, 3, -3, 4, -4].map(lane => lane * LANE_STEP)
    .filter(offset => Math.abs(offset) <= Math.max(LANE_STEP, length * 0.55));
  const build = (offset: number) => {
    const middle = { x: (a.x + b.x) / 2 + normal.x * offset, y: (a.y + b.y) / 2 + normal.y * offset };
    const source = endpoint(sourceBox, middle, sourceSide), target = endpoint(targetBox, middle, targetSide);
    let controls = [middle];
    if (sourceSide || targetSide) {
      const handle = Math.min(64, length * 0.22);
      const first = sourceSide ? outward(source, handle) : { x: source.x + (middle.x - source.x) * 0.45, y: source.y + (middle.y - source.y) * 0.45 };
      const last = targetSide ? outward(target, handle) : { x: target.x + (middle.x - target.x) * 0.45, y: target.y + (middle.y - target.y) * 0.45 };
      controls = [first, middle, last];
    }
    return { source, target, controls, points: sampleCurve(source, target, controls) };
  };
  const score = (route: ReturnType<typeof build>) => {
    const lines = segments(route.points), collisions = curveCollisions(route.points, boxes);
    const crossings = lines.reduce((sum, line) => sum + occupied.filter(other => crossing(line, other)).length, 0);
    // Shared ports converge near nodes; keep the central span and its labels separated.
    const trim = Math.ceil(route.points.length / 3);
    const overlap = route.points.slice(trim, -trim)
      .filter(point => occupied.some(line => pointDistance(point, line) < LINE_GAP)).length;
    return collisions * 100000 + lines.reduce((sum, line) => sum + distance(line.a, line.b), 0) + crossings * 100 + overlap * 12;
  };
  let best = build(0), bestScore = score(best);
  for (const offset of candidates.slice(1)) {
    const route = build(offset), next = score(route);
    if (next < bestScore) { best = route; bestScore = next; }
  }
  if (curveCollisions(best.points, boxes)) {
    // Only node bodies justify a longer route; existing lines never force large loops.
    const source = endpoint(sourceBox, b, sourceSide ?? nearestPort(sourceBox, b).side);
    const target = endpoint(targetBox, a, targetSide ?? nearestPort(targetBox, a).side);
    const skeleton = routeConnection(source, target, boxes);
    const controls = smoothRoute(skeleton, boxes);
    const fallback = { source, target, controls, points: sampleCurve(source, target, controls) };
    if (score(fallback) < bestScore) best = fallback;
  }
  return best;
}
