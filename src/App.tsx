import { useState, useEffect, useRef, useCallback } from "react";
import { Core } from "cytoscape";
import {
  Manifest,
  KnowledgeNode,
  KnowledgeNodeFile,
  KnowledgeGraph,
  TagColorAssignment,
} from "./domain/types";
import {
  buildGraphFromRaw,
  loadLocalGraphNodes,
  loadManifest,
} from "./data/loader";
import {
  loadTagColors,
  saveTagColors,
  loadLastViewed,
  saveLastViewed,
} from "./data/tagStorage";
import {
  AppPersistenceMode,
  AppwriteGraphRepository,
  AppwriteRepositoryError,
} from "./data/appwriteGraphRepository";
import GraphCanvas from "./components/GraphCanvas";
import GraphSelector from "./components/GraphSelector";
import GraphManagementMenu from "./components/GraphManagementMenu";
import SearchBar from "./components/SearchBar";
import TagLegend from "./components/TagLegend";
import TagColorEditor from "./components/TagColorEditor";
import NodeDetailPanel from "./components/NodeDetailPanel";
import ErrorDisplay from "./components/ErrorDisplay";
import AuthControls from "./auth/AuthControls";
import { useAuth } from "./auth/AuthProvider";

type AppState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      manifest: Manifest;
      categoryId: string;
      graphId: string;
      graph: KnowledgeGraph;
    };

type StorageMode =
  | { type: "local"; reason: "guest" | "cloud-not-configured" }
  | { type: "cloud"; email: string };

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function rebuildGraph(nodes: KnowledgeNode[]): KnowledgeGraph {
  const seenIds = new Set(nodes.map((n) => n.id));
  const warnings: string[] = [];
  const edges = nodes.flatMap((n) =>
    n.links
      .filter((l) => {
        if (!seenIds.has(l.target)) {
          warnings.push(
            `Node '${n.id}': link target '${l.target}' does not exist.`
          );
          return false;
        }
        return true;
      })
      .map((l) => ({
        id: `${n.id}--${l.type}--${l.target}`,
        source: n.id,
        target: l.target,
        type: l.type,
        label: l.label ?? l.type,
      }))
  );
  const tagSet = new Set<string>();
  for (const n of nodes) for (const t of n.tags) tagSet.add(t);
  return { nodes, edges, tags: [...tagSet].sort(), warnings };
}

function downloadGraphJson(
  graph: KnowledgeGraph,
  _categoryId: string,
  _graphId: string
) {
  const raw: KnowledgeNodeFile[] = graph.nodes.map((n) => {
    const obj: KnowledgeNodeFile = { id: n.id, label: n.label, tags: n.tags };
    if (n.description) obj.description = n.description;
    if (n.links.length > 0)
      obj.links = n.links.map((l) => {
        const link: { target: string; type: string; label?: string } = {
          target: l.target,
          type: l.type,
        };
        if (l.label) link.label = l.label;
        return link;
      });
    return obj;
  });
  const json = JSON.stringify(raw, null, 2) + "\n";
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "graph.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function App() {
  const persistenceMode: AppPersistenceMode =
    import.meta.env.VITE_GRAPH_PERSISTENCE_MODE === "appwrite"
      ? "appwrite"
      : "file";
  const appwriteRepoRef = useRef<AppwriteGraphRepository | null>(null);
  const [state, setState] = useState<AppState>({ status: "loading" });
  const [storageMode, setStorageMode] = useState<StorageMode>({
    type: "local",
    reason: cloudEnabled() ? "guest" : "cloud-not-configured",
  });
  const [tagColors, setTagColors] = useState<TagColorAssignment>(loadTagColors);
  const [searchQuery, setSearchQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [mgmtBusy, setMgmtBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const cyRef = useRef<Core | null>(null);

  const resolveGraph = useCallback(
    async (categoryId: string, graphId: string): Promise<KnowledgeGraph> => {
      const localNodes = await loadLocalGraphNodes(categoryId, graphId);
      const shouldUseCloud = storageMode.type === "cloud";
      if (!shouldUseCloud) {
        return buildGraphFromRaw(localNodes, categoryId, graphId);
      }
      try {
        const cloudNodes = await loadCloudGraphNodes(categoryId, graphId);
        return buildGraphFromRaw(
          cloudNodes ?? localNodes,
          categoryId,
          graphId
        );
      } catch (err) {
        console.warn("Cloud read failed; falling back to local graph-data.", err);
        return buildGraphFromRaw(localNodes, categoryId, graphId);
      }
    },
    [storageMode]
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    const authError = url.searchParams.get("auth_error");
    if (!authError) return;
    alert("第三方登录未完成，请重试。");
    url.searchParams.delete("auth_error");
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCloudUser();
        if (user?.email) {
          setStorageMode({ type: "cloud", email: user.email });
        } else {
          setStorageMode({
            type: "local",
            reason: cloudEnabled() ? "guest" : "cloud-not-configured",
          });
        }

        const manifest = await loadManifest();
        if (manifest.categories.length === 0) {
          setState({
            status: "error",
            message: "No categories found in graph-data/.",
          });
          return;
        }

        const lastViewed = loadLastViewed();
        let catId = manifest.categories[0].id;
        let gId = manifest.categories[0].graphs[0]?.id;

        if (lastViewed) {
          const cat = manifest.categories.find(
            (c) => c.id === lastViewed.categoryId
          );
          if (cat) {
            catId = cat.id;
            const gr = cat.graphs.find((g) => g.id === lastViewed.graphId);
            gId = gr ? gr.id : cat.graphs[0]?.id;
          }
        }

        if (!gId) {
          setState({
            status: "error",
            message: `Category '${catId}' has no graphs.`,
          });
          return;
        }

        const graph = await resolveGraph(catId, gId);
        saveLastViewed({ categoryId: catId, graphId: gId });
        setState({
          status: "ready",
          manifest,
          categoryId: catId,
          graphId: gId,
          graph,
        });
      } catch (err) {
        setState({
          status: "error",
          message: (err as Error).message,
        });
      }
    })();
  }, [resolveGraph]);

  const switchGraph = useCallback(
    async (manifest: Manifest, catId: string, gId: string) => {
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        return { ...prev, status: "loading" as const } as AppState;
      });
      try {
        const graph = await resolveGraph(catId, gId);
        saveLastViewed({ categoryId: catId, graphId: gId });
        setSelectedNode(null);
        setSearchQuery("");
        setState({
          status: "ready",
          manifest,
          categoryId: catId,
          graphId: gId,
          graph,
        });
      } catch (err) {
        setState({
          status: "error",
          message: (err as Error).message,
        });
      }
    },
    [resolveGraph]
  );

  const handleCategoryChange = useCallback(
    (newCatId: string) => {
      if (state.status !== "ready") return;
      const cat = state.manifest.categories.find((c) => c.id === newCatId);
      if (!cat || cat.graphs.length === 0) return;
      switchGraph(state.manifest, newCatId, cat.graphs[0].id);
    },
    [state, switchGraph]
  );

  const handleGraphChange = useCallback(
    (newGraphId: string) => {
      if (state.status !== "ready") return;
      switchGraph(state.manifest, state.categoryId, newGraphId);
    },
    [state, switchGraph]
  );

  const handleTagColorChange = useCallback(
    (tag: string, color: string | undefined) => {
      setTagColors((prev) => {
        const next = { ...prev };
        if (color) {
          next[tag] = color;
        } else {
          delete next[tag];
        }
        saveTagColors(next);
        return next;
      });
    },
    []
  );

  const handleResetView = useCallback(() => {
    cyRef.current?.animate({
      fit: { eles: cyRef.current.elements(), padding: 40 },
      duration: prefersReducedMotion() ? 0 : 400,
    });
  }, []);

  const handleNodeSelect = useCallback((node: KnowledgeNode | null) => {
    setSelectedNode(node);
  }, []);

  const handleNodeSave = useCallback(
    async (updated: KnowledgeNodeFile) => {
      if (saveBusy) return;
      if (state.status !== "ready") return;
      const newNode = new KnowledgeNode(updated);
      const newNodes = state.graph.nodes.map((n) =>
        n.id === updated.id ? newNode : n
      );
      const newGraph = rebuildGraph(newNodes);
      setSaveBusy(true);

      try {
        if (persistenceMode === "file") {
          downloadGraphJson(newGraph, state.categoryId, state.graphId);
          setFeedback({
            kind: "success",
            message: "已下载 graph.json，请提交到仓库。",
          });
        } else {
          if (!appwriteRepoRef.current) {
            appwriteRepoRef.current = new AppwriteGraphRepository();
          }
          await appwriteRepoRef.current.saveGraph(
            state.categoryId,
            state.graphId,
            newGraph
          );
          setFeedback({ kind: "success", message: "已保存到 Appwrite。" });
        }
      } catch (error) {
        if (error instanceof AppwriteRepositoryError) {
          if (error.kind === "auth") {
            setFeedback({ kind: "error", message: "登录已失效，请重新鉴权后再试。" });
          } else if (error.kind === "permission") {
            setFeedback({ kind: "error", message: "权限不足，无法保存该图。" });
          } else if (error.kind === "network") {
            setFeedback({ kind: "error", message: "网络异常，保存失败，请稍后重试。" });
          } else {
            setFeedback({ kind: "error", message: error.message });
          }
          return;
        }
        setFeedback({ kind: "error", message: (error as Error).message });
        return;
      } finally {
        setSaveBusy(false);
      }

      setState({ ...state, graph: newGraph });
      setSelectedNode(newNode);
    },
    [state, persistenceMode, saveBusy]
  );

  const handleMoveGraph = useCallback(
    async (targetCategoryId: string) => {
      if (mgmtBusy) return;
      if (state.status !== "ready") return;
      if (
        persistenceMode === "appwrite" &&
        !window.confirm(`确认将图 "${state.graphId}" 移动到 "${targetCategoryId}" 吗？`)
      ) {
        return;
      }

      try {
        setMgmtBusy(true);
        if (persistenceMode === "file") {
          downloadGraphJson(state.graph, targetCategoryId, state.graphId);
          alert(
            `graph.json has been downloaded.\n\n` +
              `To complete the move:\n` +
              `1. Move the folder graph-data/${state.categoryId}/${state.graphId}/ ` +
              `to graph-data/${targetCategoryId}/${state.graphId}/\n` +
              `2. Commit and redeploy.`
          );
          setFeedback({ kind: "success", message: "已下载 graph.json，请提交到仓库。" });
          return;
        }

        if (!appwriteRepoRef.current) {
          appwriteRepoRef.current = new AppwriteGraphRepository();
        }
        await appwriteRepoRef.current.moveGraph(
          state.categoryId,
          targetCategoryId,
          state.graphId
        );
        setFeedback({ kind: "success", message: "已保存到 Appwrite。" });
      } catch (error) {
        if (error instanceof AppwriteRepositoryError) {
          if (error.kind === "auth") {
            setFeedback({ kind: "error", message: "登录已失效，请重新鉴权后再试。" });
          } else if (error.kind === "permission") {
            setFeedback({ kind: "error", message: "权限不足，无法移动该图。" });
          } else if (error.kind === "network") {
            setFeedback({ kind: "error", message: "网络异常，移动失败，请稍后重试。" });
          } else {
            setFeedback({ kind: "error", message: error.message });
          }
          return;
        }
        setFeedback({ kind: "error", message: (error as Error).message });
      } finally {
        setMgmtBusy(false);
      }
    },
    [state, persistenceMode, mgmtBusy]
  );

  const handleDeleteGraph = useCallback(() => {
    if (state.status !== "ready") return;
    const { manifest, categoryId, graphId } = state;

    const newCategories = manifest.categories
      .map((c) => {
        if (c.id !== categoryId) return c;
        return { ...c, graphs: c.graphs.filter((g) => g.id !== graphId) };
      })
      .filter((c) => c.graphs.length > 0);

    const newManifest: Manifest = { categories: newCategories };

    if (newCategories.length === 0) {
      setState({
        status: "error",
        message: "All graphs have been removed. Add data to graph-data/ and redeploy.",
      });
      if (persistenceMode === "file") {
        alert(
          `To permanently delete this graph, remove the folder:\n` +
            `graph-data/${categoryId}/${graphId}/\n` +
            `Then commit and redeploy.`
        );
      }
      return;
    }

    const newCat = newCategories.find((c) => c.id === categoryId) ?? newCategories[0];
    const newGraphId = newCat.graphs[0].id;

    if (persistenceMode === "file") {
      downloadGraphJson(state.graph, categoryId, graphId);
      alert(
        `Graph removed from view.\n\n` +
          `To permanently delete, remove the folder:\n` +
          `graph-data/${categoryId}/${graphId}/\n` +
          `Then commit and redeploy.`
      );
      setFeedback({ kind: "success", message: "已下载 graph.json，请提交到仓库。" });
    } else {
      setFeedback({ kind: "success", message: "已保存到 Appwrite。" });
    }

    switchGraph(newManifest, newCat.id, newGraphId);
  }, [state, switchGraph, persistenceMode]);

  const handleDeleteGraphByMode = useCallback(async () => {
    if (mgmtBusy) return;
    if (state.status !== "ready") return;
    if (
      persistenceMode === "appwrite" &&
      !window.confirm(`确认删除图 "${state.graphId}" 吗？此操作不可撤销。`)
    ) {
      return;
    }
    try {
      setMgmtBusy(true);
      if (persistenceMode === "appwrite") {
        if (!appwriteRepoRef.current) {
          appwriteRepoRef.current = new AppwriteGraphRepository();
        }
        await appwriteRepoRef.current.deleteGraph(state.categoryId, state.graphId);
      }
      handleDeleteGraph();
    } catch (error) {
      if (error instanceof AppwriteRepositoryError) {
        if (error.kind === "auth") {
          setFeedback({ kind: "error", message: "登录已失效，请重新鉴权后再试。" });
        } else if (error.kind === "permission") {
          setFeedback({ kind: "error", message: "权限不足，无法删除该图。" });
        } else if (error.kind === "network") {
          setFeedback({ kind: "error", message: "网络异常，删除失败，请稍后重试。" });
        } else {
          setFeedback({ kind: "error", message: error.message });
        }
        return;
      }
      setFeedback({ kind: "error", message: (error as Error).message });
    } finally {
      setMgmtBusy(false);
    }
  }, [state, handleDeleteGraph, persistenceMode, mgmtBusy]);

  if (state.status === "loading") {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>{authLoading ? "Loading authentication…" : "Loading knowledge graph…"}</p>
      </div>
    );
  }

  if (state.status === "error") {
    return <ErrorDisplay error={state.message} />;
  }

  const { manifest, categoryId, graphId, graph } = state;
  const modeText =
    storageMode.type === "cloud"
      ? `Cloud mode · ${storageMode.email}`
      : storageMode.reason === "cloud-not-configured"
        ? "Local mode · Cloud not configured"
        : "Local mode · Guest";

  return (
    <div className="app-shell">
      <div className="auth-toolbar">
        <AuthControls />
      </div>
      <div className="toolbar">
        <GraphSelector
          manifest={manifest}
          categoryId={categoryId}
          graphId={graphId}
          onCategoryChange={handleCategoryChange}
          onGraphChange={handleGraphChange}
        />
        <GraphManagementMenu
          manifest={manifest}
          categoryId={categoryId}
          graphId={graphId}
          mode={persistenceMode}
          busy={mgmtBusy}
          onMove={handleMoveGraph}
          onDelete={handleDeleteGraphByMode}
        />
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <span
          className={`storage-badge ${storageMode.type === "cloud" ? "is-cloud" : "is-local"}`}
          title={
            storageMode.type === "cloud"
              ? "Changes are saved to Appwrite Tables."
              : "Changes are saved locally by downloading graph.json."
          }
        >
          {modeText}
        </span>
        <div className="toolbar-actions">
          <button className="btn btn-secondary" onClick={handleResetView}>
            Fit view
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setEditorOpen(true)}
          >
            Edit tag colors
          </button>
        </div>
      </div>

      <div className="graph-area">
        {feedback && (
          <div className={`feedback-banner ${feedback.kind}`}>{feedback.message}</div>
        )}
        <div
          className={`graph-canvas-wrapper${selectedNode ? " with-panel" : ""}`}
        >
          <GraphCanvas
            graph={graph}
            tagColors={tagColors}
            searchQuery={searchQuery}
            cyRef={cyRef}
            onNodeSelect={handleNodeSelect}
          />
        </div>
        <TagLegend tags={graph.tags} tagColors={tagColors} />

        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            allNodeIds={graph.nodes.map((n) => n.id)}
            onClose={() => {
              setSelectedNode(null);
              cyRef.current?.nodes().removeClass("selected-node");
            }}
            onSave={handleNodeSave}
            saveBusy={saveBusy}
          />
        )}
      </div>

      {graph.warnings.length > 0 && (
        <div className="warnings-bar">
          {graph.warnings.map((w, i) => (
            <span key={i} className="warning-item">
              ⚠ {w}
            </span>
          ))}
        </div>
      )}

      {editorOpen && (
        <TagColorEditor
          tags={graph.tags}
          tagColors={tagColors}
          onChange={handleTagColorChange}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}
