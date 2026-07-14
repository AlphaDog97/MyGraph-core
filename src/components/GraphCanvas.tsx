import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { MutableRefObject } from "react";
import cytoscape, { type Core } from "cytoscape";
import type { KnowledgeNode, KnowledgeGraph, TagColorAssignment } from "../domain/types";
import { toCytoscapeElements } from "../data/loader";
import {
  createGraphLayoutPlan,
  initialGraphLayout,
  runDepthStaggerReveal,
  runLayoutWithAdaptiveFit,
} from "./graphCanvasLayout";
import { buildGraphCanvasStyles, type GraphTheme } from "./graphCanvasStyles";

interface Props {
  graph: KnowledgeGraph;
  focusedGraphId?: string | null;
  tagColors: TagColorAssignment;
  searchQuery: string;
  theme: GraphTheme;
  cyRef: MutableRefObject<Core | null>;
  onNodeSelect: (node: KnowledgeNode | null) => void;
}

const MIN_ZOOM = 0.1;
const VIEW_PADDING = 64;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function focusGraph(
  cy: Core,
  graphId: string | null | undefined,
  nodeById: Map<string, KnowledgeNode>,
  animate = true
): void {
  const duration = animate && !prefersReducedMotion() ? 420 : 0;
  if (!graphId) {
    cy.animate({
      fit: { eles: cy.elements(), padding: 40 },
      duration,
    });
    return;
  }

  const matchedNodes = cy.nodes().filter((node) =>
    nodeById
      .get(node.id())
      ?.provenance.some((source) => source.graphId === graphId) ?? false
  );
  if (matchedNodes.length === 0) return;

  const internalEdges = matchedNodes.connectedEdges().filter((edge) =>
    matchedNodes.contains(edge.source()) && matchedNodes.contains(edge.target())
  );
  cy.animate({
    fit: { eles: matchedNodes.union(internalEdges), padding: VIEW_PADDING },
    duration,
  });
}

export default function GraphCanvas({
  graph,
  focusedGraphId,
  tagColors,
  searchQuery,
  theme,
  cyRef,
  onNodeSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const revealTimerRef = useRef<number[]>([]);
  const tagColorsRef = useRef(tagColors);
  const themeRef = useRef(theme);
  const focusedGraphIdRef = useRef(focusedGraphId);
  tagColorsRef.current = tagColors;
  themeRef.current = theme;
  focusedGraphIdRef.current = focusedGraphId;

  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes]
  );

  const initCy = useCallback(() => {
    if (!containerRef.current) return;
    revealTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    revealTimerRef.current = [];
    cyRef.current?.destroy();

    const noMotion = prefersReducedMotion();
    const { depthById, positions } = createGraphLayoutPlan(graph);
    const cy = cytoscape({
      container: containerRef.current,
      elements: toCytoscapeElements(graph, tagColorsRef.current),
      style: buildGraphCanvasStyles(noMotion, themeRef.current),
      layout: initialGraphLayout(noMotion, positions),
      minZoom: MIN_ZOOM,
      maxZoom: 4,
    });

    runLayoutWithAdaptiveFit(cy, noMotion, positions, () => {
      focusGraph(cy, focusedGraphIdRef.current, nodeById, false);
    });
    revealTimerRef.current = runDepthStaggerReveal(
      cy,
      graph,
      depthById,
      noMotion
    );

    cy.on("tap", "node", (event) => {
      const selected = nodeById.get(event.target.id());
      if (!selected) return;
      cy.nodes().removeClass("selected-node");
      event.target.addClass("selected-node");
      onNodeSelect(selected);
    });
    cy.on("tap", (event) => {
      if (event.target !== cy) return;
      cy.nodes().removeClass("selected-node");
      onNodeSelect(null);
    });

    cyRef.current = cy;
  }, [cyRef, graph, nodeById, onNodeSelect]);

  useEffect(() => {
    initCy();
    return () => {
      revealTimerRef.current.forEach((timer) => window.clearTimeout(timer));
      revealTimerRef.current = [];
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [initCy, cyRef]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    focusGraph(cy, focusedGraphId, nodeById);
  }, [cyRef, focusedGraphId, nodeById]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.style()
      .fromJson(buildGraphCanvasStyles(prefersReducedMotion(), theme))
      .update();
  }, [cyRef, theme]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.nodes().forEach((node) => {
        const knowledgeNode = nodeById.get(node.id());
        if (knowledgeNode) {
          node.data("borderColor", knowledgeNode.resolveBorderColor(tagColors));
        }
      });
    });
    cy.style().update();
  }, [cyRef, nodeById, tagColors]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const query = searchQuery.toLowerCase().trim();

    cy.batch(() => {
      if (!query) {
        cy.elements().removeClass("dimmed highlighted");
        return;
      }
      cy.elements().addClass("dimmed").removeClass("highlighted");
      const matched = cy.nodes().filter((node) =>
        nodeById.get(node.id())?.searchText().includes(query) ?? false
      );
      matched.removeClass("dimmed").addClass("highlighted");
      matched.connectedEdges().removeClass("dimmed");
      matched.connectedEdges().connectedNodes().removeClass("dimmed");
    });

    if (query) {
      const matched = cy.nodes(".highlighted");
      if (matched.length > 0) {
        cy.animate({
          center: { eles: matched },
          duration: prefersReducedMotion() ? 0 : 400,
        });
      }
    }
  }, [cyRef, nodeById, searchQuery]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !containerRef.current) return;
    const resizeObserver = new ResizeObserver(() => cy.resize());
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [cyRef]);

  return <div ref={containerRef} className="graph-canvas-root" />;
}
