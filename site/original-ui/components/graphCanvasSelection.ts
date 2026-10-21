import type { Core, Position } from "cytoscape";
import type { KnowledgeNode } from "../domain/types";

export function nodeGraphId(node: KnowledgeNode, focusedGraphId?: string | null): string | undefined {
  return node.provenance.find((source) => source.graphId === focusedGraphId)?.graphId
    ?? node.provenance[0]?.graphId;
}

/** Select a cluster's empty space only when its bounds identify one graph. */
export function graphAtPosition(cy: Core, nodes: Map<string, KnowledgeNode>, position?: Position): string | undefined {
  if (!position) return undefined;
  const graphNodes = new Map<string, string[]>();
  for (const node of nodes.values()) {
    for (const source of node.provenance) {
      const ids = graphNodes.get(source.graphId) ?? [];
      ids.push(node.id);
      graphNodes.set(source.graphId, ids);
    }
  }
  const matches: string[] = [];
  for (const [graphId, ids] of graphNodes) {
    const elements = ids.reduce((collection, id) => collection.union(cy.getElementById(id)), cy.collection());
    if (!elements.length) continue;
    const box = elements.boundingBox({ includeLabels: true, includeEdges: false, includeOverlays: false });
    if (position.x >= box.x1 - 20 && position.x <= box.x2 + 20
      && position.y >= box.y1 - 20 && position.y <= box.y2 + 20) matches.push(graphId);
  }
  return matches.length === 1 ? matches[0] : undefined;
}
