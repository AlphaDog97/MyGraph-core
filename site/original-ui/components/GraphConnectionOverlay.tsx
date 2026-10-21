import { useId } from "react";
import { connectionPath, connectionPorts } from "./graphConnectionGeometry";
import { useGraphConnections, type ConnectionProps } from "./useGraphConnections";
import "./GraphConnectionOverlay.css";

export default function GraphConnectionOverlay(props: ConnectionProps & { onInspectNode?: (id: string) => void }) {
  const { bounds, draft, start, pointerDown, cancel } = useGraphConnections(props);
  const markerId = `connection-arrow-${useId().replace(/:/g, "")}`;
  if (!bounds || !props.selectedNodeId) return null;
  const labels = { top: "上", right: "右", bottom: "下", left: "左" };
  return <div className="graph-connections">
    <svg className="graph-connection-preview" aria-hidden="true">
      <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
      </marker></defs>
      <rect x={bounds.x1 - 3} y={bounds.y1 - 3} width={bounds.x2 - bounds.x1 + 6}
        height={bounds.y2 - bounds.y1 + 6} rx="8" className="graph-connection-selection" />
      {draft && <path d={connectionPath(draft.start, draft.end)} markerEnd={`url(#${markerId})`}
        className="graph-connection-line" />}
    </svg>
    {connectionPorts(bounds).map((port) => <button key={port.side} type="button"
      className="graph-connection-port" style={{ left: port.x, top: port.y }}
      aria-label={`从${labels[port.side]}侧添加连线`} title="拖到目标节点，或点击后选择目标节点"
      onPointerDown={(event) => pointerDown(event, port)}
      onClick={(event) => { event.stopPropagation(); if (event.detail === 0) start(port); }}
    ><span /></button>)}
    {!draft && props.onInspectNode && <button type="button" className="graph-node-inspect"
      style={{ left: (bounds.x1 + bounds.x2) / 2, top: bounds.y1 - 46 }}
      onClick={() => props.onInspectNode?.(props.selectedNodeId!)}>详情</button>}
    {draft && <div className="graph-connection-hint" role="status">
      <span>{draft.error ?? "点击目标节点，或拖动连接点到目标"}</span>
      <button type="button" onClick={cancel}>取消 <kbd>Esc</kbd></button>
    </div>}
  </div>;
}
