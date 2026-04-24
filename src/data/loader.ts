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

interface MultiGraphCategoryFile {
  categoryId?: string;
  graphs?: Array<{
    graphId?: string;
    graphLabel?: string;
    nodes?: KnowledgeNodeFile[];
  }>;
}

interface GraphNodeSource {
  categoryId: string;
  graphId: string;
  graphLabel: string;
  nodes: KnowledgeNodeFile[];
}

export interface ParsedInlineSource {
  manifestLike: Manifest;
  categoryGraphs: Record<string, CategoryGraphEntry[]>;
}

export interface CategoryGraphEntry {
  graphId: string;
  graphLabel: string;
  nodes: KnowledgeNodeFile[];
}

export function parseInlineGraphJson(text: string): ParsedInlineSource {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("invalid JSON");
  }

  if (Array.isArray(parsed)) {
    const categoryId = "inline";
    const graphId = "inline";
    const graphLabel = "Inline";
    return {
      manifestLike: {
        categories: [
          {
            id: categoryId,
            label: "Inline",
            graphs: [{ id: graphId, label: graphLabel }],
          },
        ],
      },
      categoryGraphs: {
        [categoryId]: [{ graphId, graphLabel, nodes: parsed as KnowledgeNodeFile[] }],
      },
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("nodes must be an array");
  }

  const payload = parsed as MultiGraphCategoryFile;
  if (!Array.isArray(payload.graphs)) {
    throw new Error("nodes must be an array");
  }

  const categoryId = payload.categoryId?.trim() || "inline";
  const categoryEntries = payload.graphs.map((graph, index) => {
    if (typeof graph.graphId !== "string" || graph.graphId.trim() === "") {
      throw new Error(`graphs[${index}].graphId is required`);
    }
    if (!Array.isArray(graph.nodes)) {
      throw new Error("nodes must be an array");
    }
    return {
      graphId: graph.graphId,
      graphLabel: graph.graphLabel?.trim() || "Inline",
      nodes: graph.nodes,
    };
  });

  return {
    manifestLike: {
      categories: [
        {
          id: categoryId,
          label: "Inline",
          graphs: categoryEntries.map((entry) => ({
            id: entry.graphId,
            label: entry.graphLabel,
          })),
        },
      ],
    },
    categoryGraphs: {
      [categoryId]: categoryEntries,
    },
  };
}

async function loadCategoryGraphFile(
  categoryId: string
): Promise<MultiGraphCategoryFile> {
  const categoryUrl = `${BASE}graph-data/${categoryId}/graph.json`;
  const categoryRes = await fetch(categoryUrl);
  if (!categoryRes.ok) {
    throw new Error(
      `Failed to load graph-data/${categoryId}/graph.json (${categoryRes.status}).`
    );
  }

  try {
    return (await categoryRes.json()) as MultiGraphCategoryFile;
  } catch {
    throw new Error(`graph-data/${categoryId}/graph.json: invalid JSON.`);
  }
}

export async function loadCategoryGraphs(
  categoryId: string
): Promise<CategoryGraphEntry[]> {
  const parsed = await loadCategoryGraphFile(categoryId);
  if (!Array.isArray(parsed.graphs)) {
    throw new Error(
      `graph-data/${categoryId}/graph.json must be a JSON object with graphs[].`
    );
  }

  return parsed.graphs.map((graph, index) => {
    if (typeof graph.graphId !== "string" || graph.graphId.trim() === "") {
      throw new Error(
        `graph-data/${categoryId}/graph.json: graphs[${index}].graphId is required.`
      );
    }
    if (
      typeof graph.graphLabel !== "string" ||
      graph.graphLabel.trim() === ""
    ) {
      throw new Error(
        `graph-data/${categoryId}/graph.json: graphs[${index}].graphLabel is required.`
      );
    }
    if (!Array.isArray(graph.nodes)) {
      throw new Error(
        `graph-data/${categoryId}/graph.json: graphs[${index}].nodes must be an array.`
      );
    }
    return {
      graphId: graph.graphId,
      graphLabel: graph.graphLabel,
      nodes: graph.nodes,
    };
  });
}

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
  const graphs = await loadCategoryGraphs(categoryId);
  const matched = graphs.find((graph) => graph.graphId === graphId);
  if (!matched) {
    throw new Error(
      `graph-data/${categoryId}/graph.json: graphId '${graphId}' not found.`
    );
  }
  return matched.nodes;
}

export async function loadGraphData(
  categoryId: string,
  graphId: string
): Promise<KnowledgeGraph> {
  const rawArray = await loadLocalGraphNodes(categoryId, graphId);
  return buildGraphFromRaw(rawArray, categoryId, graphId);
}

function upsertMergedNode(
  mergedNodes: Map<string, KnowledgeNodeFile>,
  node: KnowledgeNodeFile,
  source: Pick<GraphNodeSource, "categoryId" | "graphId" | "graphLabel">,
  warnings: string[]
) {
  const existing = mergedNodes.get(node.id);
  if (!existing) {
    mergedNodes.set(node.id, {
      id: node.id,
      label: node.label,
      description: node.description,
      tags: [...new Set(node.tags)],
      links: node.links ? [...node.links] : undefined,
    });
    return;
  }

  warnings.push(
    `Node '${node.id}' duplicated in ${source.categoryId}/${source.graphId} (${source.graphLabel}); merged tags/links.`
  );

  if (existing.label !== node.label) {
    warnings.push(
      `Node '${node.id}' label conflict: keep '${existing.label}', ignore '${node.label}' from ${source.categoryId}/${source.graphId}.`
    );
  }

  const existingDescription = existing.description ?? "";
  const incomingDescription = node.description ?? "";
  if (
    existingDescription &&
    incomingDescription &&
    existingDescription !== incomingDescription
  ) {
    warnings.push(
      `Node '${node.id}' description conflict in ${source.categoryId}/${source.graphId}; keep first non-empty description.`
    );
  } else if (!existingDescription && incomingDescription) {
    existing.description = incomingDescription;
  }

  existing.tags = [...new Set([...existing.tags, ...node.tags])];

  const links = [...(existing.links ?? []), ...(node.links ?? [])];
  const seenLinkIds = new Set<string>();
  existing.links = links.filter((link) => {
    const key = `${link.target}--${link.type}--${link.label ?? ""}`;
    if (seenLinkIds.has(key)) {
      return false;
    }
    seenLinkIds.add(key);
    return true;
  });
}

export function aggregateGraphsToKnowledgeGraph(
  graphSources: GraphNodeSource[]
): KnowledgeGraph {
  const warnings: string[] = [];
  const mergedNodes = new Map<string, KnowledgeNodeFile>();

  for (const source of graphSources) {
    source.nodes.forEach((rawNode, index) => {
      const result = KnowledgeNode.validate(rawNode);
      if (!result.ok) {
        warnings.push(
          `${source.categoryId}/${source.graphId} node[${index}]: ${result.error}`
        );
        return;
      }
      upsertMergedNode(mergedNodes, result.value, source, warnings);
    });
  }

  const nodes = [...mergedNodes.values()].map((node) => new KnowledgeNode(node));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgeMap = new Map<string, KnowledgeEdge>();

  for (const node of nodes) {
    for (const link of node.links) {
      if (!nodeIds.has(link.target)) {
        warnings.push(
          `Node '${node.id}': link target '${link.target}' does not exist.`
        );
        continue;
      }
      const id = `${node.id}--${link.type}--${link.target}`;
      if (!edgeMap.has(id)) {
        edgeMap.set(id, {
          id,
          source: node.id,
          target: link.target,
          type: link.type,
          label: link.label ?? link.type,
        });
      }
    }
  }

  const tags = [...new Set(nodes.flatMap((node) => node.tags))].sort();

  return {
    nodes,
    edges: [...edgeMap.values()],
    tags,
    warnings,
  };
}

export async function loadAllGraphsAsKnowledgeGraph(
  manifest: Manifest
): Promise<KnowledgeGraph> {
  const graphSources: GraphNodeSource[] = [];
  for (const category of manifest.categories) {
    for (const graph of category.graphs) {
      const nodes = await loadLocalGraphNodes(category.id, graph.id);
      graphSources.push({
        categoryId: category.id,
        graphId: graph.id,
        graphLabel: graph.label,
        nodes,
      });
    }
  }
  return aggregateGraphsToKnowledgeGraph(graphSources);
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
