import type { Core, CollectionReturnValue, Position } from "cytoscape";
import type { KnowledgeNode } from "../domain/types";

// Existing labels render at ~19px (nodes) and ~14px (relationships) at this zoom.
export const READABLE_GRAPH_ZOOM = 1.5;
const MAX_FOCUS_ZOOM = 2;
const VIEW_PADDING = 64;

export function readableGraphViewport(cy: Core, elements: CollectionReturnValue) {
  if (!elements.length || cy.width() <= 0 || cy.height() <= 0) return null;
  const bounds = elements.boundingBox({ includeLabels: true, includeOverlays: false });
  const fitZoom = Math.min(
    Math.max(1, cy.width() - VIEW_PADDING * 2) / Math.max(1, bounds.w),
    Math.max(1, cy.height() - VIEW_PADDING * 2) / Math.max(1, bounds.h),
  );
  if (!Number.isFinite(fitZoom)) return null;
  const zoom = Math.max(cy.minZoom(), Math.min(cy.maxZoom(), MAX_FOCUS_ZOOM,
    Math.max(READABLE_GRAPH_ZOOM, fitZoom)));
  let center: Position = { x: (bounds.x1 + bounds.x2) / 2, y: (bounds.y1 + bounds.y2) / 2 };

  // Large graphs cannot fit at readable scale. Start at an actual main node,
  // rather than the potentially empty middle of their overall bounding box.
  if (zoom > fitZoom) {
    const roots = elements.nodes().roots();
    const anchors = roots.length ? roots : elements.nodes();
    let closestDistance = Infinity;
    let anchor = center;
    anchors.forEach((node) => {
      const position = node.position();
      const distance = (position.x - center.x) ** 2 + (position.y - center.y) ** 2;
      if (distance < closestDistance) { closestDistance = distance; anchor = position; }
    });
    center = anchor;
  }
  return { zoom, pan: { x: cy.width() / 2 - center.x * zoom, y: cy.height() / 2 - center.y * zoom } };
}

export function focusGraph(
  cy: Core,
  graphId: string | null | undefined,
  nodeById: Map<string, KnowledgeNode>,
  duration = 420,
): void {
  if (!graphId) {
    if (!cy.elements().length) return;
    cy.stop(true, false);
    if (duration > 0) cy.animate({ fit: { eles: cy.elements(), padding: 40 }, duration, queue: false });
    else { cy.fit(cy.elements(), 40); cy.center(cy.elements()); cy.style().update(); cy.forceRender(); }
    return;
  }
  const nodes = cy.nodes().filter((node) => nodeById.get(node.id())?.provenance.some(
    (source) => source.graphId === graphId,
  ) ?? false);
  if (!nodes.length) return;
  const edges = nodes.connectedEdges().filter((edge) => nodes.contains(edge.source()) && nodes.contains(edge.target()));
  const viewport = readableGraphViewport(cy, nodes.union(edges));
  if (!viewport) return;
  // Cancel queued moves so rapid selection always finishes at the latest graph.
  cy.stop(true, false);
  if (duration > 0) cy.animate({ ...viewport, duration, queue: false });
  else { cy.viewport(viewport); cy.style().update(); cy.forceRender(); }
}
