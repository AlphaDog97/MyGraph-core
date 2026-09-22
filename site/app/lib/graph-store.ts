import { getD1 } from "@/db";
import { seedGraphs } from "@/data/seed";
import type {
  CategorySummary,
  GraphDetail,
  GraphEdge,
  GraphNode,
  GraphSummary,
  WorkspaceSnapshot,
} from "./types";

interface SeedNode {
  id: string;
  label: string;
  description?: string;
  tags?: string[];
  globalConceptId?: string;
  links?: Array<{ target: string; type: string; label?: string }>;
}

interface SeedGraph {
  categoryId: string;
  categoryLabel: string;
  graphId: string;
  graphLabel: string;
  nodes: SeedNode[];
}

const initialGraphs = seedGraphs as SeedGraph[];

function graphId(categoryId: string, slug: string) {
  return `graph:${categoryId}:${slug}`;
}

function nodeId(parentGraphId: string, nodeKey: string) {
  return `node:${parentGraphId}:${nodeKey}`;
}

async function runInChunks(db: D1Database, statements: D1PreparedStatement[]) {
  for (let index = 0; index < statements.length; index += 50) {
    await db.batch(statements.slice(index, index + 50));
  }
}

export async function ensureInitialData() {
  const db = getD1();
  const marker = await db
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .bind("github_seed_v1")
    .first();

  if (marker) return;

  const categoryMap = new Map(
    initialGraphs.map((graph) => [graph.categoryId, graph.categoryLabel]),
  );
  const categoryStatements = [...categoryMap].map(([id, label]) =>
    db
      .prepare("INSERT OR IGNORE INTO categories (id, label) VALUES (?, ?)")
      .bind(id, label),
  );
  await runInChunks(db, categoryStatements);

  const graphStatements = initialGraphs.map((graph) =>
    db
      .prepare(
        "INSERT OR IGNORE INTO graphs (id, category_id, slug, label) VALUES (?, ?, ?, ?)",
      )
      .bind(
        graphId(graph.categoryId, graph.graphId),
        graph.categoryId,
        graph.graphId,
        graph.graphLabel,
      ),
  );
  await runInChunks(db, graphStatements);

  const nodeStatements = initialGraphs.flatMap((graph) => {
    const parentId = graphId(graph.categoryId, graph.graphId);
    return graph.nodes.map((node) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO nodes (id, graph_id, node_key, label, description, tags, global_concept_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          nodeId(parentId, node.id),
          parentId,
          node.id,
          node.label,
          node.description ?? "",
          JSON.stringify(node.tags ?? []),
          node.globalConceptId ?? null,
        ),
    );
  });
  await runInChunks(db, nodeStatements);

  const edgeStatements: D1PreparedStatement[] = [];
  for (const graph of initialGraphs) {
    const parentId = graphId(graph.categoryId, graph.graphId);
    const validNodeKeys = new Set(graph.nodes.map((node) => node.id));
    let edgeIndex = 0;

    for (const source of graph.nodes) {
      for (const link of source.links ?? []) {
        if (!validNodeKeys.has(link.target)) continue;
        edgeStatements.push(
          db
            .prepare(
              "INSERT OR IGNORE INTO edges (id, graph_id, source_node_id, target_node_id, type, label) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(
              `edge:${parentId}:${edgeIndex++}`,
              parentId,
              nodeId(parentId, source.id),
              nodeId(parentId, link.target),
              link.type,
              link.label ?? "",
            ),
        );
      }
    }
  }
  await runInChunks(db, edgeStatements);
  await db
    .prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)")
    .bind("github_seed_v1", new Date().toISOString())
    .run();
}

export async function listWorkspace(): Promise<WorkspaceSnapshot> {
  await ensureInitialData();
  const db = getD1();

  const [categoryResult, graphResult] = await Promise.all([
    db
      .prepare(
        `SELECT c.id, c.label,
          COUNT(DISTINCT g.id) AS graph_count,
          COUNT(DISTINCT n.id) AS node_count
         FROM categories c
         LEFT JOIN graphs g ON g.category_id = c.id
         LEFT JOIN nodes n ON n.graph_id = g.id
         GROUP BY c.id, c.label
         ORDER BY c.label COLLATE NOCASE`,
      )
      .all(),
    db
      .prepare(
        `SELECT g.id, g.category_id, g.slug, g.label,
          COUNT(DISTINCT n.id) AS node_count,
          COUNT(DISTINCT e.id) AS edge_count
         FROM graphs g
         LEFT JOIN nodes n ON n.graph_id = g.id
         LEFT JOIN edges e ON e.graph_id = g.id
         GROUP BY g.id, g.category_id, g.slug, g.label
         ORDER BY g.label COLLATE NOCASE`,
      )
      .all(),
  ]);

  return {
    categories: categoryResult.results.map((row) => ({
      id: String(row.id),
      label: String(row.label),
      graphCount: Number(row.graph_count),
      nodeCount: Number(row.node_count),
    })) satisfies CategorySummary[],
    graphs: graphResult.results.map((row) => ({
      id: String(row.id),
      categoryId: String(row.category_id),
      slug: String(row.slug),
      label: String(row.label),
      nodeCount: Number(row.node_count),
      edgeCount: Number(row.edge_count),
    })) satisfies GraphSummary[],
  };
}

export async function getGraphDetail(id: string): Promise<GraphDetail | null> {
  await ensureInitialData();
  const db = getD1();
  const graphRow = await db
    .prepare(
      `SELECT g.id, g.category_id, g.slug, g.label,
        (SELECT COUNT(*) FROM nodes n WHERE n.graph_id = g.id) AS node_count,
        (SELECT COUNT(*) FROM edges e WHERE e.graph_id = g.id) AS edge_count
       FROM graphs g WHERE g.id = ?`,
    )
    .bind(id)
    .first();

  if (!graphRow) return null;

  const [nodeResult, edgeResult] = await Promise.all([
    db
      .prepare(
        "SELECT id, graph_id, node_key, label, description, tags, global_concept_id FROM nodes WHERE graph_id = ? ORDER BY label COLLATE NOCASE",
      )
      .bind(id)
      .all(),
    db
      .prepare(
        "SELECT id, graph_id, source_node_id, target_node_id, type, label FROM edges WHERE graph_id = ? ORDER BY created_at, id",
      )
      .bind(id)
      .all(),
  ]);

  const graph: GraphSummary = {
    id: String(graphRow.id),
    categoryId: String(graphRow.category_id),
    slug: String(graphRow.slug),
    label: String(graphRow.label),
    nodeCount: Number(graphRow.node_count),
    edgeCount: Number(graphRow.edge_count),
  };

  const nodes: GraphNode[] = nodeResult.results.map((row) => ({
    id: String(row.id),
    graphId: String(row.graph_id),
    nodeKey: String(row.node_key),
    label: String(row.label),
    description: String(row.description),
    tags: JSON.parse(String(row.tags || "[]")) as string[],
    globalConceptId: row.global_concept_id ? String(row.global_concept_id) : null,
  }));

  const edges: GraphEdge[] = edgeResult.results.map((row) => ({
    id: String(row.id),
    graphId: String(row.graph_id),
    sourceNodeId: String(row.source_node_id),
    targetNodeId: String(row.target_node_id),
    type: String(row.type),
    label: String(row.label),
  }));

  return { graph, nodes, edges };
}

export function newId(prefix: string) {
  return `${prefix}:${crypto.randomUUID()}`;
}

