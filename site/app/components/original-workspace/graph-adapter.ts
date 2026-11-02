import { KnowledgeNode, type KnowledgeGraph } from "@/original-ui/domain/types";
import type { GraphDetail } from "@/app/lib/types";

function detailToNodes(detail: GraphDetail) {
  const outgoing = new Map<string, GraphDetail["edges"]>();
  for (const edge of detail.edges) {
    const current = outgoing.get(edge.sourceNodeId) ?? [];
    current.push(edge);
    outgoing.set(edge.sourceNodeId, current);
  }

  return detail.nodes.map(
    (node) =>
      new KnowledgeNode(
        {
          id: node.id,
          label: node.label,
          description: node.description,
          tags: node.tags,
          globalConceptId: node.globalConceptId ?? undefined,
          links: (outgoing.get(node.id) ?? []).map((edge) => ({
            target: edge.targetNodeId,
            type: edge.type,
            label: edge.label || undefined,
          })),
        },
        {
          localId: node.nodeKey,
          provenance: [
            {
              categoryId: detail.graph.categoryId,
              graphId: detail.graph.id,
              graphLabel: detail.graph.label,
              localNodeId: node.nodeKey,
            },
          ],
        },
      ),
  );
}

export function toKnowledgeGraph(details: GraphDetail[]): KnowledgeGraph {
  const nodes = details.flatMap(detailToNodes);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const warnings: string[] = [];
  const edges = details.flatMap((detail) =>
    detail.edges.flatMap((edge) => {
      if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) {
        warnings.push(`Relation ${edge.id} references a missing node.`);
        return [];
      }
      return [
        {
          id: edge.id,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          sourcePort: edge.sourcePort,
          targetPort: edge.targetPort,
          type: edge.type,
          label: edge.label,
        },
      ];
    }),
  );

  return {
    nodes,
    edges,
    tags: [...new Set(nodes.flatMap((node) => node.tags))].sort((a, b) =>
      a.localeCompare(b),
    ),
    warnings,
  };
}

export function findOwningDetail(
  details: GraphDetail[],
  nodeId: string,
): GraphDetail | undefined {
  return details.find((detail) =>
    detail.nodes.some((node) => node.id === nodeId),
  );
}

export function graphPaletteTags(graph: KnowledgeGraph, focusedGraphId?: string | null): string[] {
  if (!focusedGraphId) return graph.tags;
  const nodes = graph.nodes.filter((node) =>
    node.provenance.some((source) => source.graphId === focusedGraphId),
  );
  return [...new Set(nodes.flatMap((node) => node.tags))].sort((a, b) => a.localeCompare(b));
}
