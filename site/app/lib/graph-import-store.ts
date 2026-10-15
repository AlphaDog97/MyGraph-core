import type { ImportDocument } from "./graph-import";
import { RequestError } from "./route-utils";

/** One D1 batch commits the complete import or rolls back all of it. */
export async function saveGraphImport(db: D1Database, categoryId: string, document: ImportDocument) {
  const category = await db.prepare("SELECT id FROM categories WHERE id = ?").bind(categoryId).first();
  if (!category) throw new RequestError("所选分类不存在，请重新选择", 404);
  const statements: D1PreparedStatement[] = [];
  const graphIds: string[] = [];
  for (const graph of document.graphs) {
    const id = `graph:${crypto.randomUUID()}`;
    // Every import creates a new graph, including imports with an existing name/slug.
    const slug = `${graph.graphId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60) || "import"}-${id.slice(6)}`;
    graphIds.push(id);
    statements.push(db.prepare(
      "INSERT INTO graphs (id, category_id, slug, label) VALUES (?, ?, ?, ?)",
    ).bind(id, categoryId, slug, graph.graphLabel));
    const nodeIds = new Map(graph.nodes.map((node) => [node.id, `node:${crypto.randomUUID()}`]));
    for (const node of graph.nodes) {
      statements.push(db.prepare(
        "INSERT INTO nodes (id, graph_id, node_key, label, description, tags, global_concept_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).bind(nodeIds.get(node.id)!, id, node.id, node.label, node.description ?? "",
        JSON.stringify(node.tags), node.globalConceptId ?? null));
    }
    for (const node of graph.nodes) {
      for (const link of node.links ?? []) {
        statements.push(db.prepare(
          "INSERT INTO edges (id, graph_id, source_node_id, target_node_id, type, label) VALUES (?, ?, ?, ?, ?, ?)",
        ).bind(`edge:${crypto.randomUUID()}`, id, nodeIds.get(node.id)!, nodeIds.get(link.target)!,
          link.type, link.label ?? ""));
      }
    }
  }
  await db.batch(statements);
  return { categoryId, graphIds, graphCount: graphIds.length, nodeCount: document.nodeCount, edgeCount: document.edgeCount };
}
