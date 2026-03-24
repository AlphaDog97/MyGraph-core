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
  loadTagColors,
  saveTagColors,
  loadLastViewed,
  saveLastViewed,
} from "./data/tagStorage";
import { AppwriteGraphRepository } from "./data/appwriteGraphRepository";
import { FileGraphRepository } from "./data/fileGraphRepository";
import { GraphRepository, RepositoryMode } from "./data/repository";
import GraphCanvas from "./components/GraphCanvas";
import GraphSelector from "./components/GraphSelector";
import GraphManagementMenu from "./components/GraphManagementMenu";
import SearchBar from "./components/SearchBar";
import TagLegend from "./components/TagLegend";
import TagColorEditor from "./components/TagColorEditor";
import NodeDetailPanel from "./components/NodeDetailPanel";
import ErrorDisplay from "./components/ErrorDisplay";

type AppState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      mode: RepositoryMode;
      manifest: Manifest;
      categoryId: string;
      graphId: string;
      graph: KnowledgeGraph;
    };

const REPOSITORY_MODE_KEY = "mygraph.repositoryMode";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isLoggedInToAppwrite = () =>
  Boolean(localStorage.getItem("mygraph.appwriteUserId")?.trim());

const modeDisplayText: Record<RepositoryMode, string> = {
  file: "Guest / Local Repo",
  appwrite: "Cloud / Appwrite",
};

function loadRepositoryModePreference(): RepositoryMode {
  const raw = localStorage.getItem(REPOSITORY_MODE_KEY);
  return raw === "appwrite" || raw === "file" ? raw : "file";
}

function saveRepositoryModePreference(mode: RepositoryMode): void {
  localStorage.setItem(REPOSITORY_MODE_KEY, mode);
}

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

export default function App() {
  const [state, setState] = useState<AppState>({ status: "loading" });
  const [tagColors, setTagColors] = useState<TagColorAssignment>(loadTagColors);
  const [searchQuery, setSearchQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const cyRef = useRef<Core | null>(null);

  const repositories = useMemo<Record<RepositoryMode, GraphRepository>>(
    () => ({
      file: new FileGraphRepository(),
      appwrite: new AppwriteGraphRepository(),
    }),
    []
  );

  const initializeFromRepository = useCallback(
    async (mode: RepositoryMode, preferred?: { categoryId: string; graphId: string }) => {
      const repo = repositories[mode];
      const manifest = await repo.loadManifest();

      if (manifest.categories.length === 0) {
        throw new Error(
          mode === "appwrite"
            ? "No cloud graphs found. Save a graph in Appwrite first."
            : "No categories found in graph-data/."
        );
      }

      let catId = manifest.categories[0].id;
      let gId = manifest.categories[0].graphs[0]?.id;

      if (preferred) {
        const cat = manifest.categories.find((c) => c.id === preferred.categoryId);
        if (cat) {
          catId = cat.id;
          const gr = cat.graphs.find((g) => g.id === preferred.graphId);
          gId = gr ? gr.id : cat.graphs[0]?.id;
        }
      }

      if (!gId) {
        throw new Error(`Category '${catId}' has no graphs.`);
      }

      const graph = await repo.loadGraph(catId, gId);
      saveLastViewed({ categoryId: catId, graphId: gId });

      setState({
        status: "ready",
        mode,
        manifest,
        categoryId: catId,
        graphId: gId,
        graph,
      });
    },
    [repositories]
  );

  useEffect(() => {
    (async () => {
      try {
        const loggedIn = isLoggedInToAppwrite();
        const preferredMode = loadRepositoryModePreference();
        const mode: RepositoryMode = loggedIn ? preferredMode : "file";

        if (!loggedIn && preferredMode !== "file") {
          saveRepositoryModePreference("file");
        }

        await initializeFromRepository(mode, loadLastViewed() ?? undefined);
      } catch (err) {
        setState({
          status: "error",
          message: (err as Error).message,
        });
      }
    })();
  }, [initializeFromRepository]);

  const switchGraph = useCallback(
    async (
      mode: RepositoryMode,
      manifest: Manifest,
      catId: string,
      gId: string
    ) => {
      const repo = repositories[mode];
      setState({ status: "loading" });
      try {
        const graph = await repo.loadGraph(catId, gId);
        saveLastViewed({ categoryId: catId, graphId: gId });
        setSelectedNode(null);
        setSearchQuery("");
        setState({
          status: "ready",
          mode,
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
    [repositories]
  );

  const handleModeChange = useCallback(
    async (mode: RepositoryMode) => {
      if (mode === "appwrite" && !isLoggedInToAppwrite()) {
        alert("Please log in before switching to Cloud / Appwrite mode.");
        return;
      }
      saveRepositoryModePreference(mode);
      setState({ status: "loading" });
      try {
        await initializeFromRepository(mode, loadLastViewed() ?? undefined);
      } catch (err) {
        setState({ status: "error", message: (err as Error).message });
      }
    },
    [initializeFromRepository]
  );

  const handleCategoryChange = useCallback(
    (newCatId: string) => {
      if (state.status !== "ready") return;
      const cat = state.manifest.categories.find((c) => c.id === newCatId);
      if (!cat || cat.graphs.length === 0) return;
      switchGraph(state.mode, state.manifest, newCatId, cat.graphs[0].id);
    },
    [state, switchGraph]
  );

  const handleGraphChange = useCallback(
    (newGraphId: string) => {
      if (state.status !== "ready") return;
      switchGraph(state.mode, state.manifest, state.categoryId, newGraphId);
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
      if (state.status !== "ready") return;
      const newNode = new KnowledgeNode(updated);
      const newNodes = state.graph.nodes.map((n) =>
        n.id === updated.id ? newNode : n
      );
      const newGraph = rebuildGraph(newNodes);

      try {
        await repositories[state.mode].saveGraph(
          state.categoryId,
          state.graphId,
          newGraph
        );
        setState({ ...state, graph: newGraph });
        setSelectedNode(newNode);
      } catch (error) {
        alert((error as Error).message);
      }
    },
    [repositories, state]
  );

  const handleMoveGraph = useCallback(
    async (targetCategoryId: string) => {
      if (state.status !== "ready") return;
      try {
        await repositories[state.mode].saveGraph(
          targetCategoryId,
          state.graphId,
          state.graph
        );

        if (state.mode === "file") {
          alert(
            `graph.json has been downloaded.\n\n` +
              `To complete the move:\n` +
              `1. Move the folder graph-data/${state.categoryId}/${state.graphId}/ ` +
              `to graph-data/${targetCategoryId}/${state.graphId}/\n` +
              `2. Commit and redeploy.`
          );
        } else {
          alert(
            `Saved '${state.graphId}' to cloud category '${targetCategoryId}'.`
          );
        }
      } catch (error) {
        alert((error as Error).message);
      }
    },
    [repositories, state]
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
        message:
          state.mode === "appwrite"
            ? "All cloud graphs are removed from view. Save a new graph to continue."
            : "All graphs have been removed. Add data to graph-data/ and redeploy.",
      });
      if (state.mode === "file") {
        alert(
          `To permanently delete this graph, remove the folder:\n` +
            `graph-data/${categoryId}/${graphId}/\n` +
            `Then commit and redeploy.`
        );
      }
      return;
    }

    const newCat =
      newCategories.find((c) => c.id === categoryId) ?? newCategories[0];
    const newGraphId = newCat.graphs[0].id;

    if (state.mode === "file") {
      alert(
        `Graph removed from view.\n\n` +
          `To permanently delete, remove the folder:\n` +
          `graph-data/${categoryId}/${graphId}/\n` +
          `Then commit and redeploy.`
      );
    }

    switchGraph(state.mode, newManifest, newCat.id, newGraphId);
  }, [state, switchGraph]);

  if (state.status === "loading") {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Loading knowledge graph…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return <ErrorDisplay error={state.message} />;
  }

  const { mode, manifest, categoryId, graphId, graph } = state;
  const appwriteLoggedIn = isLoggedInToAppwrite();

  return (
    <div className="app-shell">
      <div className="toolbar">
        <div className="repo-mode-block">
          <div className="repo-mode-badge">{modeDisplayText[mode]}</div>
          <select
            className="selector-dropdown repo-mode-select"
            value={mode}
            onChange={(e) => handleModeChange(e.target.value as RepositoryMode)}
            disabled={!appwriteLoggedIn}
            title={
              appwriteLoggedIn
                ? "Switch data source mode"
                : "Log in to enable Cloud / Appwrite mode"
            }
          >
            <option value="file">file</option>
            <option value="appwrite">appwrite</option>
          </select>
        </div>

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
          onMove={handleMoveGraph}
          onDelete={handleDeleteGraph}
        />
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
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
