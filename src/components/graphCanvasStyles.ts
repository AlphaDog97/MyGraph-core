import cytoscape from "cytoscape";

export type GraphTheme = "light" | "dark";

// Cytoscape's stylesheet union is narrower than several data-driven values.
// Keep the cast isolated in this adapter instead of spreading `any` through the component.
export function buildGraphCanvasStyles(
  noMotion: boolean,
  theme: GraphTheme
): any[] {
  const nodeBackground = theme === "dark" ? "#1f2937" : "#f7fafc";
  const nodeText = theme === "dark" ? "#e5e7eb" : "#2d3748";
  const nodeTextOutline = theme === "dark" ? "#111827" : "#ffffff";
  const edgeTextOutline = theme === "dark" ? "#111827" : "#f7f8fa";

  return [
    {
      selector: "node",
      style: {
        shape: "roundrectangle",
        label: "data(label)",
        "background-color": nodeBackground,
        "border-width": 3,
        "border-color": "data(borderColor)",
        "text-valign": "center",
        "text-halign": "center",
        "font-family": "Inter, system-ui, sans-serif",
        "font-size": "13px",
        "font-weight": 500,
        color: nodeText,
        "text-outline-color": nodeTextOutline,
        "text-outline-width": 2,
        width: "label",
        "min-width": 110,
        height: 36,
        "min-height": 36,
        padding: 14,
        "text-wrap": "none",
        "overlay-padding": 4,
        "transition-property": "border-color, opacity, background-color",
        "transition-duration": noMotion ? 0 : 250,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: "edge",
      style: {
        width: 2.4,
        opacity: 0.95,
        "line-color": "data(edgeColor)",
        "target-arrow-color": "data(edgeColor)",
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.95,
        "curve-style": "bezier",
        label: "data(label)",
        "font-family": "Inter, system-ui, sans-serif",
        "font-size": "10px",
        color: "data(edgeColor)",
        "text-rotation": "autorotate",
        "text-outline-color": edgeTextOutline,
        "text-outline-width": 2,
        "transition-property": "opacity, line-color",
        "transition-duration": noMotion ? 0 : 250,
      } as unknown as cytoscape.Css.Edge,
    },
    { selector: "node.dimmed", style: { opacity: 0.15 } },
    { selector: "edge.dimmed", style: { opacity: 0.08 } },
    {
      selector: "node.highlighted",
      style: { "border-width": 5, "font-weight": 600 },
    },
    {
      selector: "node.selected-node",
      style: {
        "border-width": 4,
        "background-color": nodeBackground,
        "font-weight": 600,
      },
    },
  ];
}
