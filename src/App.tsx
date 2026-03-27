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
import GraphCanvas from "./components/GraphCanvas";
import GraphSelector from "./components/GraphSelector";
import GraphManagementMenu from "./components/GraphManagementMenu";
import SearchBar from "./components/SearchBar";
import TagLegend from "./components/TagLegend";
import EdgeTypeLegend from "./components/EdgeTypeLegend";
import TagColorEditor from "./components/TagColorEditor";
import NodeDetailPanel from "./components/NodeDetailPanel";
import ErrorDisplay from "./components/ErrorDisplay";

type GraphOption = { id: string; label: string };
type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "mygraph-theme";

const getSystemTheme = (): Theme =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : getSystemTheme();
};

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

function downloadGraphJson(graph: KnowledgeGraph) {
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
  const [state, setState] = useState<AppState>({ status: "loading" });
  const [tagColors, setTagColors] = useState<TagColorAssignment>(loadTagColors);
  const [searchQuery, setSearchQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isThemeOverridden, setIsThemeOverridden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark";
  });
  const cyRef = useRef<Core | null>(null);

  const resolveGraph = useCallback(
    async (categoryId: string, graphId: string): Promise<KnowledgeGraph> => {
      const localNodes = await loadLocalGraphNodes(categoryId, graphId);
      return buildGraphFromRaw(localNodes, categoryId, graphId);
    },
    []
  );

  const resolveGraphOptions = useCallback(async (categoryId: string) => {
    const graphs = await loadCategoryGraphs(categoryId);
    return graphs.map((graph) => ({
      id: graph.graphId,
      label: graph.graphLabel,
    }));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isThemeOverridden) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      return;
    }
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  }, [theme, isThemeOverridden]);

  useEffect(() => {
    if (typeof window === "undefined" || isThemeOverridden) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", syncTheme);
    return () => mediaQuery.removeEventListener("change", syncTheme);
  }, [isThemeOverridden]);

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

  const handleThemeToggle = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
    setIsThemeOverridden(true);
  }, []);

  const handleNodeSave = useCallback(
    (updated: KnowledgeNodeFile) => {
      if (state.status !== "ready") return;
      const newNode = new KnowledgeNode(updated);
      const newNodes = state.graph.nodes.map((n) =>
        n.id === updated.id ? newNode : n
      );
      const newGraph = rebuildGraph(newNodes);

      downloadGraphJson(newGraph);

      setState({ ...state, graph: newGraph });
      setSelectedNode(newNode);
    },
    [state]
  );

  const handleMoveGraph = useCallback(
    (targetCategoryId: string) => {
      if (state.status !== "ready") return;
      downloadGraphJson(state.graph);
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
        <p>Loading knowledge graph…</p>
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

  return (
    <div className="app-shell">
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
        <div className="toolbar-actions">
          <button
            className="btn btn-secondary"
            onClick={handleThemeToggle}
            aria-label={
              theme === "light"
                ? "Switch to dark mode"
                : "Switch to light mode"
            }
          >
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
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
