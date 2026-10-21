"use client";

import { CompressOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Segmented, Switch, Tooltip } from "antd";
import type { SignedInUser } from "@/app/lib/auth";
import GraphSelector from "@/original-ui/components/GraphSelector";
import SearchBar from "@/original-ui/components/SearchBar";
import { OriginalUserMenu, WorkspaceActions } from "./workspace-actions";
import type { useOriginalWorkspace } from "./use-original-workspace";
import "./workspace-toolbar.css";

interface Props {
  user: SignedInUser;
  controller: ReturnType<typeof useOriginalWorkspace>;
  theme: "light" | "dark";
  viewMode: "category" | "overview3d";
  onToggleTheme: () => void;
  onToggleView: () => void;
  onResetView: () => void;
  onImport: () => void;
  onEditColors: () => void;
  report: (action: Promise<unknown>) => void;
}

export function WorkspaceToolbar({ user, controller, theme, viewMode,
  onToggleTheme, onToggleView, onResetView, onImport, onEditColors, report }: Props) {
  const isCategory = viewMode === "category";
  const category = controller.workspace.categories.find((item) => item.id === controller.categoryId);
  const graph = controller.workspace.graphs.find((item) => item.id === controller.focusedGraphId);

  return (
    <header className={`top-toolbar workspace-toolbar${isCategory ? "" : " workspace-toolbar--overview"}`}
      aria-label="图谱工具栏">
      <div className="workspace-toolbar__location">
        <GraphSelector
          categories={controller.workspace.categories.map((item) => ({ ...item, graphs: [] }))}
          graphs={controller.categoryGraphs.map((item) => ({ id: item.id, label: item.label }))}
          categoryId={controller.categoryId} graphId={controller.focusedGraphId}
          onCategoryChange={(id) => report(controller.loadCategory(id))}
          onGraphChange={(id) => report(controller.focusGraph(id))}
          showGraphSelect={isCategory}
        />
      </div>
      {isCategory ? <div className="workspace-toolbar__search">
        <SearchBar value={controller.search} onChange={controller.setSearch} placeholder="搜索当前分类的节点" />
      </div> : null}
      <div className="workspace-toolbar__tools">
        <Segmented value={viewMode} className="workspace-toolbar__view" aria-label="图谱视图"
          options={[
            { value: "category", label: "2D", title: "分类图" },
            { value: "overview3d", label: "3D", title: "全部图谱 3D 总览" },
          ]}
          onChange={(value) => { if (value !== viewMode) onToggleView(); }}
        />
        {isCategory ? <Tooltip title="显示当前分类的全部图谱">
          <Button icon={<CompressOutlined />} onClick={onResetView}
            className="workspace-toolbar__reset" aria-label="显示全部图谱" />
        </Tooltip> : null}
        <WorkspaceActions category={category} graph={graph}
          onOpenEntity={controller.setEntityDialog} onDelete={controller.setDeleteTarget}
          canCreateNode={isCategory && Boolean(graph)} onCreateNode={() => controller.setNodeDialog(null)}
          onImport={onImport} onEditColors={onEditColors}
        />
        <Tooltip title={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}>
          <Switch size="small" checkedChildren={<MoonOutlined />} unCheckedChildren={<SunOutlined />}
            checked={theme === "dark"} onChange={onToggleTheme} aria-label="深色模式" />
        </Tooltip>
        <OriginalUserMenu user={user} />
      </div>
    </header>
  );
}
