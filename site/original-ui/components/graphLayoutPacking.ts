import type cytoscape from "cytoscape";
import type { KnowledgeGraph } from "../domain/types";
import type { LayoutPlan } from "./graphLayoutRadial";

export interface MeasuredLayoutPlan extends LayoutPlan {
  width: number;
  height: number;
  minX: number;
  minY: number;
}

interface PackedRow {
  plans: MeasuredLayoutPlan[];
  width: number;
  height: number;
}

const NODE_FOOTPRINT_X = 150;
const NODE_FOOTPRINT_Y = 86;
const GROUP_HORIZONTAL_GAP = 260;
const GROUP_VERTICAL_GAP = 220;
const TARGET_ASPECT_RATIO = 1.35;

export function measureLayoutPlan(plan: LayoutPlan): MeasuredLayoutPlan {
  const values = [...plan.positions.values()];
  if (values.length === 0) {
    return { ...plan, width: 0, height: 0, minX: 0, minY: 0 };
  }

  const xs = values.map((position) => position.x);
  const ys = values.map((position) => position.y);
  const minX = Math.min(...xs) - NODE_FOOTPRINT_X / 2;
  const maxX = Math.max(...xs) + NODE_FOOTPRINT_X / 2;
  const minY = Math.min(...ys) - NODE_FOOTPRINT_Y / 2;
  const maxY = Math.max(...ys) + NODE_FOOTPRINT_Y / 2;

  return {
    ...plan,
    width: Math.max(NODE_FOOTPRINT_X, maxX - minX),
    height: Math.max(NODE_FOOTPRINT_Y, maxY - minY),
    minX,
    minY,
  };
}

function createRows(plans: MeasuredLayoutPlan[]): PackedRow[] {
  const totalArea = plans.reduce(
    (sum, plan) =>
      sum +
      (plan.width + GROUP_HORIZONTAL_GAP) *
        (plan.height + GROUP_VERTICAL_GAP),
    0
  );
  const widestPlan = Math.max(...plans.map((plan) => plan.width), 0);
  const targetWidth = Math.max(
    widestPlan,
    Math.sqrt(totalArea * TARGET_ASPECT_RATIO)
  );
  const rows: PackedRow[] = [];

  for (const plan of plans) {
    const current = rows[rows.length - 1];
    const nextWidth = current
      ? current.width + GROUP_HORIZONTAL_GAP + plan.width
      : plan.width;
    if (current && nextWidth <= targetWidth) {
      current.plans.push(plan);
      current.width = nextWidth;
      current.height = Math.max(current.height, plan.height);
      continue;
    }
    rows.push({ plans: [plan], width: plan.width, height: plan.height });
  }

  return rows;
}

export function packLayoutPlans(plans: MeasuredLayoutPlan[]): LayoutPlan {
  if (plans.length === 0) {
    return { depthById: new Map(), positions: new Map() };
  }
  if (plans.length === 1) return plans[0];

  const rows = createRows(plans);
  const totalHeight =
    rows.reduce((sum, row) => sum + row.height, 0) +
    Math.max(0, rows.length - 1) * GROUP_VERTICAL_GAP;
  const depthById = new Map<string, number>();
  const positions = new Map<string, cytoscape.Position>();
  let rowY = -totalHeight / 2;

  for (const row of rows) {
    let columnX = -row.width / 2;
    for (const plan of row.plans) {
      const offsetX = columnX - plan.minX;
      const offsetY = rowY + (row.height - plan.height) / 2 - plan.minY;

      plan.depthById.forEach((depth, nodeId) => depthById.set(nodeId, depth));
      plan.positions.forEach((position, nodeId) => {
        positions.set(nodeId, {
          x: position.x + offsetX,
          y: position.y + offsetY,
        });
      });
      columnX += plan.width + GROUP_HORIZONTAL_GAP;
    }
    rowY += row.height + GROUP_VERTICAL_GAP;
  }

  return { depthById, positions };
}

export function createGraphGroups(graph: KnowledgeGraph): KnowledgeGraph[] {
  const nodeIdsByGroup = new Map<string, Set<string>>();
  for (const node of graph.nodes) {
    const source = node.provenance[0];
    const key = source
      ? `${source.categoryId}::${source.graphId}`
      : "__ungrouped";
    const nodeIds = nodeIdsByGroup.get(key) ?? new Set<string>();
    nodeIds.add(node.id);
    nodeIdsByGroup.set(key, nodeIds);
  }

  return [...nodeIdsByGroup.values()].map((nodeIds) => ({
    nodes: graph.nodes.filter((node) => nodeIds.has(node.id)),
    edges: graph.edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    ),
    tags: graph.tags,
    warnings: [],
  }));
}
