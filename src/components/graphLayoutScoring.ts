import type cytoscape from "cytoscape";
import type { KnowledgeGraph } from "../domain/types";

const CROSSING_WEIGHT = 50_000;
const EDGE_LENGTH_WEIGHT = 0.002;

function orientation(
  a: cytoscape.Position,
  b: cytoscape.Position,
  c: cytoscape.Position
): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function segmentsCross(
  a: cytoscape.Position,
  b: cytoscape.Position,
  c: cytoscape.Position,
  d: cytoscape.Position
): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

export function scoreLayout(
  graph: KnowledgeGraph,
  positions: Map<string, cytoscape.Position>
): number {
  let crossings = 0;
  let edgeLength = 0;

  for (let leftIndex = 0; leftIndex < graph.edges.length; leftIndex += 1) {
    const left = graph.edges[leftIndex];
    const leftSource = positions.get(left.source);
    const leftTarget = positions.get(left.target);
    if (!leftSource || !leftTarget) continue;
    edgeLength += Math.hypot(
      leftTarget.x - leftSource.x,
      leftTarget.y - leftSource.y
    );

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < graph.edges.length;
      rightIndex += 1
    ) {
      const right = graph.edges[rightIndex];
      if (
        left.source === right.source ||
        left.source === right.target ||
        left.target === right.source ||
        left.target === right.target
      ) {
        continue;
      }
      const rightSource = positions.get(right.source);
      const rightTarget = positions.get(right.target);
      if (
        rightSource &&
        rightTarget &&
        segmentsCross(leftSource, leftTarget, rightSource, rightTarget)
      ) {
        crossings += 1;
      }
    }
  }

  return crossings * CROSSING_WEIGHT + edgeLength * EDGE_LENGTH_WEIGHT;
}
