import type { Position } from "cytoscape";

type TooltipPlacement = "above" | "below";

export interface NodeTooltipState {
  description: string;
  x: number;
  y: number;
  placement: TooltipPlacement;
}

const TOOLTIP_MAX_WIDTH = 360;
const TOOLTIP_EDGE_GAP = 16;
const TOOLTIP_TOP_THRESHOLD = 120;

export function createTooltipState(
  container: HTMLDivElement,
  description: string,
  renderedPosition: Position
): NodeTooltipState | null {
  const text = description.trim();
  if (!text) return null;

  const availableWidth = Math.max(0, container.clientWidth - TOOLTIP_EDGE_GAP * 2);
  const tooltipWidth = Math.min(TOOLTIP_MAX_WIDTH, availableWidth);
  const horizontalInset = tooltipWidth / 2 + TOOLTIP_EDGE_GAP;
  const maxX = Math.max(horizontalInset, container.clientWidth - horizontalInset);
  const x = Math.min(Math.max(renderedPosition.x, horizontalInset), maxX);
  const y = Math.min(
    Math.max(renderedPosition.y, TOOLTIP_EDGE_GAP),
    Math.max(TOOLTIP_EDGE_GAP, container.clientHeight - TOOLTIP_EDGE_GAP)
  );

  return {
    description: text,
    x,
    y,
    placement: y < TOOLTIP_TOP_THRESHOLD ? "below" : "above",
  };
}

