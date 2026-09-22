"use client";

import { useEffect, useState } from "react";
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

interface CategoryGraphDialogProps {
  open: boolean;
  kind: "category" | "graph";
  mode: "create" | "edit";
  initial?: { id?: string; label?: string; slug?: string };
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: { id?: string; label: string; slug?: string }) => void;
}

export function CategoryGraphDialog({
  open,
  kind,
  mode,
  initial,
  busy,
  onOpenChange,
  onSubmit,
}: CategoryGraphDialogProps) {
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (!open) return;
    setId(initial?.id ?? "");
    setLabel(initial?.label ?? "");
    setSlug(initial?.slug ?? "");
  }, [initial, open]);

  const isCategory = kind === "category";
  const noun = isCategory ? "分类" : "图谱";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#11182a] text-white sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "新建" : "编辑"}{noun}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {isCategory ? "分类用于组织一组相关图谱。" : "图谱包含节点和它们之间的关系。"}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ id, label, slug });
          }}
        >
          {isCategory && mode === "create" ? (
            <div className="grid gap-2">
              <Label htmlFor="category-id">分类标识</Label>
              <Input
                id="category-id"
                value={id}
                onChange={(event) => setId(event.target.value)}
                placeholder="例如 system-design"
                autoFocus
                required
              />
            </div>
          ) : null}
          {!isCategory ? (
            <div className="grid gap-2">
              <Label htmlFor="graph-slug">图谱标识</Label>
              <Input
                id="graph-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="例如 api-design"
                autoFocus
                required
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="entity-label">显示名称</Label>
            <Input
              id="entity-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={isCategory ? "系统设计" : "API Design"}
              autoFocus={isCategory && mode === "edit"}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "正在保存…" : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

