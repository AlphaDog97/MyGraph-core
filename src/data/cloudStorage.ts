import {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNodeFile,
} from "../domain/types";
import { buildGraphFromRaw } from "./loader";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined;
const databaseId = import.meta.env
  .VITE_APPWRITE_DATABASE_ID as string | undefined;

const tables = {
  graphs: import.meta.env.VITE_APPWRITE_TABLE_GRAPHS_ID as string | undefined,
  nodes: import.meta.env.VITE_APPWRITE_TABLE_NODES_ID as string | undefined,
  edges: import.meta.env.VITE_APPWRITE_TABLE_EDGES_ID as string | undefined,
  tags: import.meta.env.VITE_APPWRITE_TABLE_TAGS_ID as string | undefined,
  nodeTags: import.meta.env.VITE_APPWRITE_TABLE_NODE_TAGS_ID as string | undefined,
  userPreferences: import.meta.env
    .VITE_APPWRITE_TABLE_USER_PREFERENCES_ID as string | undefined,
};

interface AppwriteListResponse<T> {
  rows: T[];
  total?: number;
}

interface BaseRow {
  $id: string;
}

interface GraphRow extends BaseRow {
  graph_key: string;
  category_id: string;
  graph_id: string;
  owner_user_id?: string;
  visibility?: "public" | "private";
}

interface NodeRow extends BaseRow {
  graph_key: string;
  node_id: string;
  label: string;
  description?: string;
}

interface EdgeRow extends BaseRow {
  graph_key: string;
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  edge_label?: string;
}

interface TagRow extends BaseRow {
  graph_key: string;
  tag: string;
}

interface NodeTagRow extends BaseRow {
  graph_key: string;
  node_id: string;
  tag: string;
}

export interface CloudUser {
  id: string;
  email: string;
}

export interface GraphMeta {
  categoryId: string;
  graphId: string;
  ownerUserId: string;
  visibility: "public" | "private";
}

export interface GraphSummary {
  graphKey: string;
  categoryId: string;
  graphId: string;
  ownerUserId: string;
  visibility: "public" | "private";
}

export type GraphListFilter = { ownerId: string } | { visibility: "public" | "private" };

export interface CloudGraphRepository {
  loadGraph: (
    categoryId: string,
    graphId: string,
    ownerId?: string
  ) => Promise<KnowledgeGraph | null>;
  saveGraph: (
    graphMeta: GraphMeta,
    nodes: KnowledgeNodeFile[],
    edges: KnowledgeEdge[],
    tags: string[]
  ) => Promise<void>;
  listGraphs: (filter: GraphListFilter) => Promise<GraphSummary[]>;
}

function hasCloudConfig(): boolean {
  return Boolean(
    endpoint &&
      projectId &&
      databaseId &&
      tables.graphs &&
      tables.nodes &&
      tables.edges &&
      tables.tags &&
      tables.nodeTags &&
      tables.userPreferences
  );
}

function buildHeaders(): HeadersInit {
  return {
    "X-Appwrite-Project": projectId ?? "",
    "Content-Type": "application/json",
  };
}

function graphKey(categoryId: string, graphId: string): string {
  return `${categoryId}--${graphId}`;
}

function buildQueryParams(queries: string[] = []): string {
  const params = new URLSearchParams();
  for (const query of queries) {
    params.append("queries[]", query);
  }
  return params.toString();
}

function equalQuery(field: string, value: string): string {
  return `equal("${field}",["${value}"])`;
}

function cursorAfterQuery(cursor: string): string {
  return `cursorAfter("${cursor}")`;
}

function limitQuery(limit: number): string {
  return `limit(${limit})`;
}

function toKnowledgeNodeFile(rows: NodeRow[], nodeTags: NodeTagRow[]): KnowledgeNodeFile[] {
  const tagsByNode = new Map<string, Set<string>>();
  for (const relation of nodeTags) {
    if (!tagsByNode.has(relation.node_id)) {
      tagsByNode.set(relation.node_id, new Set());
    }
    tagsByNode.get(relation.node_id)?.add(relation.tag);
  }

  return rows.map((row) => {
    const node: KnowledgeNodeFile = {
      id: row.node_id,
      label: row.label,
      tags: [...(tagsByNode.get(row.node_id) ?? [])].sort(),
    };
    if (row.description) {
      node.description = row.description;
    }
    return node;
  });
}

function toKnowledgeEdge(rows: EdgeRow[]): KnowledgeEdge[] {
  return rows.map((row) => ({
    id: row.edge_id,
    source: row.source_node_id,
    target: row.target_node_id,
    type: row.edge_type,
    label: row.edge_label ?? row.edge_type,
  }));
}

function normalizeGraph(
  graphNodes: KnowledgeNodeFile[],
  edges: KnowledgeEdge[],
  fallbackTags: string[],
  categoryId: string,
  graphId: string
): KnowledgeGraph {
  const graph = buildGraphFromRaw(graphNodes, categoryId, graphId);
  const tags = new Set([...graph.tags, ...fallbackTags]);

  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const warnings = [...graph.warnings];
  const filteredEdges = edges.filter((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      warnings.push(
        `Edge '${edge.id}' references missing node(s): ${edge.source} -> ${edge.target}.`
      );
      return false;
    }
    return true;
  });

  return {
    ...graph,
    edges: filteredEdges,
    tags: [...tags].sort(),
    warnings,
  };
}

async function listRows<T extends BaseRow>(tableId: string, queries: string[] = []): Promise<T[]> {
  const pageSize = 100;
  const allRows: T[] = [];
  let cursor: string | null = null;

  while (true) {
    const withPagination = [limitQuery(pageSize), ...queries];
    if (cursor) {
      withPagination.push(cursorAfterQuery(cursor));
    }

    const queryString = buildQueryParams(withPagination);
    const res = await fetch(
      `${endpoint}/tablesdb/${databaseId}/tables/${tableId}/rows?${queryString}`,
      {
        headers: buildHeaders(),
        credentials: "include",
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to query table '${tableId}' (${res.status}).`);
    }

    const payload = (await res.json()) as AppwriteListResponse<T>;
    const rows = payload.rows ?? [];
    allRows.push(...rows);

    if (rows.length < pageSize) {
      break;
    }

    cursor = rows[rows.length - 1]?.$id ?? null;
    if (!cursor) {
      break;
    }
  }

  return allRows;
}

async function upsertRow<T extends Record<string, unknown>>(
  tableId: string,
  rowId: string,
  payload: T
): Promise<void> {
  const updateRes = await fetch(
    `${endpoint}/tablesdb/${databaseId}/tables/${tableId}/rows/${rowId}`,
    {
      method: "PUT",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );

  if (updateRes.ok) {
    return;
  }

  if (updateRes.status !== 404) {
    throw new Error(`Upsert failed in table '${tableId}' (${updateRes.status}).`);
  }

  const createRes = await fetch(`${endpoint}/tablesdb/${databaseId}/tables/${tableId}/rows`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify({
      rowId,
      ...payload,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Insert failed in table '${tableId}' (${createRes.status}).`);
  }
}

async function deleteRow(tableId: string, rowId: string): Promise<void> {
  const res = await fetch(
    `${endpoint}/tablesdb/${databaseId}/tables/${tableId}/rows/${rowId}`,
    {
      method: "DELETE",
      headers: buildHeaders(),
      credentials: "include",
    }
  );

  if (res.ok || res.status === 404) {
    return;
  }

  throw new Error(`Delete failed for table '${tableId}' row '${rowId}' (${res.status}).`);
}

async function requireCloudUser(): Promise<CloudUser> {
  const user = await getCloudUser();
  if (!user) {
    throw new Error("Cloud write requires an authenticated user.");
  }
  return user;
}

export function cloudEnabled(): boolean {
  return hasCloudConfig();
}

export async function getCloudUser(): Promise<CloudUser | null> {
  if (!hasCloudConfig()) return null;
  const res = await fetch(`${endpoint}/account`, {
    headers: buildHeaders(),
    credentials: "include",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { $id?: string; email?: string };
  if (!json.$id || !json.email) return null;
  return { id: json.$id, email: json.email };
}

export const cloudGraphRepository: CloudGraphRepository = {
  async loadGraph(categoryId, graphId, ownerId) {
    if (!hasCloudConfig()) {
      return null;
    }

    const key = graphKey(categoryId, graphId);
    const graphRows = await listRows<GraphRow>(tables.graphs ?? "", [
      equalQuery("graph_key", key),
    ]);

    if (graphRows.length === 0) {
      return null;
    }

    const graph = graphRows[0];
    const isPublic = graph.visibility === "public";
    const isOwner = ownerId ? graph.owner_user_id === ownerId : false;

    if (!isPublic && !isOwner) {
      return null;
    }

    const [nodeRows, edgeRows, nodeTagRows, tagRows] = await Promise.all([
      listRows<NodeRow>(tables.nodes ?? "", [equalQuery("graph_key", key)]),
      listRows<EdgeRow>(tables.edges ?? "", [equalQuery("graph_key", key)]),
      listRows<NodeTagRow>(tables.nodeTags ?? "", [equalQuery("graph_key", key)]),
      listRows<TagRow>(tables.tags ?? "", [equalQuery("graph_key", key)]),
    ]);

    const graphNodes = toKnowledgeNodeFile(nodeRows, nodeTagRows);
    const graphEdges = toKnowledgeEdge(edgeRows);
    const graphTags = [...new Set(tagRows.map((row) => row.tag))];

    return normalizeGraph(graphNodes, graphEdges, graphTags, categoryId, graphId);
  },

  async saveGraph(graphMeta, nodes, edges, tags) {
    if (!hasCloudConfig()) {
      throw new Error("Cloud config is missing.");
    }

    const cloudUser = await requireCloudUser();
    if (cloudUser.id !== graphMeta.ownerUserId) {
      throw new Error("You can only write graphs owned by your own account.");
    }

    const key = graphKey(graphMeta.categoryId, graphMeta.graphId);

    await upsertRow(tables.graphs ?? "", key, {
      graph_key: key,
      category_id: graphMeta.categoryId,
      graph_id: graphMeta.graphId,
      owner_user_id: graphMeta.ownerUserId,
      visibility: graphMeta.visibility,
    });

    const existingNodes = await listRows<NodeRow>(tables.nodes ?? "", [
      equalQuery("graph_key", key),
    ]);
    const existingNodeIds = new Set(existingNodes.map((row) => row.node_id));
    const incomingNodeIds = new Set(nodes.map((node) => node.id));

    for (const node of nodes) {
      const rowId = `${key}--${node.id}`;
      await upsertRow(tables.nodes ?? "", rowId, {
        graph_key: key,
        node_id: node.id,
        label: node.label,
        description: node.description ?? "",
      });
    }

    for (const nodeId of existingNodeIds) {
      if (!incomingNodeIds.has(nodeId)) {
        await deleteRow(tables.nodes ?? "", `${key}--${nodeId}`);
      }
    }

    const existingEdges = await listRows<EdgeRow>(tables.edges ?? "", [
      equalQuery("graph_key", key),
    ]);
    for (const edge of existingEdges) {
      await deleteRow(tables.edges ?? "", edge.$id);
    }
    for (const edge of edges) {
      const rowId = `${key}--${edge.id}`;
      await upsertRow(tables.edges ?? "", rowId, {
        graph_key: key,
        edge_id: edge.id,
        source_node_id: edge.source,
        target_node_id: edge.target,
        edge_type: edge.type,
        edge_label: edge.label,
      });
    }

    const existingTags = await listRows<TagRow>(tables.tags ?? "", [
      equalQuery("graph_key", key),
    ]);
    for (const tag of existingTags) {
      await deleteRow(tables.tags ?? "", tag.$id);
    }

    for (const tag of tags) {
      const rowId = `${key}--${tag}`;
      await upsertRow(tables.tags ?? "", rowId, {
        graph_key: key,
        tag,
      });
    }

    const existingNodeTags = await listRows<NodeTagRow>(tables.nodeTags ?? "", [
      equalQuery("graph_key", key),
    ]);
    for (const relation of existingNodeTags) {
      await deleteRow(tables.nodeTags ?? "", relation.$id);
    }

    for (const node of nodes) {
      for (const tag of node.tags) {
        const rowId = `${key}--${node.id}--${tag}`;
        await upsertRow(tables.nodeTags ?? "", rowId, {
          graph_key: key,
          node_id: node.id,
          tag,
        });
      }
    }
  },

  async listGraphs(filter) {
    if (!hasCloudConfig()) {
      return [];
    }

    const query = "ownerId" in filter
      ? equalQuery("owner_user_id", filter.ownerId)
      : equalQuery("visibility", filter.visibility);

    const rows = await listRows<GraphRow>(tables.graphs ?? "", [query]);

    return rows.map((row) => ({
      graphKey: row.graph_key,
      categoryId: row.category_id,
      graphId: row.graph_id,
      ownerUserId: row.owner_user_id ?? "",
      visibility: row.visibility ?? "private",
    }));
  },
};

export async function loadCloudGraph(
  categoryId: string,
  graphId: string,
  ownerId?: string
): Promise<KnowledgeGraph | null> {
  return cloudGraphRepository.loadGraph(categoryId, graphId, ownerId);
}

export async function saveCloudGraph(
  graphMeta: GraphMeta,
  graph: KnowledgeGraph
): Promise<void> {
  const nodes: KnowledgeNodeFile[] = graph.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    description: node.description || undefined,
    tags: node.tags,
    links:
      node.links.length > 0
        ? node.links.map((link) => ({
            target: link.target,
            type: link.type,
            label: link.label,
          }))
        : undefined,
  }));

  await cloudGraphRepository.saveGraph(graphMeta, nodes, graph.edges, graph.tags);
}
