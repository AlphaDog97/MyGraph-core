import type cytoscape from "cytoscape";
import type { KnowledgeGraph } from "../domain/types";

export interface LayoutPlan {
  depthById: Map<string, number>;
  positions: Map<string, cytoscape.Position>;
}

export interface GraphMetrics {
  indegree: Map<string, number>;
  outdegree: Map<string, number>;
  parentsById: Map<string, string[]>;
  childrenById: Map<string, string[]>;
  neighborsById: Map<string, string[]>;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function nodeDegree(metrics: GraphMetrics, nodeId: string): number {
  return (
    (metrics.indegree.get(nodeId) ?? 0) +
    (metrics.outdegree.get(nodeId) ?? 0)
  );
}

export function estimateNodeWidth(
  graph: KnowledgeGraph,
  nodeId: string
): number {
  const label = graph.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
  return Math.min(230, Math.max(118, label.length * 7.4 + 34));
}

export function buildGraphMetrics(graph: KnowledgeGraph): GraphMetrics {
  const indegree = new Map<string, number>();
  const outdegree = new Map<string, number>();
  const parentsById = new Map<string, string[]>();
  const childrenById = new Map<string, string[]>();
  const neighborsById = new Map<string, string[]>();

  for (const node of graph.nodes) {
    indegree.set(node.id, 0);
    outdegree.set(node.id, 0);
    parentsById.set(node.id, []);
    childrenById.set(node.id, []);
    neighborsById.set(node.id, []);
  }

  for (const edge of graph.edges) {
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    outdegree.set(edge.source, (outdegree.get(edge.source) ?? 0) + 1);
    parentsById.get(edge.target)?.push(edge.source);
    childrenById.get(edge.source)?.push(edge.target);
    neighborsById.get(edge.source)?.push(edge.target);
    neighborsById.get(edge.target)?.push(edge.source);
  }

  for (const node of graph.nodes) {
    parentsById.set(node.id, unique(parentsById.get(node.id) ?? []));
    childrenById.set(node.id, unique(childrenById.get(node.id) ?? []));
    neighborsById.set(node.id, unique(neighborsById.get(node.id) ?? []));
  }

  return { indegree, outdegree, parentsById, childrenById, neighborsById };
}

export function resolveLayoutRoots(
  graph: KnowledgeGraph,
  metrics: GraphMetrics
): string[] {
  const roots = graph.nodes
    .filter((node) => (metrics.indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id)
    .sort((a, b) => {
      const degreeDiff = nodeDegree(metrics, b) - nodeDegree(metrics, a);
      return degreeDiff !== 0 ? degreeDiff : a.localeCompare(b);
    });
  if (roots.length > 0) return roots;

  return [...graph.nodes]
    .sort((a, b) => {
      const outDiff =
        (metrics.outdegree.get(b.id) ?? 0) -
        (metrics.outdegree.get(a.id) ?? 0);
      if (outDiff !== 0) return outDiff;
      const degreeDiff = nodeDegree(metrics, b.id) - nodeDegree(metrics, a.id);
      return degreeDiff !== 0 ? degreeDiff : a.id.localeCompare(b.id);
    })
    .slice(0, 1)
    .map((node) => node.id);
}

export function buildDepthMap(
  graph: KnowledgeGraph,
  roots: string[],
  metrics: GraphMetrics
): Map<string, number> {
  const depthById = new Map<string, number>();
  const queue = roots.map((id) => ({ id, depth: 0 }));

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    const knownDepth = depthById.get(next.id);
    if (knownDepth !== undefined && knownDepth <= next.depth) continue;

    depthById.set(next.id, next.depth);
    for (const childId of metrics.childrenById.get(next.id) ?? []) {
      queue.push({ id: childId, depth: next.depth + 1 });
    }
  }

  for (const node of graph.nodes) {
    if (!depthById.has(node.id)) depthById.set(node.id, 0);
  }
  return depthById;
}
