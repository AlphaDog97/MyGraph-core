import cytoscape from "cytoscape";

export type GraphTheme = "light" | "dark";

// Cytoscape's stylesheet union is narrower than several data-driven values.
// Keep the cast isolated in this adapter instead of spreading `any` through the component.
export function buildGraphCanvasStyles(
  noMotion: boolean,
  theme: GraphTheme
): any[] {
  const dark = theme === "dark";
  const nodeBackground = dark ? "#151b27" : "#ffffff";
  const nodeSelectedBackground = dark ? "#20283a" : "#f7f7ff";
  const nodeText = dark ? "#f3f6fb" : "#182033";
  const nodeTextOutline = dark ? "#151b27" : "#ffffff";
  const edgeTextOutline = dark ? "#0b0f17" : "#f7f9fc";
  const shadowColor = dark ? "#000000" : "#667085";

  return [
    {
      selector: "node",
      style: {
        shape: "roundrectangle",
        label: "data(label)",
        "background-color": nodeBackground,
        "border-width": 2,
        "border-color": "data(borderColor)",
        "text-valign": "center",
        "text-halign": "center",
        "font-family": "Inter, ui-sans-serif, system-ui, sans-serif",
        "font-size": "12.5px",
        "font-weight": 550,
        color: nodeText,
        "text-outline-color": nodeTextOutline,
        "text-outline-width": 1.5,
        width: "label",
        "min-width": 104,
        height: 34,
        "min-height": 34,
        padding: 13,
        "text-wrap": "none",
        "overlay-padding": 6,
        "overlay-opacity": 0,
        "shadow-color": shadowColor,
        "shadow-blur": 16,
        "shadow-opacity": dark ? 0.28 : 0.14,
        "shadow-offset-y": 4,
        "transition-property":
          "border-color, border-width, opacity, background-color, shadow-opacity, shadow-blur",
        "transition-duration": noMotion ? 0 : 180,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: "edge",
      style: {
        width: 1.7,
        opacity: 0.68,
        "line-color": "data(edgeColor)",
        "target-arrow-color": "data(edgeColor)",
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.78,
        "curve-style": "bezier",
        label: "data(label)",
        "font-family": "Inter, ui-sans-serif, system-ui, sans-serif",
        "font-size": "9.5px",
        "font-weight": 500,
        color: "data(edgeColor)",
        "text-rotation": "autorotate",
        "text-outline-color": edgeTextOutline,
        "text-outline-width": 2,
        "text-background-opacity": 0,
        "transition-property": "opacity, line-color, width",
        "transition-duration": noMotion ? 0 : 180,
      } as unknown as cytoscape.Css.Edge,
    },
    { selector: "node.dimmed", style: { opacity: 0.1 } },
    { selector: "edge.dimmed", style: { opacity: 0.035 } },
    {
      selector: "node.highlighted",
      style: {
        "border-width": 4,
        "background-color": nodeSelectedBackground,
        "font-weight": 650,
        "shadow-opacity": dark ? 0.45 : 0.22,
        "shadow-blur": 24,
      },
    },
    {
      selector: "node.selected-node",
      style: {
        "border-width": 4,
        "background-color": nodeSelectedBackground,
        "font-weight": 650,
        "shadow-opacity": dark ? 0.5 : 0.24,
        "shadow-blur": 26,
      },
    },
  ];
}
