"use client";

import { useEffect, useState } from "react";
import type { GraphEdge, GraphNode } from "@/app/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EdgeFormValue = {
  sourceNodeId: string;
  targetNodeId: string;
  type: string;
  label: string;
};

interface EdgeDialogProps {
  open: boolean;
  edge?: GraphEdge | null;
  nodes: GraphNode[];
  preferredSourceId?: string;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: EdgeFormValue) => void;
}

export function EdgeDialog({
  open,
  edge,
  nodes,
  preferredSourceId,
  busy,
  onOpenChange,
  onSubmit,
}: EdgeDialogProps) {
  const [value, setValue] = useState<EdgeFormValue>({
    sourceNodeId: "",
    targetNodeId: "",
    type: "Concept",
    label: "",
  });

  useEffect(() => {
    if (!open) return;
    setValue({
      sourceNodeId: edge?.sourceNodeId ?? preferredSourceId ?? nodes[0]?.id ?? "",
      targetNodeId: edge?.targetNodeId ?? nodes[1]?.id ?? nodes[0]?.id ?? "",
      type: edge?.type ?? "Concept",
      label: edge?.label ?? "",
    });
  }, [edge, nodes, open, preferredSourceId]);

  const update = (field: keyof EdgeFormValue, next: string) =>
    setValue((current) => ({ ...current, [field]: next }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#11182a] text-white sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{edge ? "编辑关系" : "新建关系"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            选择起点和终点，并描述两个知识节点之间的联系。
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(value);
          }}
        >
          <div className="grid gap-2">
            <Label>起点</Label>
            <Select
              value={value.sourceNodeId}
              onValueChange={(next) => update("sourceNodeId", next ?? "")}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="选择起点" /></SelectTrigger>
              <SelectContent>
                {nodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>终点</Label>
            <Select
              value={value.targetNodeId}
              onValueChange={(next) => update("targetNodeId", next ?? "")}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="选择终点" /></SelectTrigger>
              <SelectContent>
                {nodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edge-type">关系类型</Label>
              <Input
                id="edge-type"
                value={value.type}
                onChange={(event) => update("type", event.target.value)}
                placeholder="Concept"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edge-label">关系说明</Label>
              <Input
                id="edge-label"
                value={value.label}
                onChange={(event) => update("label", event.target.value)}
                placeholder="依赖于"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={busy || nodes.length < 2}>
              {busy ? "正在保存…" : "保存关系"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

