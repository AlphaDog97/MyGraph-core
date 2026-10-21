import type { Core } from "cytoscape";
import type { KnowledgeGraph, TagColorAssignment } from "../domain/types";
import { toCytoscapeElements } from "../data/loader";
import { routeGraphEdges } from "./graphCanvasRouting";

/** Patch live elements without touching layout, node positions, classes or viewport. */
export function syncGraphElements(cy: Core, graph: KnowledgeGraph, colors: TagColorAssignment) {
  const definitions = toCytoscapeElements(graph, colors);
  const ids = new Set(definitions.map((definition) => definition.data.id));
  cy.batch(() => {
    cy.elements().filter((element) => !ids.has(element.id())).remove();
    for (const definition of definitions) {
      const data = definition.data;
      const existing = cy.getElementById(data.id!);
      if (!existing.length) { cy.add(definition); continue; }
      if (existing.isEdge() && (existing.data("source") !== data.source || existing.data("target") !== data.target)) {
        existing.move({ source: data.source, target: data.target });
      }
      existing.data(data);
    }
    routeGraphEdges(cy);
  });
}
