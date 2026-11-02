"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Drawer, Input, Select, Space } from "antd";
import type { GraphEdge, GraphNode } from "@/app/lib/types";
import type { ConnectionSide } from "@/original-ui/domain/types";
import { EDGE_TYPE_ORDER } from "@/original-ui/domain/edgeTypes";
import { EdgePortSelect } from "./edge-port-select";
import "./edge-editor.css";

export type EdgeFormValue = {
  sourceNodeId: string;
  targetNodeId: string;
  type: string;
  label: string;
  sourcePort?: ConnectionSide | null;
  targetPort?: ConnectionSide | null;
};

interface EdgeDialogProps {
  open: boolean;
  edge?: GraphEdge | null;
  nodes: GraphNode[];
  preferredSourceId?: string;
  preferredTargetId?: string;
  sourcePort?: ConnectionSide;
  targetPort?: ConnectionSide;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: EdgeFormValue) => void;
  onDelete?: () => void;
}

const typeLabels = { Concept: "概念", Description: "描述", Condition: "条件", Action: "动作" };
const typeOptions = EDGE_TYPE_ORDER.map(value => ({ value, label: `${value} · ${typeLabels[value]}` }));

/** Shared nonmodal inspector for both creating and editing a relation. */
export function EdgeDialog({ open, edge, nodes, preferredSourceId, preferredTargetId,
  sourcePort, targetPort, busy, onOpenChange, onSubmit, onDelete }: EdgeDialogProps) {
  const [value, setValue] = useState<EdgeFormValue>({ sourceNodeId: "", targetNodeId: "", type: "Concept", label: "" });
  const supportedType = edge ? EDGE_TYPE_ORDER.find(type => type.toLowerCase() === edge.type.trim().toLowerCase()) : "Concept";
  useEffect(() => {
    if (!open) return;
    setValue({
      sourceNodeId: edge?.sourceNodeId ?? preferredSourceId ?? nodes[0]?.id ?? "",
      targetNodeId: edge?.targetNodeId ?? preferredTargetId ?? nodes.find(node => node.id !== preferredSourceId)?.id ?? "",
      type: supportedType ?? "",
      label: edge?.label ?? "",
      sourcePort: edge?.sourcePort ?? sourcePort ?? null,
      targetPort: edge?.targetPort ?? targetPort ?? null,
    });
  }, [edge, nodes, open, preferredSourceId, preferredTargetId, sourcePort, targetPort, supportedType]);
  const nodeOptions = nodes.map(node => ({ value: node.id, label: node.label }));
  return <Drawer open={open} title={edge ? "编辑连线" : "新建连线"} placement="right"
    mask={false} autoFocus={false} aria-modal={false} getContainer={false} width="min(420px, 94vw)"
    zIndex={40} rootClassName="edge-editor-drawer" rootStyle={{ position: "absolute" }} onClose={() => onOpenChange(false)}
    footer={<Space className="edge-editor-footer">
      {edge && onDelete && <Button danger disabled={busy} onClick={onDelete}>删除连线</Button>}
      <Button onClick={() => onOpenChange(false)}>取消</Button>
      <Button type="primary" htmlType="submit" form="edge-editor-form" loading={busy}
        disabled={!value.sourceNodeId || !value.targetNodeId || !value.type}>保存关系</Button>
    </Space>}>
    <form id="edge-editor-form" className="edge-editor-form" onSubmit={event => { event.preventDefault(); if (value.type) onSubmit(value); }}>
      <p className="edge-editor-description">设置连接节点和关系。你可以继续移动或缩放画布。</p>
      <label htmlFor="edge-source">起点</label>
      <Select id="edge-source" aria-label="起点" value={value.sourceNodeId || undefined} options={nodeOptions}
        onChange={sourceNodeId => setValue(current => ({ ...current, sourceNodeId }))} />
      <label htmlFor="edge-target">终点</label>
      <Select id="edge-target" aria-label="终点" value={value.targetNodeId || undefined} options={nodeOptions}
        onChange={targetNodeId => setValue(current => ({ ...current, targetNodeId }))} />
      <div className="edge-editor-ports">
        <EdgePortSelect label="起点连接点" value={value.sourcePort}
          onChange={sourcePort => setValue(current => ({ ...current, sourcePort }))} />
        <EdgePortSelect label="终点连接点" value={value.targetPort}
          onChange={targetPort => setValue(current => ({ ...current, targetPort }))} />
      </div>
      <label htmlFor="edge-type">关系类型</label>
      <Select id="edge-type" aria-label="关系类型" placeholder="选择关系类型" value={value.type || undefined}
        options={typeOptions} onChange={type => setValue(current => ({ ...current, type }))} />
      {edge && !supportedType && <Alert type="info" showIcon
        message={`原类型“${edge.type}”不在四种类型中，请选择新类型后保存。`} />}
      <label htmlFor="edge-label">关系说明</label>
      <Input.TextArea id="edge-label" value={value.label} autoSize={{ minRows: 3, maxRows: 6 }} placeholder="例如：依赖于、包含、触发"
        onChange={event => setValue(current => ({ ...current, label: event.target.value }))} />
    </form>
  </Drawer>;
}
