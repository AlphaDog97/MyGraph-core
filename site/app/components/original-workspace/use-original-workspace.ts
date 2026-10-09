"use client";

import { useCallback, useMemo, useState } from "react";
import { message } from "antd";
import type {
  CategorySummary,
  GraphDetail,
  GraphEdge,
  GraphNode,
  GraphSummary,
  WorkspaceSnapshot,
} from "@/app/lib/types";
import type { EdgeFormValue } from "../edge-dialog";
import type { NodeFormValue } from "../node-dialog";

export type EntityDialogState =
  | { kind: "category"; mode: "create" | "edit"; item?: CategorySummary }
  | {
      kind: "graph";
      mode: "create" | "edit";
      item?: GraphSummary;
      categoryId?: string;
    }
  | null;

export type DeleteTarget =
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

export function useOriginalWorkspace(
  initialWorkspace: WorkspaceSnapshot,
  initialDetails: GraphDetail[],
) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [categoryId, setCategoryId] = useState(
    initialDetails[0]?.graph.categoryId ??
      initialWorkspace.categories[0]?.id ??
      "",
  );
  const [focusedGraphId, setFocusedGraphId] = useState("");
  const [details, setDetails] = useState<Record<string, GraphDetail>>(
    Object.fromEntries(initialDetails.map((detail) => [detail.graph.id, detail])),
  );
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

  const categoryGraphs = useMemo(
    () => workspace.graphs.filter((graph) => graph.categoryId === categoryId),
    [categoryId, workspace.graphs],
  );
  const visibleDetails = useMemo(() => {
    return categoryGraphs.flatMap((graph) =>
      details[graph.id] ? [details[graph.id]] : [],
    );
  }, [categoryGraphs, details]);
  const allDetails = useMemo(() => Object.values(details), [details]);
  const selectedNode = useMemo(
    () =>
      allDetails
        .flatMap((detail) => detail.nodes)
        .find((node) => node.id === selectedNodeId) ?? null,
    [allDetails, selectedNodeId],
  );

  const rememberDetails = useCallback((loaded: GraphDetail[]) => {
    setDetails((current) => ({
      ...current,
      ...Object.fromEntries(loaded.map((detail) => [detail.graph.id, detail])),
    }));
  }, []);

  const fetchDetails = useCallback(
    async (graphs: GraphSummary[]) => {
      const missing = graphs.filter((graph) => !details[graph.id]);
      const loaded = await Promise.all(
        missing.map((graph) =>
          request<GraphDetail>(`/api/graphs/${encodeURIComponent(graph.id)}`),
        ),
      );
      if (loaded.length) rememberDetails(loaded);
      return graphs.flatMap((graph) => {
        const detail = loaded.find((item) => item.graph.id === graph.id);
        return detail ? [detail] : details[graph.id] ? [details[graph.id]] : [];
      });
    },
    [details, rememberDetails],
  );

  const focusGraph = useCallback(
    async (id: string) => {
      setFocusedGraphId(id);
      setSearch("");
      setSelectedNodeId(undefined);
      if (!id) return;
      if (details[id]) return;
      const detail = await request<GraphDetail>(
        `/api/graphs/${encodeURIComponent(id)}`,
      );
      rememberDetails([detail]);
    },
    [details, rememberDetails],
  );

  const loadCategory = useCallback(
    async (id: string) => {
      setCategoryId(id);
      setFocusedGraphId("");
      setSearch("");
      setSelectedNodeId(undefined);
      await fetchDetails(
        workspace.graphs.filter((graph) => graph.categoryId === id),
      );
    },
    [fetchDetails, workspace.graphs],
  );

  const loadOverview = useCallback(async () => {
    return fetchDetails(workspace.graphs);
  }, [fetchDetails, workspace.graphs]);

  const refreshWorkspace = useCallback(async () => {
    const next = await request<WorkspaceSnapshot>("/api/categories");
    setWorkspace(next);
    return next;
  }, []);

  const refreshGraph = useCallback(
    async (id: string) => {
      const next = await request<GraphDetail>(
        `/api/graphs/${encodeURIComponent(id)}`,
      );
      rememberDetails([next]);
      return next;
    },
    [rememberDetails],
  );

  const mutate = useCallback(
    async (action: () => Promise<void>, successMessage: string) => {
      setBusy(true);
      try {
        await action();
        message.success(successMessage);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "操作失败");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const saveEntity = useCallback(
    (value: { id?: string; label: string; slug?: string }) => {
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
          const next = await refreshWorkspace();
          const createdGraph = next.graphs.find((graph) => graph.id === created.id);
          if (createdGraph) setCategoryId(createdGraph.categoryId);
          await focusGraph(created.id);
        } else {
          await request(
            `/api/graphs/${encodeURIComponent(dialog.item!.id)}`,
            "PATCH",
            { slug: value.slug, label: value.label },
          );
          await Promise.all([
            refreshWorkspace(),
            refreshGraph(dialog.item!.id),
          ]);
        }
        setEntityDialog(null);
      }, dialog.mode === "create" ? "已创建" : "已保存");
    },
    [entityDialog, focusGraph, mutate, refreshGraph, refreshWorkspace],
  );

  const saveNode = useCallback(
    (value: NodeFormValue) => {
      const targetGraphId =
        (nodeDialog
          ? allDetails.find((detail) =>
              detail.nodes.some((node) => node.id === nodeDialog.id),
            )?.graph.id
          : undefined) ?? focusedGraphId ?? visibleDetails[0]?.graph.id;
      if (!targetGraphId) return;
      const editing = nodeDialog ?? null;
      void mutate(async () => {
        const payload = { ...value, graphId: targetGraphId, tags: value.tags };
        const result = editing
          ? await request<{ id: string }>(
              `/api/nodes/${encodeURIComponent(editing.id)}`,
              "PATCH",
              payload,
            )
          : await request<{ id: string }>("/api/nodes", "POST", payload);
        await Promise.all([refreshGraph(targetGraphId), refreshWorkspace()]);
        setSelectedNodeId(result.id);
        setNodeDialog(undefined);
      }, editing ? "节点已更新" : "节点已添加");
    },
    [
      allDetails,
      focusedGraphId,
      mutate,
      nodeDialog,
      refreshGraph,
      refreshWorkspace,
      visibleDetails,
    ],
  );

  const saveEdge = useCallback(
    (value: EdgeFormValue) => {
      const dialog = edgeDialog;
      if (!dialog) return;
      const owningGraph = allDetails.find((detail) =>
        detail.nodes.some((node) => node.id === value.sourceNodeId),
      );
      if (!owningGraph) return;
      void mutate(async () => {
        const payload = { ...value, graphId: owningGraph.graph.id };
        if (dialog.edge) {
          await request(
            `/api/edges/${encodeURIComponent(dialog.edge.id)}`,
            "PATCH",
            payload,
          );
        } else {
          await request("/api/edges", "POST", payload);
        }
        await Promise.all([
          refreshGraph(owningGraph.graph.id),
          refreshWorkspace(),
        ]);
        setEdgeDialog(null);
      }, dialog.edge ? "关系已更新" : "关系已添加");
    },
    [allDetails, edgeDialog, mutate, refreshGraph, refreshWorkspace],
  );

  const confirmDelete = useCallback(() => {
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
      await request(`/api/${base}/${encodeURIComponent(target.item.id)}`, "DELETE");

      const owningGraph = allDetails.find(
        (detail) =>
          target.kind === "edge"
            ? detail.edges.some((edge) => edge.id === target.item.id)
            : target.kind === "node"
              ? detail.nodes.some((node) => node.id === target.item.id)
              : false,
      );
      const next = await refreshWorkspace();
      if (owningGraph) await refreshGraph(owningGraph.graph.id);

      if (target.kind === "category" || target.kind === "graph") {
        const preferredCategoryId =
          target.kind === "graph" &&
          next.categories.some((category) => category.id === target.item.categoryId)
            ? target.item.categoryId
            : next.categories[0]?.id;
        if (preferredCategoryId) {
          setCategoryId(preferredCategoryId);
          setFocusedGraphId("");
          setSearch("");
          setSelectedNodeId(undefined);
          await fetchDetails(
            next.graphs.filter((graph) => graph.categoryId === preferredCategoryId),
          );
        } else {
          setCategoryId("");
          setFocusedGraphId("");
        }
      }
      if (target.kind === "node") setSelectedNodeId(undefined);
      setDeleteTarget(null);
    }, "已删除");
  }, [
    allDetails,
    deleteTarget,
    fetchDetails,
    mutate,
    refreshGraph,
    refreshWorkspace,
  ]);

  return {
    workspace,
    categoryId,
    focusedGraphId,
    setFocusedGraphId,
    categoryGraphs,
    visibleDetails,
    allDetails,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    search,
    setSearch,
    busy,
    entityDialog,
    setEntityDialog,
    nodeDialog,
    setNodeDialog,
    edgeDialog,
    setEdgeDialog,
    deleteTarget,
    setDeleteTarget,
    focusGraph,
    loadCategory,
    loadOverview,
    saveEntity,
    saveNode,
    saveEdge,
    confirmDelete,
  };
}
