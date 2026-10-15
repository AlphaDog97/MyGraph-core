import {
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
  runLayoutWithAdaptiveFit,
} from "./graphCanvasLayout";
import { buildGraphCanvasStyles, type GraphTheme } from "./graphCanvasStyles";
import { focusGraph } from "./graphCanvasViewport";
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
const TOOLTIP_MAX_WIDTH = 360;
const TOOLTIP_EDGE_GAP = 16;
const TOOLTIP_TOP_THRESHOLD = 120;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  const tagColorsRef = useRef(tagColors);
  const themeRef = useRef(theme);
  const focusedGraphIdRef = useRef(focusedGraphId);
  const onNodeSelectRef = useRef(onNodeSelect);
  const previousFocusCyRef = useRef<Core | null>(null);
  const previousFocusedGraphIdRef = useRef<string | null | undefined>(undefined);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const [nodeTooltip, setNodeTooltip] = useState<NodeTooltipState | null>(null);
  tagColorsRef.current = tagColors;
  themeRef.current = theme;
  focusedGraphIdRef.current = focusedGraphId;
  onNodeSelectRef.current = onNodeSelect;

  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setNodeTooltip(null);
    let cy: Core | null = null;
    let disposed = false;
    let frame = 0;

    const initialize = () => {
      if (disposed || cy || container.clientWidth <= 0 || container.clientHeight <= 0) return;
      const reduceMotion = prefersReducedMotion();
      const { positions } = createGraphLayoutPlan(graph);
      const instance = cytoscape({
        container,
        elements: toCytoscapeElements(graph, tagColorsRef.current),
        style: buildGraphCanvasStyles(reduceMotion, themeRef.current),
        layout: initialGraphLayout(true, positions),
        minZoom: MIN_ZOOM,
        maxZoom: 4,
      });
      cy = instance;
      cyRef.current = instance;

      runLayoutWithAdaptiveFit(instance, true, positions, () => {
        if (!disposed) focusGraph(instance, focusedGraphIdRef.current, nodeById, 0);
      });

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

      instance.on("mouseover", "node", updateNodeTooltip);
      instance.on("mousemove", "node", updateNodeTooltip);
      instance.on("mouseout", "node", hideNodeTooltip);
      instance.on("grab pan zoom", hideNodeTooltip);

      instance.on("tap", "node", (event) => {
        const selected = nodeById.get(event.target.id());
        if (!selected) return;
        instance.nodes().removeClass("selected-node");
        event.target.addClass("selected-node");
        onNodeSelectRef.current(selected);
      });
      instance.on("tap", (event) => {
        if (event.target !== instance) return;
        instance.nodes().removeClass("selected-node");
        onNodeSelectRef.current(null);
      });

      // Preferences/search effects must also run when size readiness delayed creation.
      setCanvasVersion((version) => version + 1);
    };

    const syncCanvasSize = () => {
      if (disposed) return;
      initialize();
      if (!cy || cy.destroyed()) return;
      setNodeTooltip(null);
      cy.resize();
      cy.forceRender();
    };
    // The observer and renderer share one lifecycle; neither can outlive the other.
    const resizeObserver = new ResizeObserver(syncCanvasSize);
    resizeObserver.observe(container);
    syncCanvasSize();
    frame = window.requestAnimationFrame(syncCanvasSize);
    void document.fonts?.ready.then(() => {
      if (disposed) return;
      syncCanvasSize();
      cy?.style().update();
    });
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      cy?.destroy();
      if (cyRef.current === cy) cyRef.current = null;
    };
  }, [cyRef, graph, nodeById]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (previousFocusCyRef.current === cy && previousFocusedGraphIdRef.current === focusedGraphId) return;
    setNodeTooltip(null);
    focusGraph(cy, focusedGraphId, nodeById,
      previousFocusCyRef.current === cy && !prefersReducedMotion() ? 420 : 0);
    previousFocusCyRef.current = cy;
    previousFocusedGraphIdRef.current = focusedGraphId;
  }, [canvasVersion, cyRef, focusedGraphId, nodeById]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.style()
      .fromJson(buildGraphCanvasStyles(prefersReducedMotion(), theme))
      .update();
  }, [canvasVersion, cyRef, theme]);

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
  }, [canvasVersion, cyRef, nodeById, tagColors]);

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
  }, [canvasVersion, cyRef, nodeById, searchQuery]);

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
