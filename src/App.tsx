import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { Core } from "cytoscape";
import {
  Manifest,
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeNodeFile,
  TagColorAssignment,
} from "./domain/types";
import {
  loadAllGraphsAsKnowledgeGraph,
  loadManifest,
  parseInlineGraphJson,
  ParsedInlineSource,
} from "./data/loader";
import {
  buildInlineCategoryBundle,
  buildInlineOverview,
  loadLocalCategoryBundle,
  type CategoryGraphBundle,
} from "./data/categoryBundle";
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
import Overview3DCanvas from "./components/Overview3DCanvas";
import {
  Button,
  ConfigProvider,
  Dropdown,
  Flex,
  Grid,
  Layout,
  Spin,
  Switch,
  theme as antdTheme,
  Typography,
} from "antd";
import {
  EllipsisOutlined,
  GithubOutlined,
  MoonOutlined,
  SunOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

interface ReadyState {
  status: "ready";
  manifest: Manifest;
  graphOptions: CategoryGraphBundle["graphOptions"];
  categoryId: string;
  graphId: string;
  graph: KnowledgeGraph;
  sourceGraphs: Record<string, KnowledgeGraph>;
  overviewGraph: KnowledgeGraph;
}

type AppState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | ReadyState;

type Theme = "light" | "dark";
type DataSourceMode = "local" | "inline";
type LegendState = { tagsOpen: boolean; relationsOpen: boolean };
type ViewMode = "category" | "overview3d";
type InlineLoadState =
  | { status: "ready" }
  | { status: "loading" }
  | { status: "error"; message: string };

const THEME_STORAGE_KEY = "mygraph-theme";
const INLINE_JSON_STORAGE_KEY = "mygraph-inline-json";
const LEGEND_STATE_STORAGE_KEY = "mygraph-legend-state";
const OVERLAY_Z_INDEX = {
  inlineDrawer: 20,
  legends: 30,
  detailDrawer: 40,
} as const;

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

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function downloadGraphJson(graph: KnowledgeGraph) {
  const raw: KnowledgeNodeFile[] = graph.nodes.map((node) => {
    const output: KnowledgeNodeFile = {
      id: node.id,
      label: node.label,
      tags: node.tags,
    };
    if (node.description) output.description = node.description;
    if (node.globalConceptId) output.globalConceptId = node.globalConceptId;
    if (node.links.length > 0) {
      output.links = node.links.map((link) => ({
        target: link.target,
        type: link.type,
        ...(link.label ? { label: link.label } : {}),
      }));
    }
    return output;
  });

  const blob = new Blob([`${JSON.stringify(raw, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "graph.json";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function resolveInitialFocus(
  categoryId: string,
  graphOptions: ReadyState["graphOptions"]
): string {
  const lastViewed = loadLastViewed();
  if (!lastViewed || lastViewed.categoryId !== categoryId) return "";
  return graphOptions.some((graph) => graph.id === lastViewed.graphId)
    ? lastViewed.graphId
    : "";
}

export default function App() {
  const screens = Grid.useBreakpoint();
  const [state, setState] = useState<AppState>({ status: "loading" });
  const [tagColors, setTagColors] = useState<TagColorAssignment>(loadTagColors);
  const [searchQuery, setSearchQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [inlineLoadState, setInlineLoadState] = useState<InlineLoadState>({
    status: "ready",
  });
  const [dataSourceMode, setDataSourceMode] =
    useState<DataSourceMode>("local");
  const [viewMode, setViewMode] = useState<ViewMode>("category");
  const [inlineSource, setInlineSource] =
    useState<ParsedInlineSource | null>(null);
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
    if (typeof window === "undefined") {
      return { tagsOpen: true, relationsOpen: true };
    }
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
  const overviewGraphRef = useRef<KnowledgeGraph | null>(null);

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
    window.localStorage.setItem(
      LEGEND_STATE_STORAGE_KEY,
      JSON.stringify(legendState)
    );
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
    if (dataSourceMode !== "local") return;
    let cancelled = false;

    void (async () => {
      try {
        const manifest = await loadManifest();
        if (manifest.categories.length === 0) {
          throw new Error("No categories found in graph-data/.");
        }

        const lastViewed = loadLastViewed();
        const categoryId =
          manifest.categories.find(
            (category) => category.id === lastViewed?.categoryId
          )?.id ?? manifest.categories[0].id;
        const [bundle, overviewGraph] = await Promise.all([
          loadLocalCategoryBundle(manifest, categoryId),
          loadAllGraphsAsKnowledgeGraph(manifest),
        ]);
        if (cancelled) return;

        const graphId = resolveInitialFocus(categoryId, bundle.graphOptions);
        overviewGraphRef.current = overviewGraph;
        saveLastViewed({ categoryId, graphId });
        setState({
          status: "ready",
          manifest,
          graphOptions: bundle.graphOptions,
          categoryId,
          graphId,
          graph: bundle.graph,
          sourceGraphs: bundle.sourceGraphs,
          overviewGraph,
        });
      } catch (error) {
        if (cancelled) return;
        setState({ status: "error", message: (error as Error).message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dataSourceMode]);

  const loadCategoryBundle = useCallback(
    async (manifest: Manifest, categoryId: string) => {
      if (dataSourceMode === "inline") {
        if (!inlineSource) {
          throw new Error("Inline source is not available.");
        }
        return buildInlineCategoryBundle(inlineSource, categoryId);
      }
      return loadLocalCategoryBundle(manifest, categoryId);
    },
    [dataSourceMode, inlineSource]
  );

  const switchCategory = useCallback(
    async (manifest: Manifest, categoryId: string, graphId = "") => {
      setState({ status: "loading" });
      try {
        const bundle = await loadCategoryBundle(manifest, categoryId);
        const focusedGraphId = bundle.graphOptions.some(
          (graph) => graph.id === graphId
        )
          ? graphId
          : "";
        saveLastViewed({ categoryId, graphId: focusedGraphId });
        setSelectedNode(null);
        setSearchQuery("");
        setState({
          status: "ready",
          manifest,
          graphOptions: bundle.graphOptions,
          categoryId,
          graphId: focusedGraphId,
          graph: bundle.graph,
          sourceGraphs: bundle.sourceGraphs,
          overviewGraph: overviewGraphRef.current ?? bundle.graph,
        });
      } catch (error) {
        setState({ status: "error", message: (error as Error).message });
      }
    },
    [loadCategoryBundle]
  );

  const handleCategoryChange = useCallback(
    (newCategoryId: string) => {
      if (state.status !== "ready") return;
      if (!state.manifest.categories.some((item) => item.id === newCategoryId)) {
        return;
      }
      void switchCategory(state.manifest, newCategoryId);
    },
    [state, switchCategory]
  );

  const handleGraphChange = useCallback(
    (newGraphId: string) => {
      if (state.status !== "ready") return;
      if (newGraphId && !state.sourceGraphs[newGraphId]) return;

      saveLastViewed({ categoryId: state.categoryId, graphId: newGraphId });
      setSelectedNode(null);
      setSearchQuery("");
      setState({ ...state, graphId: newGraphId });
    },
    [state]
  );

  const handleResetView = useCallback(() => {
    if (state.status === "ready" && state.graphId) {
      saveLastViewed({ categoryId: state.categoryId, graphId: "" });
      setState({ ...state, graphId: "" });
    }
    cyRef.current?.animate({
      fit: { eles: cyRef.current.elements(), padding: 40 },
      duration: prefersReducedMotion() ? 0 : 400,
    });
  }, [state]);

  const handleTagColorChange = useCallback(
    (tag: string, color: string | undefined) => {
      setTagColors((current) => {
        const next = { ...current };
        if (color) next[tag] = color;
        else delete next[tag];
        saveTagColors(next);
        return next;
      });
    },
    []
  );

  const handleNodeSelect = useCallback((node: KnowledgeNode | null) => {
    setSelectedNode(node);
  }, []);

  const handleViewModeToggle = useCallback(() => {
    setViewMode((current) =>
      current === "category" ? "overview3d" : "category"
    );
    setSelectedNode(null);
  }, []);

  const handleThemeToggle = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
    setIsThemeOverridden(true);
  }, []);

  const handleInlineGraphLoad = useCallback(
    (rawText: string) => {
      if (state.status !== "ready") return;
      setInlineLoadState({ status: "loading" });
      try {
        const parsed = parseInlineGraphJson(rawText);
        const firstCategory = parsed.manifestLike.categories[0];
        if (!firstCategory) throw new Error("nodes must be an array");

        const bundle = buildInlineCategoryBundle(parsed, firstCategory.id);
        const overviewGraph = buildInlineOverview(parsed);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(INLINE_JSON_STORAGE_KEY, rawText);
        }

        setInlineInitialText(rawText);
        setInlineSource(parsed);
        setDataSourceMode("inline");
        overviewGraphRef.current = overviewGraph;
        saveLastViewed({ categoryId: firstCategory.id, graphId: "" });
        setState({
          status: "ready",
          manifest: parsed.manifestLike,
          graphOptions: bundle.graphOptions,
          categoryId: firstCategory.id,
          graphId: "",
          graph: bundle.graph,
          sourceGraphs: bundle.sourceGraphs,
          overviewGraph,
        });
        setSearchQuery("");
        setSelectedNode(null);
        setInlineLoadState({ status: "ready" });
      } catch (error) {
        setInlineLoadState({
          status: "error",
          message: (error as Error).message,
        });
      }
    },
    [state.status]
  );

  const handleMoveGraph = useCallback(
    (targetCategoryId: string) => {
      if (state.status !== "ready" || !state.graphId) return;
      const selectedGraph = state.sourceGraphs[state.graphId];
      if (!selectedGraph) return;

      downloadGraphJson(selectedGraph);
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
    if (state.status !== "ready" || !state.graphId) return;
    const { manifest, categoryId, graphId } = state;
    const categories = manifest.categories
      .map((category) =>
        category.id === categoryId
          ? {
              ...category,
              graphs: category.graphs.filter((graph) => graph.id !== graphId),
            }
          : category
      )
      .filter((category) => category.graphs.length > 0);

    if (categories.length === 0) {
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

    const newManifest: Manifest = { categories };
    const nextCategory =
      categories.find((category) => category.id === categoryId) ?? categories[0];
    alert(
      `Graph removed from view.\n\n` +
        `To permanently delete, remove it from:\n` +
        `graph-data/${categoryId}/graph.json\n` +
        `Then commit and redeploy.`
    );
    void switchCategory(newManifest, nextCategory.id);
  }, [state, switchCategory]);

  const handleNodeSave = useCallback(() => undefined, []);

  if (state.status === "loading") {
    return (
      <div className="app-loading">
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

  const {
    manifest,
    graphOptions,
    categoryId,
    graphId,
    graph,
    sourceGraphs,
    overviewGraph,
  } = state;
  const categoryOptions = manifest.categories.map((category) => ({
    ...category,
    graphs: [],
  }));
  const toolbarControlSize = screens.md ? "middle" : "small";
  const isCompactToolbar = !screens.lg;
  const hasSelectedGraph = Boolean(graphId && sourceGraphs[graphId]);
  const compactActionItems: MenuProps["items"] = [
    {
      key: "inline-json",
      label: "JSON加载",
      onClick: () => setIsInlineDrawerOpen((current) => !current),
    },
    {
      key: "fit-view",
      label: "显示全部图谱",
      onClick: handleResetView,
    },
    {
      key: "edit-tag-colors",
      label: "Edit tag colors",
      onClick: () => setEditorOpen(true),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm:
          theme === "dark"
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#5a67d8",
          borderRadius: 8,
          colorBorder: theme === "dark" ? "#4b5563" : "#d9dce3",
          colorText: theme === "dark" ? "#e5e7eb" : "#2d3748",
          colorTextSecondary: theme === "dark" ? "#9ca3af" : "#667085",
          colorBgContainer: theme === "dark" ? "#1f2937" : "#ffffff",
        },
      }}
    >
      <Layout className="app-layout">
        <Flex className="top-toolbar" align="center" gap={12} wrap>
          <Flex className="toolbar-group toolbar-group--data" align="center" gap={8}>
            <GraphSelector
              categories={categoryOptions}
              graphs={graphOptions}
              categoryId={categoryId}
              graphId={graphId}
              onCategoryChange={handleCategoryChange}
              onGraphChange={handleGraphChange}
              size={toolbarControlSize}
              showGraphSelect={viewMode === "category"}
            />
          </Flex>

          {viewMode === "category" && (
            <Flex className="toolbar-group toolbar-group--search" align="center" gap={8}>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                size={toolbarControlSize}
              />
            </Flex>
          )}

          {viewMode === "category" && (
            <Flex
              className="toolbar-group toolbar-group--graph-actions"
              align="center"
              gap={8}
            >
              {hasSelectedGraph && (
                <GraphManagementMenu
                  manifest={manifest}
                  categoryId={categoryId}
                  graphId={graphId}
                  onMove={handleMoveGraph}
                  onDelete={handleDeleteGraph}
                  size={toolbarControlSize}
                />
              )}
              {isCompactToolbar ? (
                <Dropdown menu={{ items: compactActionItems }} trigger={["click"]}>
                  <Button size={toolbarControlSize} icon={<EllipsisOutlined />}>
                    图操作
                  </Button>
                </Dropdown>
              ) : (
                <>
                  <Button
                    size={toolbarControlSize}
                    onClick={() => setIsInlineDrawerOpen((current) => !current)}
                    aria-expanded={isInlineDrawerOpen}
                    aria-controls="inline-loader-drawer"
                  >
                    JSON加载
                  </Button>
                  <Button size={toolbarControlSize} onClick={handleResetView}>
                    显示全部
                  </Button>
                  <Button
                    size={toolbarControlSize}
                    type="primary"
                    onClick={() => setEditorOpen(true)}
                  >
                    Edit tag colors
                  </Button>
                </>
              )}
            </Flex>
          )}

          <Flex className="toolbar-group toolbar-group--global" align="center" gap={8}>
            <Button size={toolbarControlSize} onClick={handleViewModeToggle}>
              {viewMode === "category" ? "3D 总览" : "返回分类图"}
            </Button>
            <Switch
              size="small"
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              checked={theme === "dark"}
              onChange={handleThemeToggle}
              title={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
            />
            <Button
              size={toolbarControlSize}
              icon={<GithubOutlined />}
              href="https://github.com/AlphaDog97/MyGraph-core"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open GitHub repository"
              title="Open GitHub repository"
            />
          </Flex>
        </Flex>

        <Layout.Content
          className="app-content"
          style={
            {
              "--overlay-z-inline": OVERLAY_Z_INDEX.inlineDrawer,
              "--overlay-z-legends": OVERLAY_Z_INDEX.legends,
              "--overlay-z-detail": OVERLAY_Z_INDEX.detailDrawer,
            } as CSSProperties
          }
        >
          {viewMode === "category" ? (
            <>
              <div
                id="inline-loader-drawer"
                className={`inline-loader-drawer${
                  isInlineDrawerOpen ? " is-open" : ""
                }`}
                aria-hidden={!isInlineDrawerOpen}
              >
                <InlineGraphLoader
                  onLoad={handleInlineGraphLoad}
                  initialText={inlineInitialText}
                  isLoading={inlineLoadState.status === "loading"}
                  errorMessage={
                    inlineLoadState.status === "error"
                      ? inlineLoadState.message
                      : null
                  }
                />
              </div>

              <div className="graph-canvas-layer">
                <GraphCanvas
                  graph={graph}
                  focusedGraphId={graphId || null}
                  tagColors={tagColors}
                  searchQuery={searchQuery}
                  theme={theme}
                  cyRef={cyRef}
                  onNodeSelect={handleNodeSelect}
                />
              </div>
              <div className="legend-container">
                <TagLegend
                  tags={graph.tags}
                  tagColors={tagColors}
                  collapsed={!legendState.tagsOpen}
                  onToggle={() =>
                    setLegendState((current) => ({
                      ...current,
                      tagsOpen: !current.tagsOpen,
                    }))
                  }
                />
                <EdgeTypeLegend
                  collapsed={!legendState.relationsOpen}
                  onToggle={() =>
                    setLegendState((current) => ({
                      ...current,
                      relationsOpen: !current.relationsOpen,
                    }))
                  }
                />
              </div>
            </>
          ) : (
            <Overview3DCanvas
              graph={overviewGraph}
              theme={theme}
              onNodeSelect={handleNodeSelect}
            />
          )}

          {selectedNode && (
            <NodeDetailPanel
              node={selectedNode}
              allNodeIds={graph.nodes.map((node) => node.id)}
              zIndex={OVERLAY_Z_INDEX.detailDrawer}
              onClose={() => {
                setSelectedNode(null);
                cyRef.current?.nodes().removeClass("selected-node");
              }}
              onSave={handleNodeSave}
            />
          )}
        </Layout.Content>

        {viewMode === "category" && graph.warnings.length > 0 && (
          <div className="warnings-bar">
            {graph.warnings.map((warning, index) => (
              <Typography.Text key={index} className="warning-item">
                ⚠ {warning}
              </Typography.Text>
            ))}
          </div>
        )}

        {viewMode === "category" && editorOpen && (
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
