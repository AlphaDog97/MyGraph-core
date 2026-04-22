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
  parseInlineGraphJson,
  ParsedInlineSource,
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
import InlineGraphLoader from "./components/InlineGraphLoader";
import { Button, ConfigProvider, Flex, Layout, Spin, Switch, theme as antdTheme, Typography } from "antd";
import { GithubOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";

type GraphOption = { id: string; label: string };
type Theme = "light" | "dark";
type DataSourceMode = "local" | "inline";
type LegendState = { tagsOpen: boolean; relationsOpen: boolean };

const THEME_STORAGE_KEY = "mygraph-theme";
const INLINE_JSON_STORAGE_KEY = "mygraph-inline-json";
const LEGEND_STATE_STORAGE_KEY = "mygraph-legend-state";

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

type InlineLoadState =
  | { status: "ready" }
  | { status: "loading" }
  | { status: "error"; message: string };

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
  const [inlineLoadState, setInlineLoadState] = useState<InlineLoadState>({
    status: "ready",
  });
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>("local");
  const [inlineSource, setInlineSource] = useState<ParsedInlineSource | null>(null);
  const [isInlineDrawerOpen, setIsInlineDrawerOpen] = useState(false);
  const [inlineInitialText, setInlineInitialText] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(INLINE_JSON_STORAGE_KEY) ?? "";
  });
  const [isThemeOverridden, setIsThemeOverridden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark";
  });
  const [legendState, setLegendState] = useState<LegendState>(() => {
    if (typeof window === "undefined") return { tagsOpen: true, relationsOpen: true };
    try {
      const stored = window.localStorage.getItem(LEGEND_STATE_STORAGE_KEY);
      if (!stored) return { tagsOpen: true, relationsOpen: true };
      const parsed = JSON.parse(stored) as Partial<LegendState>;
      return {
        tagsOpen: parsed.tagsOpen ?? true,
        relationsOpen: parsed.relationsOpen ?? true,
      };
    } catch {
      return { tagsOpen: true, relationsOpen: true };
    }
  });
  const cyRef = useRef<Core | null>(null);

  const resolveGraph = useCallback(
    async (categoryId: string, graphId: string): Promise<KnowledgeGraph> => {
      if (dataSourceMode === "inline") {
        if (!inlineSource) {
          throw new Error("Inline source is not available.");
        }
        const graphs = inlineSource.categoryGraphs[categoryId];
        if (!graphs) {
          throw new Error(`category '${categoryId}' not found.`);
        }
        const matched = graphs.find((graph) => graph.graphId === graphId);
        if (!matched) {
          throw new Error(`graphId '${graphId}' not found.`);
        }
        return buildGraphFromRaw(matched.nodes, categoryId, graphId);
      }
      const localNodes = await loadLocalGraphNodes(categoryId, graphId);
      return buildGraphFromRaw(localNodes, categoryId, graphId);
    },
    [dataSourceMode, inlineSource]
  );

  const resolveGraphOptions = useCallback(
    async (categoryId: string) => {
      if (dataSourceMode === "inline") {
        const graphs = inlineSource?.categoryGraphs[categoryId];
        if (!graphs) return [];
        return graphs.map((graph) => ({
          id: graph.graphId,
          label: graph.graphLabel,
        }));
      }
      const graphs = await loadCategoryGraphs(categoryId);
      return graphs.map((graph) => ({
        id: graph.graphId,
        label: graph.graphLabel,
      }));
    },
    [dataSourceMode, inlineSource]
  );

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
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LEGEND_STATE_STORAGE_KEY, JSON.stringify(legendState));
  }, [legendState]);

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
    if (dataSourceMode !== "local") {
      return;
    }
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
        setDataSourceMode("local");
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
  }, [dataSourceMode, resolveGraph, resolveGraphOptions]);

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

  const handleInlineGraphLoad = useCallback(
    async (rawText: string) => {
      if (state.status !== "ready") return;
      setInlineLoadState({ status: "loading" });
      try {
        const parsed = parseInlineGraphJson(rawText);
        const firstCategory = parsed.manifestLike.categories[0];
        const firstGraph = firstCategory?.graphs[0];
        if (!firstCategory || !firstGraph) {
          throw new Error("nodes must be an array");
        }
        const graphEntries = parsed.categoryGraphs[firstCategory.id];
        const selected = graphEntries?.find((g) => g.graphId === firstGraph.id);
        if (!selected) {
          throw new Error(`graphId '${firstGraph.id}' not found.`);
        }
        const graph = buildGraphFromRaw(
          selected.nodes,
          firstCategory.id,
          firstGraph.id
        );

        if (typeof window !== "undefined") {
          window.localStorage.setItem(INLINE_JSON_STORAGE_KEY, rawText);
        }
        setInlineInitialText(rawText);
        setInlineSource(parsed);
        setDataSourceMode("inline");
        setState({
          status: "ready",
          manifest: parsed.manifestLike,
          graphOptions: firstCategory.graphs,
          categoryId: firstCategory.id,
          graphId: firstGraph.id,
          graph,
        });
        setSearchQuery("");
        setSelectedNode(null);
        setInlineLoadState({ status: "ready" });
      } catch (error) {
        const message = (error as Error).message;
        setInlineLoadState({ status: "error", message });
      }
    },
    [state]
  );

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
      <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
        <Flex vertical align="center" gap={12}>
          <Spin size="large" />
          <Typography.Text>Loading knowledge graph…</Typography.Text>
        </Flex>
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
    <ConfigProvider
      theme={{
        algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      <Layout style={{ height: "100%", background: "transparent" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "12px 20px",
            borderBottom: "1px solid var(--color-border)",
            backdropFilter: "blur(8px)",
            flexWrap: "wrap",
          }}
        >
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
          <Flex gap={8}>
            <Button
              size="middle"
              onClick={() => setIsInlineDrawerOpen((prev) => !prev)}
              aria-expanded={isInlineDrawerOpen}
              aria-controls="inline-loader-drawer"
            >
              JSON加载
            </Button>
            <Button size="middle" onClick={handleResetView}>
              Fit view
            </Button>
            <Button size="middle" type="primary" onClick={() => setEditorOpen(true)}>
              Edit tag colors
            </Button>
          </Flex>
          <Flex gap={8} style={{ marginLeft: "auto", alignItems: "center" }}>
            <Switch
              size="small"
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              checked={theme === "dark"}
              onChange={handleThemeToggle}
              title={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
            />

            <Button
              size="middle"
              icon={<GithubOutlined />}
              href="https://github.com/AlphaDog97/MyGraph-core"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open GitHub repository"
              title="Open GitHub repository"
            />
          </Flex>
        </div>

        <Layout.Content style={{ flex: 1, position: "relative" }}>
          <div
            id="inline-loader-drawer"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: isInlineDrawerOpen ? 360 : 0,
              overflow: "hidden",
              transition: "width 0.2s ease",
              borderRight: isInlineDrawerOpen ? "1px solid var(--color-border)" : "0",
              background: "var(--color-panel-bg)",
              zIndex: 5,
              padding: isInlineDrawerOpen ? 12 : 0,
            }}
            aria-hidden={!isInlineDrawerOpen}
          >
            <InlineGraphLoader
              onLoad={handleInlineGraphLoad}
              initialText={inlineInitialText}
              isLoading={inlineLoadState.status === "loading"}
              errorMessage={
                inlineLoadState.status === "error" ? inlineLoadState.message : null
              }
            />
          </div>

          <div style={{ position: "absolute", inset: 0 }}>
            <GraphCanvas
              graph={graph}
              tagColors={tagColors}
              searchQuery={searchQuery}
              theme={theme}
              cyRef={cyRef}
              onNodeSelect={handleNodeSelect}
            />
          </div>
          <div
            className="legend-container"
            style={{
              position: "absolute",
              left: 16,
              bottom: 16,
              display: "flex",
              alignItems: "end",
              gap: 12,
              zIndex: 3,
            }}
          >
            <TagLegend
              tags={graph.tags}
              tagColors={tagColors}
              collapsed={!legendState.tagsOpen}
              onToggle={() =>
                setLegendState((prev) => ({ ...prev, tagsOpen: !prev.tagsOpen }))
              }
            />
            <EdgeTypeLegend
              collapsed={!legendState.relationsOpen}
              onToggle={() =>
                setLegendState((prev) => ({
                  ...prev,
                  relationsOpen: !prev.relationsOpen,
                }))
              }
            />
          </div>

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
        </Layout.Content>

        {graph.warnings.length > 0 && (
          <div
            style={{
              padding: 8,
              borderTop: "1px solid var(--color-warning-border)",
              background: "var(--color-warning-bg)",
              display: "flex",
              gap: 16,
              overflowX: "auto",
            }}
          >
            {graph.warnings.map((w, i) => (
              <Typography.Text
                key={i}
                style={{
                  fontSize: 12,
                  color: "var(--color-warning-text)",
                  whiteSpace: "nowrap",
                }}
              >
                ⚠ {w}
              </Typography.Text>
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
      </Layout>
    </ConfigProvider>
  );
}
