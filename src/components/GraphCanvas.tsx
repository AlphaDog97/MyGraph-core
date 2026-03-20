import { useEffect, useRef, useCallback } from "react";
import cytoscape, { Core } from "cytoscape";
import { KnowledgeGraph, TagColorAssignment } from "../domain/types";
import { toCytoscapeElements } from "../data/loader";

interface Props {
  graph: KnowledgeGraph;
  tagColors: TagColorAssignment;
  searchQuery: string;
  cyRef: React.MutableRefObject<Core | null>;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function GraphCanvas({
  graph,
  tagColors,
  searchQuery,
  cyRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const initCy = useCallback(() => {
    if (!containerRef.current) return;
    if (cyRef.current) cyRef.current.destroy();

    const elements = toCytoscapeElements(graph, tagColors);
    const noMotion = prefersReducedMotion();

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": "#ffffff",
            "border-width": 3,
            "border-color": "data(borderColor)" as string,
            "text-valign": "center",
            "text-halign": "center",
            "font-family": "Inter, system-ui, sans-serif",
            "font-size": "13px",
            "font-weight": 500,
            color: "#2d3748",
            "text-outline-color": "#ffffff",
            "text-outline-width": 2,
            width: 60,
            height: 60,
            "overlay-padding": "4px" as unknown as number,
            "transition-property":
              "border-color, opacity, background-color" as unknown as string,
            "transition-duration": noMotion ? 0 : 250,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#cbd5e0",
            "target-arrow-color": "#cbd5e0",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)" as string,
            "font-family": "Inter, system-ui, sans-serif",
            "font-size": "10px",
            color: "#a0aec0",
            "text-rotation": "autorotate",
            "text-outline-color": "#f7f8fa",
            "text-outline-width": 2,
            "transition-property": "opacity, line-color" as unknown as string,
            "transition-duration": noMotion ? 0 : 250,
          },
        },
        {
          selector: "node.dimmed",
          style: { opacity: 0.15 },
        },
        {
          selector: "edge.dimmed",
          style: { opacity: 0.08 },
        },
        {
          selector: "node.highlighted",
          style: {
            "border-width": 5,
            "font-weight": 600,
          },
        },
      ],
      layout: {
        name: "cose",
        animate: !noMotion,
        animationDuration: 600,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 120,
        padding: 40,
      } as cytoscape.LayoutOptions,
      minZoom: 0.2,
      maxZoom: 4,
    });

    cyRef.current = cy;
  }, [graph, tagColors, cyRef]);

  useEffect(() => {
    initCy();
    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initCy]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.nodes().forEach((node) => {
        const kn = graph.nodes.find((n) => n.id === node.id());
        if (kn) {
          node.data("borderColor", kn.resolveBorderColor(tagColors));
        }
      });
    });
  }, [tagColors, graph, cyRef]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const q = searchQuery.toLowerCase().trim();
    cy.batch(() => {
      if (!q) {
        cy.elements().removeClass("dimmed highlighted");
        return;
      }

      cy.elements().addClass("dimmed").removeClass("highlighted");

      const matched = cy.nodes().filter((node) => {
        const kn = graph.nodes.find((n) => n.id === node.id());
        return kn ? kn.searchText().includes(q) : false;
      });

      matched.removeClass("dimmed").addClass("highlighted");
      matched.connectedEdges().removeClass("dimmed");
      matched.connectedEdges().connectedNodes().removeClass("dimmed");
    });

    if (q) {
      const matched = cy.nodes(".highlighted");
      if (matched.length > 0) {
        cy.animate({
          fit: { eles: matched, padding: 60 },
          duration: prefersReducedMotion() ? 0 : 400,
        });
      }
    }
  }, [searchQuery, graph, cyRef]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        inset: 0,
      }}
    />
  );
}
