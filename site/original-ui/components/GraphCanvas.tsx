import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MutableRefObject } from "react";
import cytoscape, { type Core, type EventObject } from "cytoscape";
import type { ConnectionAnchors, KnowledgeNode, KnowledgeGraph, TagColorAssignment } from "../domain/types";
import { toCytoscapeElements } from "../data/loader";
import {
  createGraphLayoutPlan,
  initialGraphLayout,
  runLayoutWithAdaptiveFit,
} from "./graphCanvasLayout";
import { buildGraphCanvasStyles, type GraphTheme } from "./graphCanvasStyles";
import { focusGraph } from "./graphCanvasViewport";
import { graphAtPosition, nodeGraphId } from "./graphCanvasSelection";
import { createTooltipState, type NodeTooltipState } from "./graphCanvasTooltip";
import GraphConnectionOverlay from "./GraphConnectionOverlay";
import type { GraphConnectionBridge } from "./useGraphConnections";
import { syncGraphElements } from "./graphCanvasData";
import { useEdgeRouting } from "./useEdgeRouting";
import "./GraphCanvas.css";

interface Props {
  graph: KnowledgeGraph;
  focusedGraphId?: string | null;
  tagColors: TagColorAssignment;
  searchQuery: string;
  theme: GraphTheme;
  cyRef: MutableRefObject<Core | null>;
  onNodeSelect: (node: KnowledgeNode | null) => void;
  onGraphFocus?: (graphId: string) => void;
  selectedNodeId?: string | null;
  onEdgeSelect?: (edgeId: string) => void;
  onCreateEdge?: (sourceId: string, targetId: string, anchors: ConnectionAnchors) => void;
  onInspectNode?: (nodeId: string) => void;
}

const MIN_ZOOM = 0.1;
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function GraphCanvas({
  graph,
  focusedGraphId,
  tagColors,
  searchQuery,
  theme,
  cyRef,
  onNodeSelect,
  onGraphFocus, selectedNodeId, onEdgeSelect, onCreateEdge, onInspectNode,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tagColorsRef = useRef(tagColors);
  const themeRef = useRef(theme);
  const focusedGraphIdRef = useRef(focusedGraphId);
  const onNodeSelectRef = useRef(onNodeSelect);
  const onGraphFocusRef = useRef(onGraphFocus);
  const onEdgeSelectRef = useRef(onEdgeSelect);
  const connectionRef = useRef<GraphConnectionBridge | null>(null);
  const previousFocusCyRef = useRef<Core | null>(null);
  const previousFocusedGraphIdRef = useRef<string | null | undefined>(undefined);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const [nodeTooltip, setNodeTooltip] = useState<NodeTooltipState | null>(null);
  tagColorsRef.current = tagColors;
  themeRef.current = theme;
  focusedGraphIdRef.current = focusedGraphId;
  onNodeSelectRef.current = onNodeSelect;
  onGraphFocusRef.current = onGraphFocus;
  onEdgeSelectRef.current = onEdgeSelect;

  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes]
  );

  // Only a different node set needs a fresh layout. Edge changes stay on this renderer.
  const nodeSetKey = JSON.stringify(graph.nodes.map((node) => node.id).sort());
  const graphRef = useRef(graph);
  const nodeByIdRef = useRef(nodeById);
  graphRef.current = graph;
  nodeByIdRef.current = nodeById;
  const previousSearchRef = useRef<{ cy: Core; query: string } | null>(null);
  useEdgeRouting(cyRef, canvasVersion);

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
      const { positions } = createGraphLayoutPlan(graphRef.current);
      const instance = cytoscape({
        container,
        elements: toCytoscapeElements(graphRef.current, tagColorsRef.current),
        style: buildGraphCanvasStyles(reduceMotion, themeRef.current),
        layout: initialGraphLayout(true, positions),
        minZoom: MIN_ZOOM,
        maxZoom: 4,
      });
      cy = instance;
      cyRef.current = instance;

      runLayoutWithAdaptiveFit(instance, true, positions, () => {
        if (!disposed) focusGraph(instance, focusedGraphIdRef.current, nodeByIdRef.current, 0);
      });

      const updateNodeTooltip = (event: EventObject) => {
        const hoveredNode = nodeByIdRef.current.get(event.target.id());
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

      const focusOwningGraph = (node: KnowledgeNode): boolean => {
        const graphId = nodeGraphId(node, focusedGraphIdRef.current);
        if (!onGraphFocusRef.current || !graphId || graphId === focusedGraphIdRef.current) return false;
        instance.nodes().removeClass("selected-node");
        onNodeSelectRef.current(null);
        onGraphFocusRef.current(graphId);
        return true;
      };
      instance.on("tap", "node", (event) => {
        const selected = nodeByIdRef.current.get(event.target.id());
        if (!selected) return;
        if (connectionRef.current?.tryComplete(selected.id, event.renderedPosition)) return;
        if (focusOwningGraph(selected)) return;
        instance.nodes().removeClass("selected-node");
        event.target.addClass("selected-node");
        onNodeSelectRef.current(selected);
      });
      instance.on("tap", "edge", (event) => {
        if (connectionRef.current?.cancel()) return;
        const source = nodeByIdRef.current.get(event.target.source().id());
        if (source && focusOwningGraph(source)) return;
        onEdgeSelectRef.current?.(event.target.id());
      });
      instance.on("tap", (event) => {
        if (event.target !== instance) return;
        if (connectionRef.current?.cancel()) return;
        instance.nodes().removeClass("selected-node");
        onNodeSelectRef.current(null);
        if (!focusedGraphIdRef.current && onGraphFocusRef.current) {
          const graphId = graphAtPosition(instance, nodeByIdRef.current, event.position);
          if (graphId) onGraphFocusRef.current(graphId);
        }
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
  }, [cyRef, nodeSetKey]);

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
    if (cy) syncGraphElements(cy, graph, tagColors);
  }, [canvasVersion, cyRef, graph, tagColors]);

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

    const previous = previousSearchRef.current;
    previousSearchRef.current = { cy, query };
    if (query && (previous?.cy !== cy || previous.query !== query)) {
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

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !onCreateEdge) return;
    cy.nodes().removeClass("selected-node");
    if (selectedNodeId) cy.getElementById(selectedNodeId).addClass("selected-node");
  }, [canvasVersion, cyRef, selectedNodeId, onCreateEdge]);

  return (
    <div className="graph-canvas-root">
      <div ref={containerRef} className="graph-canvas-surface" />
      {onCreateEdge && <GraphConnectionOverlay cy={cyRef.current} selectedNodeId={selectedNodeId}
        focusedGraphId={focusedGraphId} nodeById={nodeById} onCreateEdge={onCreateEdge}
        onInspectNode={onInspectNode} bridgeRef={connectionRef} />}
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
