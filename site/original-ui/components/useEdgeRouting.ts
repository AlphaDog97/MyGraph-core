import { useEffect, type MutableRefObject } from "react";
import type { Core } from "cytoscape";
import { routeGraphEdges } from "./graphCanvasRouting";

export function useEdgeRouting(cyRef: MutableRefObject<Core | null>, canvasVersion: number) {
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => routeGraphEdges(cy), 80);
    };
    cy.on("position data", "node", schedule);
    cy.on("dragfree layoutstop", schedule);
    schedule();
    return () => {
      clearTimeout(timer);
      cy.off("position data", "node", schedule);
      cy.off("dragfree layoutstop", schedule);
    };
  }, [canvasVersion, cyRef]);
}
