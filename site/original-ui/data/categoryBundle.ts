import type { KnowledgeGraph, Manifest } from "../domain/types";
import {
  aggregateGraphsToKnowledgeGraph,
  buildGraphFromRaw,
  loadCategoryGraphs,
  type CategoryGraphEntry,
  type ParsedInlineSource,
} from "./loader";

export interface GraphOption {
  id: string;
  label: string;
}

export interface CategoryGraphBundle {
  graphOptions: GraphOption[];
  graph: KnowledgeGraph;
  sourceGraphs: Record<string, KnowledgeGraph>;
}

function resolveOrderedEntries(
  manifest: Manifest,
  categoryId: string,
  entries: CategoryGraphEntry[]
): CategoryGraphEntry[] {
  const category = manifest.categories.find((item) => item.id === categoryId);
  if (!category) {
    throw new Error(`category '${categoryId}' not found.`);
  }

  const entryById = new Map(entries.map((entry) => [entry.graphId, entry]));
  return category.graphs.map((manifestGraph) => {
    const entry = entryById.get(manifestGraph.id);
    if (!entry) {
      throw new Error(
        `Manifest graph '${categoryId}/${manifestGraph.id}' was not found in its category document.`
      );
    }
    return {
      ...entry,
      graphLabel: entry.graphLabel || manifestGraph.label,
    };
  });
}

function createCategoryBundle(
  categoryId: string,
  entries: CategoryGraphEntry[]
): CategoryGraphBundle {
  if (entries.length === 0) {
    throw new Error(`Category '${categoryId}' has no graphs.`);
  }

  const sourceGraphs: Record<string, KnowledgeGraph> = {};
  for (const entry of entries) {
    sourceGraphs[entry.graphId] = buildGraphFromRaw(
      entry.nodes,
      categoryId,
      entry.graphId,
      entry.graphLabel
    );
  }

  return {
    graphOptions: entries.map((entry) => ({
      id: entry.graphId,
      label: entry.graphLabel,
    })),
    graph: aggregateGraphsToKnowledgeGraph(
      entries.map((entry) => ({
        categoryId,
        graphId: entry.graphId,
        graphLabel: entry.graphLabel,
        nodes: entry.nodes,
      }))
    ),
    sourceGraphs,
  };
}

export async function loadLocalCategoryBundle(
  manifest: Manifest,
  categoryId: string
): Promise<CategoryGraphBundle> {
  const entries = await loadCategoryGraphs(categoryId);
  return createCategoryBundle(
    categoryId,
    resolveOrderedEntries(manifest, categoryId, entries)
  );
}

export function buildInlineCategoryBundle(
  source: ParsedInlineSource,
  categoryId: string
): CategoryGraphBundle {
  const entries = source.categoryGraphs[categoryId];
  if (!entries) {
    throw new Error(`category '${categoryId}' not found.`);
  }
  return createCategoryBundle(
    categoryId,
    resolveOrderedEntries(source.manifestLike, categoryId, entries)
  );
}

export function buildInlineOverview(source: ParsedInlineSource): KnowledgeGraph {
  return aggregateGraphsToKnowledgeGraph(
    Object.entries(source.categoryGraphs).flatMap(([categoryId, graphs]) =>
      graphs.map((entry) => ({
        categoryId,
        graphId: entry.graphId,
        graphLabel: entry.graphLabel,
        nodes: entry.nodes,
      }))
    )
  );
}
