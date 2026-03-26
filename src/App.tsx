import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  loadCategoryGraphs,
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
  cloudEnabled,
  loadCloudGraph,
  saveCloudGraph,
} from "./data/cloudStorage";
import GraphCanvas from "./components/GraphCanvas";
import GraphSelector from "./components/GraphSelector";
import GraphManagementMenu from "./components/GraphManagementMenu";
import SearchBar from "./components/SearchBar";
import TagLegend from "./components/TagLegend";
import EdgeTypeLegend from "./components/EdgeTypeLegend";
import TagColorEditor from "./components/TagColorEditor";
import NodeDetailPanel from "./components/NodeDetailPanel";
import ErrorDisplay from "./components/ErrorDisplay";
import AuthControls from "./auth/AuthControls";
import { useAuth } from "./auth/AuthProvider";

type GraphOption = { id: string; label: string };

type AppState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      manifest: Manifest;
      graphOptions: GraphOption[];
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
  const { loading: authLoading, user } = useAuth();
  const [state, setState] = useState<AppState>({ status: "loading" });
  const storageMode = useMemo<StorageMode>(() => {
    if (user?.email && cloudEnabled()) {
      return { type: "cloud", email: user.email };
    }
    return {
      type: "local",
      reason: cloudEnabled() ? "guest" : "cloud-not-configured",
    };
  }, [user]);
  const [tagColors, setTagColors] = useState<TagColorAssignment>(loadTagColors);
  const [searchQuery, setSearchQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const cyRef = useRef<Core | null>(null);

  const resolveGraph = useCallback(
    async (categoryId: string, graphId: string): Promise<KnowledgeGraph> => {
      const localNodes = await loadLocalGraphNodes(categoryId, graphId);
      const shouldUseCloud = storageMode.type === "cloud";
      if (!shouldUseCloud) {
        return buildGraphFromRaw(localNodes, categoryId, graphId);
      }
      try {
        const cloudGraph = await loadCloudGraph(categoryId, graphId, user?.$id);
        if (cloudGraph) {
          return cloudGraph;
        }
        return buildGraphFromRaw(localNodes, categoryId, graphId);
      } catch (err) {
        console.warn("Cloud read failed; falling back to local graph-data.", err);
        return buildGraphFromRaw(localNodes, categoryId, graphId);
      }
    },
    [storageMode, user]
  );

  const resolveGraphOptions = useCallback(async (categoryId: string) => {
    const graphs = await loadCategoryGraphs(categoryId);
    return graphs.map((graph) => ({
      id: graph.graphId,
      label: graph.graphLabel,
    }));
  }, []);

  useEffect(() => {
    (async () => {
      try {
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
        let graphOptions = await resolveGraphOptions(catId);
        let gId = graphOptions[0]?.id;

        if (lastViewed) {
          const cat = manifest.categories.find(
            (c) => c.id === lastViewed.categoryId
          );
          if (cat) {
            catId = cat.id;
            graphOptions = await resolveGraphOptions(catId);
            const gr = graphOptions.find((g) => g.id === lastViewed.graphId);
            gId = gr ? gr.id : graphOptions[0]?.id;
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
          graphOptions,
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
  }, [resolveGraph, resolveGraphOptions]);

  const switchGraph = useCallback(
    async (manifest: Manifest, catId: string, gId: string) => {
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        return { ...prev, status: "loading" as const } as AppState;
      });
      try {
        const graphOptions = await resolveGraphOptions(catId);
        const selectedGraph =
          graphOptions.find((graph) => graph.id === gId) ?? graphOptions[0];
        if (!selectedGraph) {
          throw new Error(`Category '${catId}' has no graphs.`);
        }
        const graph = await resolveGraph(catId, selectedGraph.id);
        saveLastViewed({ categoryId: catId, graphId: selectedGraph.id });
        setSelectedNode(null);
        setSearchQuery("");
        setState({
          status: "ready",
          manifest,
          graphOptions,
          categoryId: catId,
          graphId: selectedGraph.id,
          graph,
        });
      } catch (err) {
        setState({
          status: "error",
          message: (err as Error).message,
        });
      }
    },
    [resolveGraph, resolveGraphOptions]
  );

  const handleCategoryChange = useCallback(
    (newCatId: string) => {
      if (state.status !== "ready") return;
      const cat = state.manifest.categories.find((c) => c.id === newCatId);
      if (!cat) return;
      switchGraph(state.manifest, newCatId, "");
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
    (updated: KnowledgeNodeFile) => {
      if (state.status !== "ready") return;
      const newNode = new KnowledgeNode(updated);
      const newNodes = state.graph.nodes.map((n) =>
        n.id === updated.id ? newNode : n
      );
      const newGraph = rebuildGraph(newNodes);

      if (storageMode.type === "cloud") {
        if (!user) {
          alert("Cloud save requires sign-in.");
          return;
        }
        saveCloudGraph({
          categoryId: state.categoryId,
          graphId: state.graphId,
          ownerUserId: user.$id,
          visibility: "private",
        }, newGraph)
          .then(() => {
            alert("Saved to Appwrite cloud.");
          })
          .catch((err) => {
            console.error(err);
            alert(
              "Cloud save failed. Your update is kept in memory for this session only."
            );
          });
      } else {
        downloadGraphJson(newGraph, state.categoryId, state.graphId);
      }

      setState({ ...state, graph: newGraph });
      setSelectedNode(newNode);
    },
    [state, storageMode, user]
  );

  const handleMoveGraph = useCallback(
    (targetCategoryId: string) => {
      if (state.status !== "ready") return;
      downloadGraphJson(state.graph, targetCategoryId, state.graphId);
      alert(
        `graph.json has been downloaded.\n\n` +
          `To complete the move:\n` +
          `1. Open graph-data/${targetCategoryId}/graph.json and add/update the graph entry for '${state.graphId}'.\n` +
          `2. Remove the graph entry from graph-data/${state.categoryId}/graph.json.\n` +
          `3. Commit and redeploy.`
      );
    },
    [state]
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
      alert(
        `To permanently delete this graph, remove it from:\n` +
          `graph-data/${categoryId}/graph.json\n` +
          `Then commit and redeploy.`
      );
      return;
    }

    const newCat = newCategories.find((c) => c.id === categoryId) ?? newCategories[0];
    const newGraphId = newCat.graphs[0].id;

    alert(
      `Graph removed from view.\n\n` +
        `To permanently delete, remove it from:\n` +
        `graph-data/${categoryId}/graph.json\n` +
        `Then commit and redeploy.`
    );

    switchGraph(newManifest, newCat.id, newGraphId);
  }, [state, switchGraph]);

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

  const { manifest, graphOptions, categoryId, graphId, graph } = state;
  const categoryOptions = manifest.categories.map((category) => ({
    ...category,
    graphs: [],
  }));
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
          categories={categoryOptions}
          graphs={graphOptions}
          categoryId={categoryId}
          graphId={graphId}
          onCategoryChange={handleCategoryChange}
          onGraphChange={handleGraphChange}
        />
        <GraphManagementMenu
          manifest={manifest}
          categoryId={categoryId}
          graphId={graphId}
          onMove={handleMoveGraph}
          onDelete={handleDeleteGraph}
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
        <div
          className={`graph-canvas-wrapper${selectedNode ? " with-panel" : ""}`}
        >
          <GraphCanvas
            key={graphId}
            graph={graph}
            tagColors={tagColors}
            searchQuery={searchQuery}
            cyRef={cyRef}
            onNodeSelect={handleNodeSelect}
          />
        </div>
        <TagLegend tags={graph.tags} tagColors={tagColors} />
        <EdgeTypeLegend />

        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            allNodeIds={graph.nodes.map((n) => n.id)}
            onClose={() => {
              setSelectedNode(null);
              cyRef.current?.nodes().removeClass("selected-node");
            }}
            onSave={handleNodeSave}
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
