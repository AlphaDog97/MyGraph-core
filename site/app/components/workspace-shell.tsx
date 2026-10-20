"use client";

import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Core } from "cytoscape";
import {
  App as AntdApp,
  ConfigProvider,
  Layout,
  message,
  theme as antdTheme,
} from "antd";
import GraphCanvas from "@/original-ui/components/GraphCanvas";
import TagLegend from "@/original-ui/components/TagLegend";
import EdgeTypeLegend from "@/original-ui/components/EdgeTypeLegend";
import TagColorEditor from "@/original-ui/components/TagColorEditor";
import Overview3DCanvas from "@/original-ui/components/Overview3DCanvas";
import { loadTagColors, saveTagColors } from "@/original-ui/data/tagStorage";
import type { KnowledgeNode, TagColorAssignment } from "@/original-ui/domain/types";
import type { SignedInUser } from "@/app/lib/auth";
import type { GraphDetail, WorkspaceSnapshot } from "@/app/lib/types";
import { CategoryGraphDialog } from "./category-graph-dialog";
import { DeleteDialog } from "./delete-dialog";
import { EdgeDialog } from "./edge-dialog";
import { NodeDialog } from "./node-dialog";
import { findOwningDetail, toKnowledgeGraph } from "./original-workspace/graph-adapter";
import { SiteNodeDrawer } from "./original-workspace/site-node-drawer";
import { WorkspaceToolbar } from "./original-workspace/workspace-toolbar";
import { useOriginalWorkspace } from "./original-workspace/use-original-workspace";
import { GraphImportDialog } from "./original-workspace/graph-import-dialog";
import "@/original-ui/styles.css";
import "./original-workspace/site-workspace.css";

type Theme = "light" | "dark";
type ViewMode = "category" | "overview3d";
type LegendState = { tagsOpen: boolean; relationsOpen: boolean };

const THEME_STORAGE_KEY = "mygraph-theme";
const LEGEND_STATE_STORAGE_KEY = "mygraph-legend-state";
const OVERLAY_Z_INDEX = { legends: 30, detailDrawer: 40 } as const;

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function WorkspaceShell({
  user,
  initialWorkspace,
  initialDetails,
}: {
  user: SignedInUser;
  initialWorkspace: WorkspaceSnapshot;
  initialDetails: GraphDetail[];
}) {
  return (
    <AntdApp>
      <OriginalWorkspace
        user={user}
        initialWorkspace={initialWorkspace}
        initialDetails={initialDetails}
      />
    </AntdApp>
  );
}

function OriginalWorkspace({
  user,
  initialWorkspace,
  initialDetails,
}: {
  user: SignedInUser;
  initialWorkspace: WorkspaceSnapshot;
  initialDetails: GraphDetail[];
}) {
  const controller = useOriginalWorkspace(initialWorkspace, initialDetails);
  // Match server markup during hydration; restore browser preferences before mounting the canvas.
  const [theme, setTheme] = useState<Theme>("light");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("category");
  const [overviewDetails, setOverviewDetails] = useState<GraphDetail[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [tagColors, setTagColors] = useState<TagColorAssignment>({});
  const [legendState, setLegendState] = useState<LegendState>({ tagsOpen: true, relationsOpen: true });
  useEffect(() => {
    setTheme(getInitialTheme());
    setTagColors(loadTagColors());
    try {
      const stored = window.localStorage.getItem(LEGEND_STATE_STORAGE_KEY);
      if (stored) setLegendState({ tagsOpen: true, relationsOpen: true, ...JSON.parse(stored) });
    } catch {
      // Keep the default legends if browser storage is unavailable or invalid.
    }
    setPreferencesLoaded(true);
  }, []);
  const cyRef = useRef<Core | null>(null);

  const graph = useMemo(
    () => toKnowledgeGraph(controller.visibleDetails),
    [controller.visibleDetails],
  );
  const overviewGraph = useMemo(
    () => toKnowledgeGraph(overviewDetails.length ? overviewDetails : controller.visibleDetails),
    [controller.visibleDetails, overviewDetails],
  );
  const selectedDetail = controller.selectedNode
    ? findOwningDetail(controller.allDetails, controller.selectedNode.id)
    : undefined;
  const dialogDetail = controller.edgeDialog?.edge
    ? controller.allDetails.find((detail) =>
        detail.edges.some((edge) => edge.id === controller.edgeDialog?.edge?.id),
      )
    : selectedDetail ?? controller.visibleDetails[0];

  useEffect(() => {
    if (!preferencesLoaded) return;
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [preferencesLoaded, theme]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    window.localStorage.setItem(LEGEND_STATE_STORAGE_KEY, JSON.stringify(legendState));
  }, [legendState, preferencesLoaded]);

  const report = useCallback((action: Promise<unknown>) => {
    void action.catch((error) =>
      message.error(error instanceof Error ? error.message : "加载失败"),
    );
  }, []);

  const handleViewModeToggle = useCallback(() => {
    if (viewMode === "overview3d") {
      setViewMode("category");
      controller.setSelectedNodeId(undefined);
      return;
    }
    report(
      controller.loadOverview().then((details) => {
        setOverviewDetails(details);
        setViewMode("overview3d");
        controller.setSelectedNodeId(undefined);
      }),
    );
  }, [controller, report, viewMode]);

  const handleResetView = useCallback(() => {
    controller.setFocusedGraphId("");
    cyRef.current?.animate({
      fit: { eles: cyRef.current.elements(), padding: 40 },
      duration: prefersReducedMotion() ? 0 : 400,
    });
  }, [controller]);

  const handleTagColorChange = useCallback((tag: string, color: string | undefined) => {
    setTagColors((current) => {
      const next = { ...current };
      if (color) next[tag] = color;
      else delete next[tag];
      saveTagColors(next);
      return next;
    });
  }, []);

  const handleNodeSelect = useCallback(
    (node: KnowledgeNode | null) => controller.setSelectedNodeId(node?.id),
    [controller.setSelectedNodeId],
  );

  const deleteLabel = controller.deleteTarget
    ? "label" in controller.deleteTarget.item
      ? controller.deleteTarget.item.label
      : "所选内容"
    : "";

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
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
      <Layout className="app-layout original-site-workspace">
        <WorkspaceToolbar
          user={user} controller={controller} theme={theme} viewMode={viewMode}
          onToggleTheme={() => setTheme((current) => current === "light" ? "dark" : "light")}
          onToggleView={handleViewModeToggle} onResetView={handleResetView}
          onImport={() => { setViewMode("category"); setImportOpen(true); }}
          onEditColors={() => setEditorOpen(true)} report={report}
        />

        <Layout.Content
          className="app-content"
          style={
            {
              "--overlay-z-legends": OVERLAY_Z_INDEX.legends,
              "--overlay-z-detail": OVERLAY_Z_INDEX.detailDrawer,
            } as CSSProperties
          }
        >
          {viewMode === "category" ? (
            <>
              <div className="graph-canvas-layer">
                {preferencesLoaded ? <GraphCanvas
                  graph={graph}
                  focusedGraphId={controller.focusedGraphId || null}
                  tagColors={tagColors}
                  searchQuery={controller.search}
                  theme={theme}
                  cyRef={cyRef}
                  onNodeSelect={handleNodeSelect}
                /> : null}
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
            <Overview3DCanvas graph={overviewGraph} theme={theme} onNodeSelect={handleNodeSelect} />
          )}

          {controller.selectedNode && selectedDetail ? (
            <SiteNodeDrawer
              node={controller.selectedNode}
              detail={selectedDetail}
              onClose={() => controller.setSelectedNodeId(undefined)}
              onEditNode={controller.setNodeDialog}
              onDeleteNode={(item) => controller.setDeleteTarget({ kind: "node", item })}
              onCreateEdge={(preferredSourceId) => controller.setEdgeDialog({ preferredSourceId })}
              onEditEdge={(edge) => controller.setEdgeDialog({ edge })}
              onDeleteEdge={(item) => controller.setDeleteTarget({ kind: "edge", item })}
              onSelectNode={(node) => controller.setSelectedNodeId(node.id)}
            />
          ) : null}
        </Layout.Content>

        {graph.warnings.length ? (
          <div className="warnings-bar">
            {graph.warnings.map((warning) => (
              <span key={warning} className="warning-item">⚠ {warning}</span>
            ))}
          </div>
        ) : null}

        {editorOpen ? (
          <TagColorEditor
            tags={graph.tags}
            tagColors={tagColors}
            onChange={handleTagColorChange}
            onClose={() => setEditorOpen(false)}
          />
        ) : null}

        {importOpen ? <GraphImportDialog
          categoryId={controller.categoryId}
          categories={controller.workspace.categories}
          onClose={() => setImportOpen(false)}
          onImported={controller.showImportedGraphs}
        /> : null}
        <CategoryGraphDialog
          open={Boolean(controller.entityDialog)}
          kind={controller.entityDialog?.kind ?? "category"}
          mode={controller.entityDialog?.mode ?? "create"}
          initial={controller.entityDialog?.item}
          busy={controller.busy}
          onOpenChange={(open) => !open && controller.setEntityDialog(null)}
          onSubmit={controller.saveEntity}
        />
        <NodeDialog
          open={controller.nodeDialog !== undefined}
          node={controller.nodeDialog}
          busy={controller.busy}
          onOpenChange={(open) => !open && controller.setNodeDialog(undefined)}
          onSubmit={controller.saveNode}
        />
        <EdgeDialog
          open={Boolean(controller.edgeDialog)}
          edge={controller.edgeDialog?.edge}
          preferredSourceId={controller.edgeDialog?.preferredSourceId}
          nodes={dialogDetail?.nodes ?? []}
          busy={controller.busy}
          onOpenChange={(open) => !open && controller.setEdgeDialog(null)}
          onSubmit={controller.saveEdge}
        />
        <DeleteDialog
          open={Boolean(controller.deleteTarget)}
          title={`删除“${deleteLabel}”？`}
          description={
            controller.deleteTarget?.kind === "category"
              ? "该分类下的图谱、节点和关系都会一并删除，此操作无法撤销。"
              : controller.deleteTarget?.kind === "graph"
                ? "图谱中的全部节点和关系都会一并删除，此操作无法撤销。"
                : controller.deleteTarget?.kind === "node"
                  ? "与该节点连接的关系也会被删除，此操作无法撤销。"
                  : "这条关系将被永久删除。"
          }
          busy={controller.busy}
          onOpenChange={(open) => !open && controller.setDeleteTarget(null)}
          onConfirm={controller.confirmDelete}
        />
      </Layout>
    </ConfigProvider>
  );
}
