import { KnowledgeGraph, KnowledgeNodeFile } from "../domain/types";
import { loadGraphData, loadManifest } from "./loader";
import { GraphRepository, UserGraphRecord } from "./repository";

function downloadGraphJson(graph: KnowledgeGraph) {
  const raw: KnowledgeNodeFile[] = graph.nodes.map((n) => {
    const obj: KnowledgeNodeFile = { id: n.id, label: n.label, tags: n.tags };
    if (n.description) obj.description = n.description;
    if (n.links.length > 0) {
      obj.links = n.links.map((l) => {
        const link: { target: string; type: string; label?: string } = {
          target: l.target,
          type: l.type,
        };
        if (l.label) link.label = l.label;
        return link;
      });
    }
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

export class FileGraphRepository implements GraphRepository {
  readonly mode = "file" as const;

  async loadManifest() {
    return loadManifest();
  }

  async loadGraph(categoryId: string, graphId: string) {
    return loadGraphData(categoryId, graphId);
  }

  async saveGraph(_categoryId: string, _graphId: string, graph: KnowledgeGraph) {
    downloadGraphJson(graph);
  }

  async listUserGraphs(): Promise<UserGraphRecord[]> {
    const manifest = await this.loadManifest();
    return manifest.categories.flatMap((category) =>
      category.graphs.map((graph) => ({
        categoryId: category.id,
        graphId: graph.id,
      }))
    );
  }
}
