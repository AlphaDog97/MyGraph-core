import { useEffect, useRef, useCallback } from "react";
import cytoscape, { Core } from "cytoscape";
import { KnowledgeNode, KnowledgeGraph, TagColorAssignment } from "../domain/types";
import { toCytoscapeElements } from "../data/loader";

interface Props {
  graph: KnowledgeGraph;
  tagColors: TagColorAssignment;
  searchQuery: string;
  cyRef: React.MutableRefObject<Core | null>;
  onNodeSelect: (node: KnowledgeNode | null) => void;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildStyles(noMotion: boolean): any[] {
  return [
    {
      selector: "node",
      style: {
        shape: "roundrectangle",
        label: "data(label)",
        "background-color": "#ffffff",
        "border-width": 3,
        "border-color": "data(borderColor)",
        "text-valign": "center",
        "text-halign": "center",
        "font-family": "Inter, system-ui, sans-serif",
        "font-size": "13px",
        "font-weight": 500,
        color: "#2d3748",
        "text-outline-color": "#ffffff",
        "text-outline-width": 2,
        width: "label",
        height: 36,
        padding: 14,
        "text-wrap": "none",
        "overlay-padding": 4,
        "transition-property": "border-color, opacity, background-color",
        "transition-duration": noMotion ? 0 : 250,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: "edge",
      style: {
        width: 1.5,
        "line-color": "data(edgeColor)",
        "target-arrow-color": "data(edgeColor)",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        label: "data(label)",
        "font-family": "Inter, system-ui, sans-serif",
        "font-size": "10px",
        color: "data(edgeColor)",
        "text-rotation": "autorotate",
        "text-outline-color": "#f7f8fa",
        "text-outline-width": 2,
        "transition-property": "opacity, line-color",
        "transition-duration": noMotion ? 0 : 250,
      } as unknown as cytoscape.Css.Edge,
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
      style: { "border-width": 5, "font-weight": 600 },
    },
    {
      selector: "node.selected-node",
      style: { "border-width": 4, "background-color": "#f7fafc", "font-weight": 600 },
    },
  ];
}


function buildLayout(
  noMotion: boolean,
  nodeCount: number
): cytoscape.LayoutOptions {
  const denseGraph = nodeCount >= 16;

  return {
    name: "cose",
    fit: true,
    padding: 48,
    animate: !noMotion,
    animationDuration: 600,
    randomize: false,
    avoidOverlap: true,
    nodeOverlap: 12,
    nodeRepulsion: denseGraph ? 6500 : 9000,
    idealEdgeLength: denseGraph ? 120 : 180,
    edgeElasticity: 100,
    nestingFactor: 0.7,
    gravity: denseGraph ? 1.4 : 1.2,
    numIter: 1200,
    initialTemp: 200,
    coolingFactor: 0.96,
    minTemp: 1,
  } as cytoscape.LayoutOptions;
}

export default function GraphCanvas({
  graph,
  tagColors,
  searchQuery,
  cyRef,
  onNodeSelect,
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
      style: buildStyles(noMotion),
      layout: buildLayout(noMotion, graph.nodes.length),
      minZoom: 0.05,
      maxZoom: 4,
    });

    cy.one("layoutstop", () => {
      cy.fit(cy.elements(), 40);
    });

    cy.on("tap", "node", (evt) => {
      const nodeId = evt.target.id();
      const kn = graph.nodes.find((n) => n.id === nodeId);
      if (kn) {
        cy.nodes().removeClass("selected-node");
        evt.target.addClass("selected-node");
        onNodeSelect(kn);
      }
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        cy.nodes().removeClass("selected-node");
        onNodeSelect(null);
      }
    });

    cyRef.current = cy;
  }, [graph, tagColors, cyRef, onNodeSelect]);

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
