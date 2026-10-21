// Real Cytoscape viewport checks; pixel rendering still requires browser QA.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const cytoscape = require("cytoscape");
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  new Function("require", "module", "exports", code)(require, module, module.exports);
  return module.exports;
}
const { focusGraph, READABLE_GRAPH_ZOOM, readableGraphViewport } = load("original-ui/components/graphCanvasViewport.ts");
const { buildGraphCanvasStyles } = load("original-ui/components/graphCanvasStyles.ts");
const { graphAtPosition, nodeGraphId } = load("original-ui/components/graphCanvasSelection.ts");
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.001, `${actual} != ${expected}`);
function setup(width = 1200, height = 800) {
  const cy = cytoscape({ headless: true, styleEnabled: true, minZoom: 0.1, maxZoom: 4,
    layout: { name: "preset" },
    style: [...buildGraphCanvasStyles(true, "light"), { selector: "node", style: { width: 110 } }],
    elements: [
      { data: { id: "root", label: "主节点", borderColor: "#aaa" }, position: { x: 2000, y: 1000 } },
      { data: { id: "left", label: "左分支", borderColor: "#aaa" }, position: { x: 0, y: 0 } },
      { data: { id: "right", label: "右分支", borderColor: "#aaa" }, position: { x: 4000, y: 2000 } },
      { data: { id: "other", label: "另一图谱", borderColor: "#aaa" }, position: { x: 20000, y: 10000 } },
      { data: { id: "edge1", source: "root", target: "left", edgeColor: "#aaa", label: "关系" } },
      { data: { id: "edge2", source: "root", target: "right", edgeColor: "#aaa", label: "关系" } },
    ],
  });
  cy.width = () => width; cy.height = () => height;
  const nodeById = new Map(cy.nodes().map(node => [node.id(), {
    provenance: [{ graphId: node.id() === "other" ? "b" : "a" }],
  }]));
  return { cy, nodeById };
}
const tests = [
  ["cluster bounds select only an unambiguous graph and preserve shared-node ownership", () => {
    const { cy, nodeById } = setup();
    try {
      for (const node of cy.nodes()) nodeById.get(node.id()).id = node.id();
      assert.equal(graphAtPosition(cy, nodeById, { x: 2000, y: 1000 }), "a");
      assert.equal(graphAtPosition(cy, nodeById, { x: 20000, y: 10000 }), "b");
      assert.equal(graphAtPosition(cy, nodeById, { x: 10000, y: 5000 }), undefined);
      assert.equal(graphAtPosition(cy, nodeById), undefined);
      nodeById.get("root").provenance.push({ graphId: "shared" });
      assert.equal(graphAtPosition(cy, nodeById, { x: 2000, y: 1000 }), undefined);
      assert.equal(nodeGraphId(nodeById.get("root"), "shared"), "shared");
    } finally { cy.destroy(); }
  }],
  ["large graph reaches readable node and edge label sizes", () => {
    const { cy, nodeById } = setup();
    try {
      focusGraph(cy, "a", nodeById, 0);
      close(cy.zoom(), READABLE_GRAPH_ZOOM);
      assert.ok(cy.$id("root").numericStyle("font-size") * cy.zoom() >= 18);
      assert.ok(cy.$id("edge1").numericStyle("font-size") * cy.zoom() >= 14);
      const rendered = cy.$id("root").renderedPosition(); close(rendered.x, 600); close(rendered.y, 400);
    } finally { cy.destroy(); }
  }],
  ["mobile viewport retains readable scale instead of shrinking the full graph", () => {
    const { cy, nodeById } = setup(320, 480);
    try { focusGraph(cy, "a", nodeById, 0); close(cy.zoom(), 1.5);
      const p = cy.$id("root").renderedPosition(); close(p.x, 160); close(p.y, 240);
    } finally { cy.destroy(); }
  }],
  ["small graph centers separately with a bounded zoom", () => {
    const { cy, nodeById } = setup();
    try { focusGraph(cy, "b", nodeById, 0); assert.ok(cy.zoom() >= 1.5 && cy.zoom() <= 2);
      const p = cy.$id("other").renderedPosition(); close(p.x, 600); close(p.y, 400);
    } finally { cy.destroy(); }
  }],
  ["category overview still fits all graphs", () => {
    const { cy, nodeById } = setup();
    try { focusGraph(cy, "a", nodeById, 0); focusGraph(cy, null, nodeById, 0); assert.ok(cy.zoom() < 1.5); }
    finally { cy.destroy(); }
  }],
  ["unknown graph and hidden container leave the viewport alone", () => {
    const { cy, nodeById } = setup();
    try { const before = { zoom: cy.zoom(), pan: cy.pan() };
      focusGraph(cy, "missing", nodeById, 0);
      assert.deepEqual({ zoom: cy.zoom(), pan: cy.pan() }, before);
      cy.width = () => 0; assert.equal(readableGraphViewport(cy, cy.elements()), null);
    } finally { cy.destroy(); }
  }],
  ["rapid graph switches clear queued movement and share the instant target", () => {
    const { cy, nodeById } = setup();
    try { const moves = [], stops = [];
      cy.stop = (...args) => { stops.push(args); return cy; };
      cy.animate = options => { moves.push(options); return cy; };
      focusGraph(cy, "a", nodeById, 420); focusGraph(cy, "b", nodeById, 420);
      assert.equal(moves.length, 2); assert.ok(moves.every(move => move.queue === false));
      assert.ok(stops.every(args => args[0] === true && args[1] === false));
      const animatedTarget = moves[1]; focusGraph(cy, "b", nodeById, 0);
      close(cy.zoom(), animatedTarget.zoom); close(cy.pan().x, animatedTarget.pan.x); close(cy.pan().y, animatedTarget.pan.y);
    } finally { cy.destroy(); }
  }],
];
let failures = 0;
for (const [name, run] of tests) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}`, error); }
}
process.exitCode = failures ? 1 : 0;
