import type { Core, Position } from "cytoscape";

export type PortSide = "top" | "right" | "bottom" | "left";
export type NodeBounds = { x1: number; y1: number; x2: number; y2: number };
export type ConnectionPort = Position & { side: PortSide };

export function connectionPorts(box: NodeBounds): ConnectionPort[] {
  const x = (box.x1 + box.x2) / 2, y = (box.y1 + box.y2) / 2;
  return [
    { side: "top", x, y: box.y1 - 8 },
    { side: "right", x: box.x2 + 8, y },
    { side: "bottom", x, y: box.y2 + 8 },
    { side: "left", x: box.x1 - 8, y },
  ];
}

export function connectionPath(start: ConnectionPort, end: Position): string {
  const offset = Math.max(40, Math.hypot(end.x - start.x, end.y - start.y) / 3);
  const dx = start.side === "left" ? -offset : start.side === "right" ? offset : 0;
  const dy = start.side === "top" ? -offset : start.side === "bottom" ? offset : 0;
  return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y + dy}, ${end.x - dx} ${end.y - dy}, ${end.x} ${end.y}`;
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
    if (point.x < box.x1 - 6 || point.x > box.x2 + 6 || point.y < box.y1 - 6 || point.y > box.y2 + 6) return;
    const next = Math.hypot(point.x - (box.x1 + box.x2) / 2, point.y - (box.y1 + box.y2) / 2);
    if (next < distance) { closest = node.id(); distance = next; }
  });
  return closest;
}
