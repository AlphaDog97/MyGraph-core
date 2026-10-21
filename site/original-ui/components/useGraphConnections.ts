import { useEffect, useRef, useState } from "react";
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";
import type { Core, Position } from "cytoscape";
import type { ConnectionAnchors, KnowledgeNode } from "../domain/types";
import { connectionPorts, nearestPort, nodeAtPoint, renderedPoint, type ConnectionPort, type NodeBounds, type PortSide } from "./graphConnectionGeometry";

export interface GraphConnectionBridge {
  tryComplete: (targetId: string, point?: Position, side?: PortSide) => boolean;
  cancel: () => boolean;
}
export interface ConnectionProps {
  cy: Core | null;
  selectedNodeId?: string | null;
  focusedGraphId?: string | null;
  nodeById: Map<string, KnowledgeNode>;
  onCreateEdge: (sourceId: string, targetId: string, anchors: ConnectionAnchors) => void;
  bridgeRef: MutableRefObject<GraphConnectionBridge | null>;
}
type Draft = { sourceId: string; start: ConnectionPort; end: Position; targetId?: string; targetPort?: ConnectionPort; error?: string };

export function useGraphConnections(props: ConnectionProps) {
  const { cy, selectedNodeId, focusedGraphId, bridgeRef } = props;
  const latest = useRef(props);
  latest.current = props;
  const [bounds, setBounds] = useState<NodeBounds | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const gesture = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const update = (next: Draft | null) => { draftRef.current = next; setDraft(next); };
  const cancel = () => {
    const active = Boolean(draftRef.current);
    update(null); gesture.current = null;
    return active;
  };
  const complete = (targetId: string, point?: Position, side?: PortSide): boolean => {
    const current = draftRef.current;
    if (!current) return false;
    const { nodeById, onCreateEdge } = latest.current;
    const source = nodeById.get(current.sourceId), target = nodeById.get(targetId);
    const sharedGraph = source?.provenance.some((origin) =>
      target?.provenance.some((other) => other.graphId === origin.graphId));
    if (!target || current.sourceId === targetId || !sharedGraph) {
      update({ ...current, error: current.sourceId === targetId ? "请选择另一个节点" : "请选择同一图谱中的节点" });
      return true;
    }
    if (!cy || cy.destroyed()) { cancel(); return true; }
    const box = cy.getElementById(targetId).renderedBoundingBox({ includeLabels: false, includeOverlays: false });
    const targetPort = side ? connectionPorts(box).find((port) => port.side === side)!
      : nearestPort(box, point ?? current.end);
    cancel();
    onCreateEdge(current.sourceId, targetId, { sourcePort: current.start.side, targetPort: targetPort.side });
    return true;
  };
  bridgeRef.current = { tryComplete: complete, cancel };
  const handlers = useRef({ complete, cancel, update });
  handlers.current = { complete, cancel, update };

  useEffect(() => {
    handlers.current.cancel();
    setBounds(null);
    if (!cy || cy.destroyed() || !selectedNodeId) return;
    let frame = 0;
    const sync = () => {
      frame = 0;
      if (cy.destroyed()) return;
      const node = cy.getElementById(selectedNodeId);
      if (!node.length) { setBounds(null); return; }
      const box = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
      setBounds((previous) => previous && previous.x1 === box.x1 && previous.y1 === box.y1 &&
        previous.x2 === box.x2 && previous.y2 === box.y2 ? previous : box);
      const current = draftRef.current;
      if (current) {
        const start = connectionPorts(box).find((port) => port.side === current.start.side)!;
        const target = current.targetId ? cy.getElementById(current.targetId) : null;
        const end = target?.length && current.targetPort
          ? connectionPorts(target.renderedBoundingBox({ includeLabels: false, includeOverlays: false }))
            .find((port) => port.side === current.targetPort!.side)! : current.end;
        handlers.current.update({ ...current, start, end });
      }
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(sync); };
    sync();
    cy.on("pan zoom resize position data style", schedule);
    return () => { window.cancelAnimationFrame(frame); cy.off("pan zoom resize position data style", schedule); };
  }, [cy, selectedNodeId, focusedGraphId]);

  useEffect(() => {
    if (!cy || cy.destroyed() || !draft?.targetId || draft.targetId === draft.sourceId) return;
    const target = cy.getElementById(draft.targetId);
    target.addClass("connection-target");
    return () => { if (!cy.destroyed()) target.removeClass("connection-target"); };
  }, [cy, draft?.sourceId, draft?.targetId]);

  useEffect(() => {
    if (!cy) return;
    const move = (event: PointerEvent) => {
      const current = draftRef.current;
      if (!current || cy.destroyed()) return;
      const drag = gesture.current;
      if (drag && event.pointerId !== drag.pointerId) return;
      if (drag && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) drag.moved = true;
      const point = renderedPoint(cy, event.clientX, event.clientY);
      const targetId = nodeAtPoint(cy, point);
      const target = targetId && targetId !== current.sourceId ? cy.getElementById(targetId) : null;
      const targetPort = target?.length ? nearestPort(target.renderedBoundingBox({ includeLabels: false, includeOverlays: false }), point) : undefined;
      handlers.current.update({ ...current, end: targetPort ?? point, targetId, targetPort, error: undefined });
    };
    const up = (event: PointerEvent) => {
      const drag = gesture.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      gesture.current = null;
      if (!drag.moved) return;
      const point = renderedPoint(cy, event.clientX, event.clientY);
      const target = nodeAtPoint(cy, point);
      if (target) handlers.current.complete(target, point);
      else handlers.current.cancel();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && handlers.current.cancel()) event.preventDefault();
    };
    const pointerCancel = () => handlers.current.cancel();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", pointerCancel);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", pointerCancel);
      window.removeEventListener("keydown", escape);
      bridgeRef.current = null;
      draftRef.current = null;
      gesture.current = null;
    };
  }, [cy, bridgeRef]);

  const start = (port: ConnectionPort) => {
    if (selectedNodeId) update({ sourceId: selectedNodeId, start: port, end: port });
  };
  const pointerDown = (event: ReactPointerEvent<HTMLButtonElement>, port: ConnectionPort) => {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    start(port);
  };
  const targetBounds = cy && !cy.destroyed() && draft?.targetId && draft.targetId !== selectedNodeId
    ? cy.getElementById(draft.targetId).renderedBoundingBox({ includeLabels: false, includeOverlays: false }) : null;
  return { bounds, targetBounds, draft, start, pointerDown, complete, cancel };
}
