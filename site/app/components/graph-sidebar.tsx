"use client";

import {
  ChevronRight,
  Ellipsis,
  FolderPlus,
  Network,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { CategorySummary, GraphSummary } from "@/app/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GraphSidebarProps {
  categories: CategorySummary[];
  graphs: GraphSummary[];
  selectedGraphId?: string;
  onSelectGraph: (graph: GraphSummary) => void;
  onCreateCategory: () => void;
  onEditCategory: (category: CategorySummary) => void;
  onDeleteCategory: (category: CategorySummary) => void;
  onCreateGraph: (category: CategorySummary) => void;
  onEditGraph: (graph: GraphSummary) => void;
  onDeleteGraph: (graph: GraphSummary) => void;
}

export function GraphSidebar({
  categories,
  graphs,
  selectedGraphId,
  onSelectGraph,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  onCreateGraph,
  onEditGraph,
  onDeleteGraph,
}: GraphSidebarProps) {
  return (
    <aside className="graph-sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark"><Network /></div>
        <div>
          <p className="brand-name">MyGraph</p>
          <p className="brand-caption">Knowledge workspace</p>
        </div>
      </div>

      <div className="sidebar-heading">
        <span>知识库</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCreateCategory}
          aria-label="新建分类"
          title="新建分类"
        >
          <FolderPlus />
        </Button>
      </div>

      <nav className="sidebar-scroll" aria-label="知识图谱分类">
        {categories.map((category) => {
          const categoryGraphs = graphs.filter(
            (graph) => graph.categoryId === category.id,
          );
          return (
            <section key={category.id} className="category-block">
              <div className="category-row">
                <div className="category-title">
                  <ChevronRight className="size-3.5 rotate-90 text-slate-500" />
                  <span>{category.label}</span>
                  <small>{category.graphCount}</small>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`${category.label} 操作`}
                    >
                      <Ellipsis />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onCreateGraph(category)}>
                      <Plus /> 新建图谱
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditCategory(category)}>
                      <Pencil /> 编辑分类
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDeleteCategory(category)}
                    >
                      <Trash2 /> 删除分类
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="graph-list">
                {categoryGraphs.map((graph) => (
                  <div
                    key={graph.id}
                    className={`graph-row ${selectedGraphId === graph.id ? "is-active" : ""}`}
                  >
                    <button
                      type="button"
                      className="graph-select"
                      onClick={() => onSelectGraph(graph)}
                    >
                      <Network />
                      <span>{graph.label}</span>
                      <small>{graph.nodeCount}</small>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`${graph.label} 操作`}
                        >
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditGraph(graph)}>
                          <Pencil /> 编辑图谱
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDeleteGraph(graph)}
                        >
                          <Trash2 /> 删除图谱
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
                {categoryGraphs.length === 0 ? (
                  <button
                    type="button"
                    className="empty-graph-link"
                    onClick={() => onCreateGraph(category)}
                  >
                    <Plus /> 添加第一个图谱
                  </button>
                ) : null}
              </div>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}

