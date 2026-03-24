#!/usr/bin/env node

/**
 * One-time offline migration script.
 *
 * Migrates old single-table rows (where each row stores a nodes JSON array)
 * into normalized multi-table rows: graphs/nodes/edges/tags/node_tags.
 */

const requiredEnv = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_DATABASE_ID",
  "APPWRITE_TABLE_OLD_NODES_ID",
  "APPWRITE_TABLE_GRAPHS_ID",
  "APPWRITE_TABLE_NODES_ID",
  "APPWRITE_TABLE_EDGES_ID",
  "APPWRITE_TABLE_TAGS_ID",
  "APPWRITE_TABLE_NODE_TAGS_ID",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing env: ${key}`);
    process.exit(1);
  }
}

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const dryRun = process.argv.includes("--dry-run");

const tables = {
  oldNodes: process.env.APPWRITE_TABLE_OLD_NODES_ID,
  graphs: process.env.APPWRITE_TABLE_GRAPHS_ID,
  nodes: process.env.APPWRITE_TABLE_NODES_ID,
  edges: process.env.APPWRITE_TABLE_EDGES_ID,
  tags: process.env.APPWRITE_TABLE_TAGS_ID,
  nodeTags: process.env.APPWRITE_TABLE_NODE_TAGS_ID,
};

function headers() {
  const base = {
    "X-Appwrite-Project": projectId,
    "Content-Type": "application/json",
  };
  if (process.env.APPWRITE_API_KEY) {
    base["X-Appwrite-Key"] = process.env.APPWRITE_API_KEY;
  }
  return base;
}

function graphKey(categoryId, graphId) {
  return `${categoryId}--${graphId}`;
}

function queryString(queries = []) {
  const params = new URLSearchParams();
  for (const query of queries) {
    params.append("queries[]", query);
  }
  return params.toString();
}

function limitQuery(limit) {
  return `limit(${limit})`;
}

function cursorAfterQuery(cursor) {
  return `cursorAfter("${cursor}")`;
}

async function listRows(tableId, queries = []) {
  const rows = [];
  const pageSize = 100;
  let cursor = null;

  while (true) {
    const q = [limitQuery(pageSize), ...queries];
    if (cursor) q.push(cursorAfterQuery(cursor));

    const res = await fetch(
      `${endpoint}/tablesdb/${databaseId}/tables/${tableId}/rows?${queryString(q)}`,
      {
        headers: headers(),
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to list rows from ${tableId}: HTTP ${res.status}`);
    }

    const json = await res.json();
    const page = json.rows ?? [];
    rows.push(...page);

    if (page.length < pageSize) break;
    cursor = page[page.length - 1]?.$id;
    if (!cursor) break;
  }

  return rows;
}

async function upsertRow(tableId, rowId, payload) {
  if (dryRun) return;

  const updateRes = await fetch(
    `${endpoint}/tablesdb/${databaseId}/tables/${tableId}/rows/${rowId}`,
    {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    }
  );

  if (updateRes.ok) return;
  if (updateRes.status !== 404) {
    throw new Error(`Upsert failed for ${tableId}/${rowId}: HTTP ${updateRes.status}`);
  }

  const createRes = await fetch(
    `${endpoint}/tablesdb/${databaseId}/tables/${tableId}/rows`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ rowId, ...payload }),
    }
  );

  if (!createRes.ok) {
    throw new Error(`Insert failed for ${tableId}/${rowId}: HTTP ${createRes.status}`);
  }
}

function toEdges(nodes) {
  const edges = [];
  for (const node of nodes) {
    for (const link of node.links ?? []) {
      edges.push({
        id: `${node.id}--${link.type}--${link.target}`,
        source: node.id,
        target: link.target,
        type: link.type,
        label: link.label ?? link.type,
      });
    }
  }
  return edges;
}

async function migrateRow(row) {
  const categoryId = row.categoryId;
  const graphId = row.graphId;
  const nodes = Array.isArray(row.nodes) ? row.nodes : [];
  const ownerUserId = row.owner_user_id ?? row.ownerUserId ?? "";
  const visibility = row.visibility === "public" ? "public" : "private";

  if (!categoryId || !graphId) {
    console.warn(`Skip row ${row.$id}: missing categoryId or graphId`);
    return;
  }

  const key = graphKey(categoryId, graphId);
  const edges = toEdges(nodes);
  const tags = new Set();

  await upsertRow(tables.graphs, key, {
    graph_key: key,
    category_id: categoryId,
    graph_id: graphId,
    owner_user_id: ownerUserId,
    visibility,
  });

  for (const node of nodes) {
    await upsertRow(tables.nodes, `${key}--${node.id}`, {
      graph_key: key,
      node_id: node.id,
      label: node.label ?? node.id,
      description: node.description ?? "",
    });

    for (const tag of node.tags ?? []) {
      tags.add(tag);
      await upsertRow(tables.nodeTags, `${key}--${node.id}--${tag}`, {
        graph_key: key,
        node_id: node.id,
        tag,
      });
    }
  }

  for (const edge of edges) {
    await upsertRow(tables.edges, `${key}--${edge.id}`, {
      graph_key: key,
      edge_id: edge.id,
      source_node_id: edge.source,
      target_node_id: edge.target,
      edge_type: edge.type,
      edge_label: edge.label,
    });
  }

  for (const tag of tags) {
    await upsertRow(tables.tags, `${key}--${tag}`, {
      graph_key: key,
      tag,
    });
  }

  console.log(`[${dryRun ? "dry-run" : "migrated"}] ${key} nodes=${nodes.length} edges=${edges.length} tags=${tags.size}`);
}

async function main() {
  const oldRows = await listRows(tables.oldNodes);
  console.log(`Found ${oldRows.length} legacy rows in table ${tables.oldNodes}.`);

  for (const row of oldRows) {
    await migrateRow(row);
  }

  console.log("Migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
