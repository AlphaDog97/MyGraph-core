import { KnowledgeGraph, KnowledgeNodeFile } from "../domain/types";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined;
const databaseId = import.meta.env
  .VITE_APPWRITE_DATABASE_ID as string | undefined;
const tableId = import.meta.env.VITE_APPWRITE_TABLE_ID as string | undefined;

interface CloudUser {
  email: string;
}

interface CloudRowData {
  graphKey: string;
  categoryId: string;
  graphId: string;
  nodes: KnowledgeNodeFile[];
}

function hasCloudConfig(): boolean {
  return Boolean(endpoint && projectId && databaseId && tableId);
}

function buildHeaders(): HeadersInit {
  return {
    "X-Appwrite-Project": projectId ?? "",
    "Content-Type": "application/json",
  };
}

function graphRowId(categoryId: string, graphId: string): string {
  return `${categoryId}--${graphId}`;
}

function rowToGraph(row: unknown): KnowledgeNodeFile[] | null {
  if (typeof row !== "object" || row === null) return null;
  const candidate = (row as { nodes?: unknown }).nodes;
  if (!Array.isArray(candidate)) return null;
  return candidate as KnowledgeNodeFile[];
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
  const json = (await res.json()) as { email?: string };
  if (!json.email) return null;
  return { email: json.email };
}

export async function loadCloudGraphNodes(
  categoryId: string,
  graphId: string
): Promise<KnowledgeNodeFile[] | null> {
  if (!hasCloudConfig()) return null;
  const rowId = graphRowId(categoryId, graphId);
  const res = await fetch(
    `${endpoint}/tablesdb/${databaseId}/tables/${tableId}/rows/${rowId}`,
    {
      headers: buildHeaders(),
      credentials: "include",
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to load cloud graph (${res.status}).`);
  }
  const row = await res.json();
  return rowToGraph(row);
}

export async function saveCloudGraph(
  categoryId: string,
  graphId: string,
  graph: KnowledgeGraph
): Promise<void> {
  if (!hasCloudConfig()) {
    throw new Error("Cloud config is missing.");
  }
  const rowId = graphRowId(categoryId, graphId);
  const payload: CloudRowData = {
    graphKey: rowId,
    categoryId,
    graphId,
    nodes: graph.nodes.map((n) => {
      const node: KnowledgeNodeFile = { id: n.id, label: n.label, tags: n.tags };
      if (n.description) node.description = n.description;
      if (n.links.length > 0) node.links = n.links;
      return node;
    }),
  };

  const updateRes = await fetch(
    `${endpoint}/tablesdb/${databaseId}/tables/${tableId}/rows/${rowId}`,
    {
      method: "PUT",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );

  if (updateRes.ok) return;
  if (updateRes.status !== 404) {
    throw new Error(`Failed to save cloud graph (${updateRes.status}).`);
  }

  const createRes = await fetch(
    `${endpoint}/tablesdb/${databaseId}/tables/${tableId}/rows`,
    {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify({
        rowId,
        ...payload,
      }),
    }
  );
  if (!createRes.ok) {
    throw new Error(`Failed to create cloud graph row (${createRes.status}).`);
  }
}
