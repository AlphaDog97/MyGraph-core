import { useState, useEffect, useRef, useCallback } from "react";
import { Core } from "cytoscape";
import {
  KnowledgeNode,
  KnowledgeNodeFile,
  KnowledgeGraph,
  TagColorAssignment,
} from "./domain/types";
import { loadKnowledgeGraph } from "./data/loader";
import { loadTagColors, saveTagColors } from "./data/tagStorage";
import GraphCanvas from "./components/GraphCanvas";
import SearchBar from "./components/SearchBar";
import TagLegend from "./components/TagLegend";
import TagColorEditor from "./components/TagColorEditor";
import NodeDetailPanel from "./components/NodeDetailPanel";
import ErrorDisplay from "./components/ErrorDisplay";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; graph: KnowledgeGraph };

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [tagColors, setTagColors] = useState<TagColorAssignment>(loadTagColors);
  const [searchQuery, setSearchQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    loadKnowledgeGraph()
      .then((graph) => setLoadState({ status: "ready", graph }))
      .catch((err: Error) =>
        setLoadState({ status: "error", message: err.message })
      );
  }, []);

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
      const json = JSON.stringify(updated, null, 2);
      const blob = new Blob([json + "\n"], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${updated.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (loadState.status === "ready") {
        const newNode = new KnowledgeNode(updated);
        const newNodes = loadState.graph.nodes.map((n) =>
          n.id === updated.id ? newNode : n
        );

        const tagSet = new Set<string>();
        for (const n of newNodes) {
          for (const t of n.tags) tagSet.add(t);
        }

        const seenIds = new Set(newNodes.map((n) => n.id));
        const warnings: string[] = [];
        const edges = newNodes.flatMap((n) =>
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

        setLoadState({
          status: "ready",
          graph: {
            nodes: newNodes,
            edges,
            tags: [...tagSet].sort(),
            warnings,
          },
        });
        setSelectedNode(newNode);
      }
    },
    [loadState]
  );

  if (loadState.status === "loading") {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Loading knowledge graph…</p>
      </div>
    );
  }

  if (loadState.status === "error") {
    return <ErrorDisplay error={loadState.message} />;
  }

  const { graph } = loadState;

  return (
    <div className="app-shell">
      <div className="toolbar">
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
