import {
  GraphNodeProvenance,
  Manifest,
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNodeFile,
  TagColorAssignment,
} from "../domain/types";
import {
  diagnoseGraphNodes,
  formatGraphDiagnostic,
  GraphDiagnostic,
} from "../domain/diagnostics";
import { resolveEdgeTypeColor } from "../domain/edgeTypes";
import {
  CategoryGraphEntry,
  defaultGraphSource,
  GraphSource,
} from "./graphSource";

export type { CategoryGraphEntry, GraphSource } from "./graphSource";

export interface GraphNodeSource {
  categoryId: string;
  graphId: string;
  graphLabel: string;
  nodes: KnowledgeNodeFile[];
}

export interface ParsedInlineSource {
  manifestLike: Manifest;
  categoryGraphs: Record<string, CategoryGraphEntry[]>;
}

interface AggregateNodeDraft {
  raw: KnowledgeNodeFile;
  localId: string;
  provenance: GraphNodeProvenance[];
}

function diagnosticsToWarnings(diagnostics: GraphDiagnostic[]): string[] {
  return diagnostics
    .filter((diagnostic) => diagnostic.severity !== "info")
    .map(formatGraphDiagnostic);
}

function buildEdges(nodes: KnowledgeNode[]): KnowledgeEdge[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgeMap = new Map<string, KnowledgeEdge>();

  for (const node of nodes) {
    for (const link of node.links) {
      if (!nodeIds.has(link.target)) continue;
      const id = `${node.id}--${link.type}--${link.target}`;
      if (edgeMap.has(id)) continue;
      edgeMap.set(id, {
        id,
        source: node.id,
        target: link.target,
        type: link.type,
        label: link.label ?? link.type,
      });
    }
  }

  return [...edgeMap.values()];
}

function collectTags(nodes: KnowledgeNode[]): string[] {
  return [...new Set(nodes.flatMap((node) => node.tags))].sort();
}

function createProvenance(
  categoryId: string,
  graphId: string,
  graphLabel: string,
  localNodeId: string
): GraphNodeProvenance {
  return { categoryId, graphId, graphLabel, localNodeId };
}

function encodeIdentityPart(value: string): string {
  return encodeURIComponent(value.trim());
}

export function createScopedNodeId(
  categoryId: string,
  graphId: string,
  localNodeId: string
): string {
  return [categoryId, graphId, localNodeId].map(encodeIdentityPart).join("::");
}

function createGlobalConceptNodeId(globalConceptId: string): string {
  return `concept::${encodeIdentityPart(globalConceptId)}`;
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

  const payload = parsed as {
    categoryId?: string;
    graphs?: Array<{
      graphId?: string;
      graphLabel?: string;
      nodes?: KnowledgeNodeFile[];
    }>;
  };
  if (!Array.isArray(payload.graphs)) {
    throw new Error("nodes must be an array");
  }

  const categoryId = payload.categoryId?.trim() || "inline";
  const seenGraphIds = new Set<string>();
  const categoryEntries = payload.graphs.map((graph, index) => {
    const graphId = graph.graphId?.trim() ?? "";
    if (!graphId) throw new Error(`graphs[${index}].graphId is required`);
    if (seenGraphIds.has(graphId)) {
      throw new Error(`graphs[${index}].graphId '${graphId}' is duplicated`);
    }
    if (!Array.isArray(graph.nodes)) throw new Error("nodes must be an array");
    seenGraphIds.add(graphId);
    return {
      graphId,
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
    categoryGraphs: { [categoryId]: categoryEntries },
  };
}

export async function loadCategoryGraphs(
  categoryId: string,
  source: GraphSource = defaultGraphSource,
  signal?: AbortSignal
): Promise<CategoryGraphEntry[]> {
  return source.loadCategory(categoryId, signal);
}

export async function loadManifest(
  source: GraphSource = defaultGraphSource,
  signal?: AbortSignal
): Promise<Manifest> {
  return source.loadManifest(signal);
}

export function buildGraphFromRaw(
  rawArray: unknown,
  categoryId: string,
  graphId: string,
  graphLabel = graphId
): KnowledgeGraph {
  const { validNodes, diagnostics } = diagnoseGraphNodes(rawArray, {
    categoryId,
    graphId,
  });

  if (validNodes.length === 0 && diagnostics.some((item) => item.severity === "error")) {
    throw new Error(
      "No valid nodes loaded.\n" + diagnosticsToWarnings(diagnostics).join("\n")
    );
  }

  const nodes = validNodes.map(
    (node) =>
      new KnowledgeNode(node, {
        localId: node.id,
        provenance: [createProvenance(categoryId, graphId, graphLabel, node.id)],
      })
  );

  return {
    nodes,
    edges: buildEdges(nodes),
    tags: collectTags(nodes),
    warnings: diagnosticsToWarnings(diagnostics),
    diagnostics,
  };
}

export async function loadLocalGraphNodes(
  categoryId: string,
  graphId: string,
  source: GraphSource = defaultGraphSource,
  signal?: AbortSignal
): Promise<KnowledgeNodeFile[]> {
  const graphs = await loadCategoryGraphs(categoryId, source, signal);
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
  graphId: string,
  source: GraphSource = defaultGraphSource,
  signal?: AbortSignal
): Promise<KnowledgeGraph> {
  const graphs = await loadCategoryGraphs(categoryId, source, signal);
  const matched = graphs.find((graph) => graph.graphId === graphId);
  if (!matched) {
    throw new Error(
      `graph-data/${categoryId}/graph.json: graphId '${graphId}' not found.`
    );
  }
  return buildGraphFromRaw(matched.nodes, categoryId, graphId, matched.graphLabel);
}

function mergeAggregateNode(
  drafts: Map<string, AggregateNodeDraft>,
  aggregateId: string,
  incoming: AggregateNodeDraft,
  diagnostics: GraphDiagnostic[]
): void {
  const existing = drafts.get(aggregateId);
  if (!existing) {
    drafts.set(aggregateId, incoming);
    return;
  }

  const source = incoming.provenance[0];
  if (existing.raw.label !== incoming.raw.label) {
    diagnostics.push({
      severity: "warning",
      code: "GLOBAL_CONCEPT_LABEL_CONFLICT",
      path: `${source.categoryId}/${source.graphId}/node('${source.localNodeId}')`,
      message: `globalConceptId '${incoming.raw.globalConceptId}' has conflicting labels; keeping '${existing.raw.label}'.`,
    });
  }

  const existingDescription = existing.raw.description ?? "";
  const incomingDescription = incoming.raw.description ?? "";
  if (!existingDescription && incomingDescription) {
    existing.raw.description = incomingDescription;
  } else if (
    existingDescription &&
    incomingDescription &&
    existingDescription !== incomingDescription
  ) {
    diagnostics.push({
      severity: "warning",
      code: "GLOBAL_CONCEPT_DESCRIPTION_CONFLICT",
      path: `${source.categoryId}/${source.graphId}/node('${source.localNodeId}')`,
      message: `globalConceptId '${incoming.raw.globalConceptId}' has conflicting descriptions; keeping the first non-empty value.`,
    });
  }

  existing.raw.tags = [...new Set([...existing.raw.tags, ...incoming.raw.tags])];
  const linkMap = new Map<string, NonNullable<KnowledgeNodeFile["links"]>[number]>();
  for (const link of [...(existing.raw.links ?? []), ...(incoming.raw.links ?? [])]) {
    const key = `${link.target}--${link.type}--${link.label ?? ""}`;
    if (!linkMap.has(key)) linkMap.set(key, link);
  }
  existing.raw.links = [...linkMap.values()];

  const provenanceKeys = new Set(
    existing.provenance.map(
      (item) => `${item.categoryId}::${item.graphId}::${item.localNodeId}`
    )
  );
  for (const item of incoming.provenance) {
    const key = `${item.categoryId}::${item.graphId}::${item.localNodeId}`;
    if (!provenanceKeys.has(key)) {
      provenanceKeys.add(key);
      existing.provenance.push(item);
    }
  }
}

export function aggregateGraphsToKnowledgeGraph(
  graphSources: GraphNodeSource[]
): KnowledgeGraph {
  const diagnostics: GraphDiagnostic[] = [];
  const drafts = new Map<string, AggregateNodeDraft>();

  for (const source of graphSources) {
    const validation = diagnoseGraphNodes(source.nodes, {
      categoryId: source.categoryId,
      graphId: source.graphId,
    });
    diagnostics.push(...validation.diagnostics);

    const localToAggregateId = new Map<string, string>();
    for (const node of validation.validNodes) {
      const aggregateId = node.globalConceptId
        ? createGlobalConceptNodeId(node.globalConceptId)
        : createScopedNodeId(source.categoryId, source.graphId, node.id);
      localToAggregateId.set(node.id, aggregateId);
    }

    for (const node of validation.validNodes) {
      const aggregateId = localToAggregateId.get(node.id);
      if (!aggregateId) continue;
      const rewrittenLinks = (node.links ?? [])
        .map((link) => {
          const target = localToAggregateId.get(link.target);
          return target ? { ...link, target } : null;
        })
        .filter((link): link is NonNullable<typeof link> => link !== null);

      mergeAggregateNode(
        drafts,
        aggregateId,
        {
          raw: {
            ...node,
            id: aggregateId,
            links: rewrittenLinks,
          },
          localId: node.id,
          provenance: [
            createProvenance(
              source.categoryId,
              source.graphId,
              source.graphLabel,
              node.id
            ),
          ],
        },
        diagnostics
      );
    }
  }

  const nodes = [...drafts.values()].map(
    (draft) =>
      new KnowledgeNode(draft.raw, {
        localId: draft.localId,
        provenance: draft.provenance,
      })
  );

  return {
    nodes,
    edges: buildEdges(nodes),
    tags: collectTags(nodes),
    warnings: diagnosticsToWarnings(diagnostics),
    diagnostics,
  };
}

export async function loadAllGraphsAsKnowledgeGraph(
  manifest: Manifest,
  source: GraphSource = defaultGraphSource,
  signal?: AbortSignal
): Promise<KnowledgeGraph> {
  const categoryResults = await Promise.all(
    manifest.categories.map(async (category) => ({
      category,
      entries: await loadCategoryGraphs(category.id, source, signal),
    }))
  );

  const graphSources: GraphNodeSource[] = [];
  for (const { category, entries } of categoryResults) {
    const entryById = new Map(entries.map((entry) => [entry.graphId, entry]));
    for (const graph of category.graphs) {
      const entry = entryById.get(graph.id);
      if (!entry) {
        throw new Error(
          `Manifest graph '${category.id}/${graph.id}' was not found in its category document.`
        );
      }
      graphSources.push({
        categoryId: category.id,
        graphId: graph.id,
        graphLabel: entry.graphLabel || graph.label,
        nodes: entry.nodes,
      });
    }
  }

  return aggregateGraphsToKnowledgeGraph(graphSources);
}

export function toCytoscapeElements(
  graph: KnowledgeGraph,
  tagColors: TagColorAssignment
): cytoscape.ElementDefinition[] {
  const nodeElements = graph.nodes.map((node) => node.toCytoscapeNode(tagColors));
  const edgeElements: cytoscape.ElementDefinition[] = graph.edges.map((edge) => ({
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      edgeColor: resolveEdgeTypeColor(edge.type),
    },
  }));
  return [...nodeElements, ...edgeElements];
}
