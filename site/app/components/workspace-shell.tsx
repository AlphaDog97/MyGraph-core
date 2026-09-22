"use client";

import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GitBranch,
  Network,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type {
  CategorySummary,
  GraphDetail,
  GraphEdge,
  GraphNode,
  GraphSummary,
  WorkspaceSnapshot,
} from "@/app/lib/types";
import type { SignedInUser } from "@/app/lib/auth";
import { useWebMcp } from "@/app/lib/use-webmcp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { CategoryGraphDialog } from "./category-graph-dialog";
import { DeleteDialog } from "./delete-dialog";
import { EdgeDialog, type EdgeFormValue } from "./edge-dialog";
import { GraphCanvas } from "./graph-canvas";
import { GraphSidebar } from "./graph-sidebar";
import { NodeDialog, type NodeFormValue } from "./node-dialog";
import { NodeInspector } from "./node-inspector";
import { UserMenu } from "./user-menu";

type EntityDialogState =
  | { kind: "category"; mode: "create" | "edit"; item?: CategorySummary }
  | {
      kind: "graph";
      mode: "create" | "edit";
      item?: GraphSummary;
      categoryId?: string;
    }
  | null;

type DeleteTarget =
  | { kind: "category"; item: CategorySummary }
  | { kind: "graph"; item: GraphSummary }
  | { kind: "node"; item: GraphNode }
  | { kind: "edge"; item: GraphEdge }
  | null;

async function request<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "操作失败");
  return result;
}

export function WorkspaceShell({
  user,
  initialWorkspace,
  initialDetail,
}: {
  user: SignedInUser;
  initialWorkspace: WorkspaceSnapshot;
  initialDetail: GraphDetail | null;
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [detail, setDetail] = useState(initialDetail);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [entityDialog, setEntityDialog] = useState<EntityDialogState>(null);
  const [nodeDialog, setNodeDialog] = useState<GraphNode | null | undefined>();
  const [edgeDialog, setEdgeDialog] = useState<{
    edge?: GraphEdge;
    preferredSourceId?: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedNode = useMemo(
    () => detail?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [detail?.nodes, selectedNodeId],
  );
  const selectedCategory = workspace.categories.find(
    (category) => category.id === detail?.graph.categoryId,
  );

  const refreshWorkspace = useCallback(async () => {
    const next = await request<WorkspaceSnapshot>("/api/categories");
    setWorkspace(next);
  }, []);

  const loadGraph = useCallback(async (id: string) => {
    const next = await request<GraphDetail>(
      `/api/graphs/${encodeURIComponent(id)}`,
    );
    setDetail(next);
    setSearch("");
    setSelectedNodeId(undefined);
  }, []);

  const refreshGraph = useCallback(async () => {
    if (!detail?.graph.id) return;
    const next = await request<GraphDetail>(
      `/api/graphs/${encodeURIComponent(detail.graph.id)}`,
    );
    setDetail(next);
  }, [detail?.graph.id]);

  useWebMcp(detail, refreshGraph, refreshWorkspace);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const mutate = async (
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  const saveEntity = (value: { id?: string; label: string; slug?: string }) => {
    const dialog = entityDialog;
    if (!dialog) return;
    void mutate(async () => {
      if (dialog.kind === "category") {
        if (dialog.mode === "create") {
          await request("/api/categories", "POST", value);
        } else {
          await request(
            `/api/categories/${encodeURIComponent(dialog.item!.id)}`,
            "PATCH",
            { label: value.label },
          );
        }
        await refreshWorkspace();
      } else if (dialog.mode === "create") {
        const created = await request<{ id: string }>("/api/graphs", "POST", {
          categoryId: dialog.categoryId,
          slug: value.slug,
          label: value.label,
        });
        await refreshWorkspace();
        await loadGraph(created.id);
      } else {
        await request(
          `/api/graphs/${encodeURIComponent(dialog.item!.id)}`,
          "PATCH",
          { slug: value.slug, label: value.label },
        );
        await Promise.all([refreshWorkspace(), refreshGraph()]);
      }
      setEntityDialog(null);
    }, dialog.mode === "create" ? "已创建" : "已保存");
  };

  const saveNode = (value: NodeFormValue) => {
    if (!detail) return;
    const editing = nodeDialog ?? null;
    void mutate(async () => {
      const payload = {
        ...value,
        graphId: detail.graph.id,
        tags: value.tags,
      };
      const result = editing
        ? await request<{ id: string }>(
            `/api/nodes/${encodeURIComponent(editing.id)}`,
            "PATCH",
            payload,
          )
        : await request<{ id: string }>("/api/nodes", "POST", payload);
      await Promise.all([refreshGraph(), refreshWorkspace()]);
      setSelectedNodeId(result.id);
      setNodeDialog(undefined);
    }, editing ? "节点已更新" : "节点已添加");
  };

  const saveEdge = (value: EdgeFormValue) => {
    if (!detail || !edgeDialog) return;
    const editing = edgeDialog.edge;
    void mutate(async () => {
      const payload = { ...value, graphId: detail.graph.id };
      if (editing) {
        await request(
          `/api/edges/${encodeURIComponent(editing.id)}`,
          "PATCH",
          payload,
        );
      } else {
        await request("/api/edges", "POST", payload);
      }
      await Promise.all([refreshGraph(), refreshWorkspace()]);
      setEdgeDialog(null);
    }, editing ? "关系已更新" : "关系已添加");
  };

  const confirmDelete = () => {
    const target = deleteTarget;
    if (!target) return;
    void mutate(async () => {
      const base =
        target.kind === "category"
          ? "categories"
          : target.kind === "graph"
            ? "graphs"
            : target.kind === "node"
              ? "nodes"
              : "edges";
      await request(
        `/api/${base}/${encodeURIComponent(target.item.id)}`,
        "DELETE",
      );

      if (target.kind === "category" || target.kind === "graph") {
        const remaining = workspace.graphs.filter((graph) =>
          target.kind === "category"
            ? graph.categoryId !== target.item.id
            : graph.id !== target.item.id,
        );
        await refreshWorkspace();
        if (
          target.kind === "graph" ||
          detail?.graph.categoryId === target.item.id
        ) {
          if (remaining[0]) await loadGraph(remaining[0].id);
          else setDetail(null);
        }
      } else {
        if (target.kind === "node") setSelectedNodeId(undefined);
        await Promise.all([refreshGraph(), refreshWorkspace()]);
      }
      setDeleteTarget(null);
    }, "已删除");
  };

  const deleteLabel = deleteTarget
    ? "label" in deleteTarget.item
      ? deleteTarget.item.label
      : "所选内容"
    : "";

  const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || !detail) return;
    const first = detail.nodes.find((node) =>
      [node.label, node.nodeKey, ...node.tags]
        .join(" ")
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
    );
    if (first) setSelectedNodeId(first.id);
  };

  return (
    <div className="workspace-shell">
      <GraphSidebar
        categories={workspace.categories}
        graphs={workspace.graphs}
        selectedGraphId={detail?.graph.id}
        onSelectGraph={(graph) => void loadGraph(graph.id)}
        onCreateCategory={() =>
          setEntityDialog({ kind: "category", mode: "create" })
        }
        onEditCategory={(item) =>
          setEntityDialog({ kind: "category", mode: "edit", item })
        }
        onDeleteCategory={(item) =>
          setDeleteTarget({ kind: "category", item })
        }
        onCreateGraph={(category) =>
          setEntityDialog({
            kind: "graph",
            mode: "create",
            categoryId: category.id,
          })
        }
        onEditGraph={(item) =>
          setEntityDialog({ kind: "graph", mode: "edit", item })
        }
        onDeleteGraph={(item) => setDeleteTarget({ kind: "graph", item })}
      />

      <main className="graph-workspace">
        <header className="command-bar">
          <div className="graph-context">
            <span>{selectedCategory?.label ?? "知识图谱"}</span>
            <strong>{detail?.graph.label ?? "选择图谱"}</strong>
          </div>
          <div className="search-box">
            <Search />
            <Input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="搜索节点、描述或标签"
              aria-label="搜索当前图谱"
            />
            <kbd>/</kbd>
          </div>
          <Button
            onClick={() => setNodeDialog(null)}
            disabled={!detail}
            className="new-node-button"
          >
            <Plus /> 新建节点
          </Button>
          <UserMenu user={user} />
        </header>

        <section className="canvas-panel">
          <div className="canvas-heading">
            <div>
              <span className="eyebrow">ACTIVE GRAPH</span>
              <h1>{detail?.graph.label ?? "MyGraph"}</h1>
            </div>
            <div className="graph-stats">
              <span><Network /> {detail?.nodes.length ?? 0} 节点</span>
              <span><GitBranch /> {detail?.edges.length ?? 0} 关系</span>
            </div>
          </div>
          <GraphCanvas
            detail={detail}
            selectedNodeId={selectedNodeId}
            search={search}
            onSelectNode={(node) => setSelectedNodeId(node.id)}
            onCreateNode={() => setNodeDialog(null)}
          />
          <div className="canvas-footnote">
            <Sparkles />
            <span>点击节点查看详情；输入关键词即可聚焦相关概念。</span>
          </div>
        </section>
      </main>

      <NodeInspector
        node={selectedNode}
        nodes={detail?.nodes ?? []}
        edges={detail?.edges ?? []}
        onClose={() => setSelectedNodeId(undefined)}
        onEditNode={(node) => setNodeDialog(node)}
        onDeleteNode={(item) => setDeleteTarget({ kind: "node", item })}
        onCreateEdge={(preferredSourceId) =>
          setEdgeDialog({ preferredSourceId })
        }
        onEditEdge={(edge) => setEdgeDialog({ edge })}
        onDeleteEdge={(item) => setDeleteTarget({ kind: "edge", item })}
        onSelectNode={(node) => setSelectedNodeId(node.id)}
      />

      <CategoryGraphDialog
        open={Boolean(entityDialog)}
        kind={entityDialog?.kind ?? "category"}
        mode={entityDialog?.mode ?? "create"}
        initial={entityDialog?.item}
        busy={busy}
        onOpenChange={(open) => !open && setEntityDialog(null)}
        onSubmit={saveEntity}
      />
      <NodeDialog
        open={nodeDialog !== undefined}
        node={nodeDialog}
        busy={busy}
        onOpenChange={(open) => !open && setNodeDialog(undefined)}
        onSubmit={saveNode}
      />
      <EdgeDialog
        open={Boolean(edgeDialog)}
        edge={edgeDialog?.edge}
        preferredSourceId={edgeDialog?.preferredSourceId}
        nodes={detail?.nodes ?? []}
        busy={busy}
        onOpenChange={(open) => !open && setEdgeDialog(null)}
        onSubmit={saveEdge}
      />
      <DeleteDialog
        open={Boolean(deleteTarget)}
        title={`删除“${deleteLabel}”？`}
        description={
          deleteTarget?.kind === "category"
            ? "该分类下的图谱、节点和关系都会一并删除，此操作无法撤销。"
            : deleteTarget?.kind === "graph"
              ? "图谱中的全部节点和关系都会一并删除，此操作无法撤销。"
              : deleteTarget?.kind === "node"
                ? "与该节点连接的关系也会被删除，此操作无法撤销。"
                : "这条关系将被永久删除。"
        }
        busy={busy}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <Toaster position="bottom-center" richColors />
    </div>
  );
}
