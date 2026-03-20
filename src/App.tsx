import { useState, useEffect, useRef, useCallback } from "react";
import { Core } from "cytoscape";
import { KnowledgeGraph, TagColorAssignment } from "./domain/types";
import { loadKnowledgeGraph } from "./data/loader";
import { loadTagColors, saveTagColors } from "./data/tagStorage";
import GraphCanvas from "./components/GraphCanvas";
import SearchBar from "./components/SearchBar";
import TagLegend from "./components/TagLegend";
import TagColorEditor from "./components/TagColorEditor";
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
        <GraphCanvas
          graph={graph}
          tagColors={tagColors}
          searchQuery={searchQuery}
          cyRef={cyRef}
        />
        <TagLegend tags={graph.tags} tagColors={tagColors} />
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
