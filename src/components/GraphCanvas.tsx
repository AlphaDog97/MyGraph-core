import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MutableRefObject } from "react";
import cytoscape, { type Core, type EventObject } from "cytoscape";
import type { KnowledgeNode, KnowledgeGraph, TagColorAssignment } from "../domain/types";
import { toCytoscapeElements } from "../data/loader";
import {
  createGraphLayoutPlan,
  initialGraphLayout,
  runDepthStaggerReveal,
  runLayoutWithAdaptiveFit,
} from "./graphCanvasLayout";
import { buildGraphCanvasStyles, type GraphTheme } from "./graphCanvasStyles";
import "./GraphCanvas.css";

interface Props {
  graph: KnowledgeGraph;
  focusedGraphId?: string | null;
  tagColors: TagColorAssignment;
  searchQuery: string;
  theme: GraphTheme;
  cyRef: MutableRefObject<Core | null>;
  onNodeSelect: (node: KnowledgeNode | null) => void;
}

type TooltipPlacement = "above" | "below";

interface NodeTooltipState {
  description: string;
  x: number;
  y: number;
  placement: TooltipPlacement;
}

const MIN_ZOOM = 0.1;
const VIEW_PADDING = 64;
const TOOLTIP_MAX_WIDTH = 360;
const TOOLTIP_EDGE_GAP = 16;
const TOOLTIP_TOP_THRESHOLD = 120;

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

function createTooltipState(
  container: HTMLDivElement,
  description: string,
  renderedPosition: cytoscape.Position
): NodeTooltipState | null {
  const text = description.trim();
  if (!text) return null;

  const availableWidth = Math.max(0, container.clientWidth - TOOLTIP_EDGE_GAP * 2);
  const tooltipWidth = Math.min(TOOLTIP_MAX_WIDTH, availableWidth);
  const horizontalInset = tooltipWidth / 2 + TOOLTIP_EDGE_GAP;
  const maxX = Math.max(horizontalInset, container.clientWidth - horizontalInset);
  const x = Math.min(Math.max(renderedPosition.x, horizontalInset), maxX);
  const y = Math.min(
    Math.max(renderedPosition.y, TOOLTIP_EDGE_GAP),
    Math.max(TOOLTIP_EDGE_GAP, container.clientHeight - TOOLTIP_EDGE_GAP)
  );

  return {
    description: text,
    x,
    y,
    placement: y < TOOLTIP_TOP_THRESHOLD ? "below" : "above",
  };
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
  const [nodeTooltip, setNodeTooltip] = useState<NodeTooltipState | null>(null);
  tagColorsRef.current = tagColors;
  themeRef.current = theme;
  focusedGraphIdRef.current = focusedGraphId;

  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes]
  );

  const initCy = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    revealTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    revealTimerRef.current = [];
    setNodeTooltip(null);
    cyRef.current?.destroy();

    const noMotion = prefersReducedMotion();
    const { depthById, positions } = createGraphLayoutPlan(graph);
    const cy = cytoscape({
      container,
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

    const updateNodeTooltip = (event: EventObject) => {
      const hoveredNode = nodeById.get(event.target.id());
      if (!hoveredNode) {
        setNodeTooltip(null);
        return;
      }
      setNodeTooltip(
        createTooltipState(container, hoveredNode.description, event.renderedPosition)
      );
    };
    const hideNodeTooltip = () => setNodeTooltip(null);

    cy.on("mouseover", "node", updateNodeTooltip);
    cy.on("mousemove", "node", updateNodeTooltip);
    cy.on("mouseout", "node", hideNodeTooltip);
    cy.on("grab pan zoom", hideNodeTooltip);

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
    setNodeTooltip(null);
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
      setNodeTooltip(null);
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
    const container = containerRef.current;
    if (!cy || !container) return;
    const resizeObserver = new ResizeObserver(() => {
      setNodeTooltip(null);
      cy.resize();
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [cyRef]);

  return (
    <div className="graph-canvas-root">
      <div ref={containerRef} className="graph-canvas-surface" />
      {nodeTooltip && (
        <div
          className={`graph-node-tooltip graph-node-tooltip--${nodeTooltip.placement}`}
          style={{ left: nodeTooltip.x, top: nodeTooltip.y }}
          role="tooltip"
        >
          {nodeTooltip.description}
        </div>
      )}
    </div>
  );
}
