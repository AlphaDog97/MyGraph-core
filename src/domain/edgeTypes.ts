export const EDGE_TYPE_ORDER = ["Concept", "Description", "Condition", "Action"] as const;

const EDGE_TYPE_COLOR_MAP: Record<(typeof EDGE_TYPE_ORDER)[number], string> = {
  Concept: "#9ca3af",
  Description: "#22c55e",
  Condition: "#3b82f6",
  Action: "#facc15",
};

const normalizeEdgeType = (type: string): string => type.trim().toLowerCase();

export function resolveEdgeTypeColor(type: string): string {
  const normalized = normalizeEdgeType(type);

  if (normalized === "description") return EDGE_TYPE_COLOR_MAP.Description;
  if (normalized === "condition") return EDGE_TYPE_COLOR_MAP.Condition;
  if (normalized === "action") return EDGE_TYPE_COLOR_MAP.Action;
  return EDGE_TYPE_COLOR_MAP.Concept;
}

export function edgeTypeLegendItems() {
  return EDGE_TYPE_ORDER.map((type) => ({
    type,
    color: EDGE_TYPE_COLOR_MAP[type],
  }));
}
