"use client";

import { useEffect, useState } from "react";
import type { GraphNode } from "@/app/lib/types";
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
import { Textarea } from "@/components/ui/textarea";

export type NodeFormValue = {
  nodeKey: string;
  label: string;
  description: string;
  tags: string;
  globalConceptId: string;
};

interface NodeDialogProps {
  open: boolean;
  node?: GraphNode | null;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: NodeFormValue) => void;
}

export function NodeDialog({
  open,
  node,
  busy,
  onOpenChange,
  onSubmit,
}: NodeDialogProps) {
  const [value, setValue] = useState<NodeFormValue>({
    nodeKey: "",
    label: "",
    description: "",
    tags: "",
    globalConceptId: "",
  });

  useEffect(() => {
    if (!open) return;
    setValue({
      nodeKey: node?.nodeKey ?? "",
      label: node?.label ?? "",
      description: node?.description ?? "",
      tags: node?.tags.join(", ") ?? "",
      globalConceptId: node?.globalConceptId ?? "",
    });
  }, [node, open]);

  const update = (field: keyof NodeFormValue, next: string) =>
    setValue((current) => ({ ...current, [field]: next }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-[#11182a] text-white sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{node ? "编辑节点" : "新建节点"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            用简洁名称与说明记录一个可连接的知识概念。
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(value);
          }}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="node-key">节点标识</Label>
              <Input
                id="node-key"
                value={value.nodeKey}
                onChange={(event) => update("nodeKey", event.target.value)}
                placeholder="dbcontext"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="node-label">显示名称</Label>
              <Input
                id="node-label"
                value={value.label}
                onChange={(event) => update("label", event.target.value)}
                placeholder="DbContext"
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="node-description">说明</Label>
            <Textarea
              id="node-description"
              value={value.description}
              onChange={(event) => update("description", event.target.value)}
              rows={5}
              placeholder="这个概念是什么，它解决什么问题？"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="node-tags">标签</Label>
            <Input
              id="node-tags"
              value={value.tags}
              onChange={(event) => update("tags", event.target.value)}
              placeholder="core, performance, query"
            />
            <p className="text-xs text-slate-500">多个标签用英文逗号分隔。</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="global-concept">全局概念 ID（可选）</Label>
            <Input
              id="global-concept"
              value={value.globalConceptId}
              onChange={(event) => update("globalConceptId", event.target.value)}
              placeholder="dotnet.ef-core.dbcontext"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "正在保存…" : "保存节点"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

