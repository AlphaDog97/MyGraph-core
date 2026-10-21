import type { Core, Position } from "cytoscape";
import type { ConnectionSide } from "../domain/types";

export type PortSide = ConnectionSide;
export type NodeBounds = { x1: number; y1: number; x2: number; y2: number };
export type ConnectionPort = Position & { side: PortSide };

export function connectionPorts(box: NodeBounds): ConnectionPort[] {
  const x = (box.x1 + box.x2) / 2, y = (box.y1 + box.y2) / 2;
  return [
    { side: "top", x, y: box.y1 },
    { side: "right", x: box.x2, y },
    { side: "bottom", x, y: box.y2 },
    { side: "left", x: box.x1, y },
  ];
}

export function connectionPath(start: ConnectionPort, end: Position): string {
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

export function nearestPort(box: NodeBounds, point: Position): ConnectionPort {
  return connectionPorts(box).reduce((best, port) =>
    Math.hypot(point.x - port.x, point.y - port.y) < Math.hypot(point.x - best.x, point.y - best.y) ? port : best);
}

export function portEndpoint(side?: PortSide | null): string {
  return side ? { top: "0% -50%", right: "50% 0%", bottom: "0% 50%", left: "-50% 0%" }[side] : "outside-to-node";
}

export function renderedPoint(cy: Core, clientX: number, clientY: number): Position {
  const container = cy.container()!;
  const rect = container.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * container.clientWidth / (rect.width || 1),
    y: (clientY - rect.top) * container.clientHeight / (rect.height || 1),
  };
}

export function nodeAtPoint(cy: Core, point: Position): string | undefined {
  let closest: string | undefined, distance = Infinity;
  cy.nodes().forEach((node) => {
    const box = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
    if (point.x < box.x1 - 16 || point.x > box.x2 + 16 || point.y < box.y1 - 16 || point.y > box.y2 + 16) return;
    const next = Math.hypot(point.x - (box.x1 + box.x2) / 2, point.y - (box.y1 + box.y2) / 2);
    if (next < distance) { closest = node.id(); distance = next; }
  });
  return closest;
}
