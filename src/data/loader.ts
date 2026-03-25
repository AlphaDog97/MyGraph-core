import {
  Manifest,
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNodeFile,
  TagColorAssignment,
} from "../domain/types";
import { resolveEdgeTypeColor } from "../domain/edgeTypes";

const BASE = import.meta.env.BASE_URL;

export async function loadManifest(): Promise<Manifest> {
  const res = await fetch(`${BASE}graph-data/manifest.json`);
  if (!res.ok) {
    throw new Error(
      `Failed to load manifest (${res.status}). ` +
        `Make sure graph-data/manifest.json exists.`
    );
  }
  return res.json();
}

export function buildGraphFromRaw(
  rawArray: unknown,
  categoryId: string,
  graphId: string
): KnowledgeGraph {
  if (!Array.isArray(rawArray)) {
    throw new Error(
      `${categoryId}/${graphId}/graph.json must be a JSON array of nodes.`
    );
  }

  const warnings: string[] = [];
  const nodes: KnowledgeNode[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < rawArray.length; i++) {
    const result = KnowledgeNode.validate(rawArray[i]);
    if (!result.ok) {
      warnings.push(`Node [${i}]: ${result.error}`);
      continue;
    }
    if (seenIds.has(result.value.id)) {
      warnings.push(`Node [${i}]: duplicate id '${result.value.id}'.`);
      continue;
    }
    seenIds.add(result.value.id);
    nodes.push(new KnowledgeNode(result.value));
  }

  if (nodes.length === 0 && warnings.length > 0) {
    throw new Error("No valid nodes loaded.\n" + warnings.join("\n"));
  }

  const edges: KnowledgeEdge[] = [];
  for (const node of nodes) {
    for (const link of node.links) {
      if (!seenIds.has(link.target)) {
        warnings.push(
          `Node '${node.id}': link target '${link.target}' does not exist.`
        );
        continue;
      }
      edges.push({
        id: `${node.id}--${link.type}--${link.target}`,
        source: node.id,
        target: link.target,
        type: link.type,
        label: link.label ?? link.type,
      });
    }
  }

  const tagSet = new Set<string>();
  for (const node of nodes) {
    for (const tag of node.tags) tagSet.add(tag);
  }

  return {
    nodes,
    edges,
    tags: [...tagSet].sort(),
    warnings,
  };
}

export async function loadLocalGraphNodes(
  categoryId: string,
  graphId: string
): Promise<KnowledgeNodeFile[]> {
  const url = `${BASE}graph-data/${categoryId}/${graphId}/graph.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to load graph (${res.status}): ${categoryId}/${graphId}`
    );
  }

  try {
    return (await res.json()) as KnowledgeNodeFile[];
  } catch {
    throw new Error(`${categoryId}/${graphId}/graph.json: invalid JSON.`);
  }
}

export async function loadGraphData(
  categoryId: string,
  graphId: string
): Promise<KnowledgeGraph> {
  const rawArray = await loadLocalGraphNodes(categoryId, graphId);
  return buildGraphFromRaw(rawArray, categoryId, graphId);
}

export function toCytoscapeElements(
  graph: KnowledgeGraph,
  tagColors: TagColorAssignment
): cytoscape.ElementDefinition[] {
  const nodeEls = graph.nodes.map((n) => n.toCytoscapeNode(tagColors));
  const edgeEls: cytoscape.ElementDefinition[] = graph.edges.map((e) => ({
    data: {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      edgeColor: resolveEdgeTypeColor(e.type),
    },
  }));
  return [...nodeEls, ...edgeEls];
}
