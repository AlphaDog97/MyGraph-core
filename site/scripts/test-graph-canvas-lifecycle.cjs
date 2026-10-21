// Hook-level regression checks. These do not replace authenticated browser QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const selectionExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('original-ui/components/graphCanvasSelection.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: selectionExports });

function mount({ width = 900, height = 600 } = {}) {
  const slots = [], pending = [], observers = [], instances = [];
  const container = { clientWidth: width, clientHeight: height };
  let cursor = 0, frameId = 0;
  const frames = new Map();
  const changed = (a, b) => !a || a.length !== b.length || a.some((v, i) => v !== b[i]);
  const hooks = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useMemo(fn, deps) {
      const i = cursor++;
      if (changed(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() };
      return slots[i].value;
    },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const i = cursor++;
      if (changed(slots[i]?.deps, deps)) pending.push(() => {
        slots[i]?.cleanup?.();
        slots[i] = { deps, cleanup: fn() };
      });
    },
  };
  function collection() {
    const c = { length: 2, contains: () => true };
    for (const name of ['filter', 'connectedEdges', 'connectedNodes', 'union', 'removeClass', 'addClass']) c[name] = () => c;
    c.forEach = fn => fn({ id: () => 'n1', data() {} });
    return c;
  }
  const cyFactory = options => {
    const c = collection();
    const cy = {
      options, dead: false, renders: 0, fits: 0, styles: 0, handlers: {}, focusTargets: [],
      destroy() { this.dead = true; }, destroyed() { return this.dead; },
      elements: () => c, nodes: () => c,
      resize() { assert.equal(this.dead, false, 'resize must target the live canvas'); },
      fit() { this.fits++; }, center() {}, stop() {}, animate() {},
      forceRender() { this.renders++; }, batch(fn) { fn(); },
      on(events, selector, handler) { this.handlers[handler ? `${events}:${selector}` : events] = handler ?? selector; },
      style() { const s = { fromJson: () => s, update: () => { cy.styles++; } }; return s; },
    };
    instances.push(cy);
    return cy;
  };
  const context = {
    exports: {}, window: {
      matchMedia: () => ({ matches: false }),
      requestAnimationFrame(fn) { const id = ++frameId; frames.set(id, fn); return id; },
      cancelAnimationFrame(id) { frames.delete(id); },
    }, document: {}, ResizeObserver: class {
      constructor(fn) { this.fn = fn; this.active = true; observers.push(this); }
      observe() {} disconnect() { this.active = false; }
    },
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'cytoscape') return cyFactory;
      if (name.endsWith('/loader')) return { toCytoscapeElements: () => [] };
      if (name.endsWith('/graphCanvasStyles')) return { buildGraphCanvasStyles: () => [] };
      if (name.endsWith('/graphCanvasViewport')) return { focusGraph: (cy, id) => { cy.focusTargets.push(id); cy.fit(); } };
      if (name.endsWith('/graphCanvasSelection')) return selectionExports;
      if (name.endsWith('/graphCanvasTooltip')) return { createTooltipState: () => null };
      if (name.endsWith('/GraphConnectionOverlay')) return () => null;
      if (name.endsWith('/graphCanvasLayout')) return {
        createGraphLayoutPlan: () => ({ positions: {} }), initialGraphLayout: () => ({}),
        runLayoutWithAdaptiveFit: (_cy, _motion, _positions, ready) => ready(),
      };
      if (name.endsWith('.css')) return {};
      throw new Error(name);
    },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('original-ui/components/GraphCanvas.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, context);
  const props = {
    graph: { nodes: [{ id: 'n1', resolveBorderColor: () => '#abc', searchText: () => 'node', provenance: [] }] },
    cyRef: { current: null }, tagColors: {}, theme: 'light', searchQuery: '', onNodeSelect() {},
  };
  function attach(element) {
    if (!element?.props) return;
    if (element.props.ref) element.props.ref.current = container;
    [].concat(element.props.children ?? []).forEach(attach);
  }
  function render(next = {}) {
    Object.assign(props, next); cursor = 0;
    attach(context.exports.default(props));
    pending.splice(0).forEach(fn => fn());
  }
  function resize() { observers.filter(o => o.active).forEach(o => o.fn()); }
  render();
  return { render, resize, props, container, instances, frames,
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

const cases = [
  ['canvas node selection focuses its graph before opening node details', () => {
    const app = mount(), focused = [], selected = [];
    const node = app.props.graph.nodes[0]; node.provenance = [{ graphId: 'graph-one' }];
    app.render({ onGraphFocus: id => focused.push(id), onNodeSelect: value => selected.push(value) });
    const cy = app.instances[0], event = { target: { id: () => node.id, addClass() {} } };
    cy.handlers['tap:node'](event);
    assert.deepEqual(focused, ['graph-one']); assert.equal(selected.at(-1), null);
    app.render({ focusedGraphId: focused.at(-1) });
    assert.equal(cy.focusTargets.at(-1), 'graph-one'); assert.equal(app.instances.length, 1);
    cy.handlers['tap:node'](event); assert.equal(selected.at(-1), node);
    app.unmount();
  }],
  ['edge selection switches graphs using the latest focus callback without rebuilding', () => {
    const app = mount(), focused = [];
    app.props.graph.nodes[0].provenance = [{ graphId: 'graph-two' }];
    app.render({ focusedGraphId: 'graph-one', onGraphFocus: () => { throw new Error('stale callback'); } });
    app.render({ onGraphFocus: id => focused.push(id) });
    app.instances[0].handlers['tap:edge']({ target: { source: () => ({ id: () => 'n1' }) } });
    assert.deepEqual(focused, ['graph-two']); assert.equal(app.instances.length, 1);
    app.unmount();
  }],
  ['edge in the focused graph opens the independent edge editor', () => {
    const app = mount(), edited = [];
    app.props.graph.nodes[0].provenance = [{ graphId: 'graph-one' }];
    app.render({ focusedGraphId: 'graph-one', onGraphFocus() {}, onEdgeSelect: id => edited.push(id) });
    app.instances[0].handlers['tap:edge']({ target: { id: () => 'edge-one', source: () => ({ id: () => 'n1' }) } });
    assert.deepEqual(edited, ['edge-one']); assert.equal(app.instances.length, 1); app.unmount();
  }],
  ['overview cluster background click selects the graph but ordinary background does not', () => {
    const app = mount(), focused = [];
    app.props.graph.nodes[0].provenance = [{ graphId: 'graph-one' }];
    app.render({ onGraphFocus: id => focused.push(id) });
    const cy = app.instances[0];
    cy.getElementById = id => ({ id });
    cy.collection = () => ({ length: 0, union() { this.length++; return this; },
      boundingBox: () => ({ x1: 0, y1: 0, x2: 100, y2: 100 }) });
    cy.handlers.tap({ target: cy, position: { x: 50, y: 50 } });
    cy.handlers.tap({ target: cy, position: { x: 500, y: 500 } });
    assert.deepEqual(focused, ['graph-one']); app.unmount();
  }],
  ['callers without graph-focus support retain direct node selection', () => {
    const app = mount(), selected = [];
    app.props.graph.nodes[0].provenance = [{ graphId: 'graph-one' }];
    app.render({ onNodeSelect: node => selected.push(node) });
    app.instances[0].handlers['tap:node']({ target: { id: () => 'n1', addClass() {} } });
    assert.equal(selected.at(-1), app.props.graph.nodes[0]); app.unmount();
  }],
  ['ordinary parent renders retain the live renderer and resize observer', () => {
    const app = mount(); app.render({ onNodeSelect() {} });
    assert.equal(app.instances.length, 1, 'callback changes must not rebuild Cytoscape');
    app.resize(); app.unmount();
  }],
  ['theme changes update styles without reconstructing the graph', () => {
    const app = mount(); app.render({ theme: 'dark', onNodeSelect() {} });
    assert.equal(app.instances.length, 1); assert.ok(app.instances[0].styles > 0); app.unmount();
  }],
  ['zero-sized startup waits until the canvas has a usable size', () => {
    const app = mount({ width: 0, height: 0 }); assert.equal(app.instances.length, 0);
    app.container.clientWidth = 900; app.container.clientHeight = 600;
    app.resize(); app.render(); assert.equal(app.instances.length, 1);
    assert.ok(app.instances[0].fits > 0); app.unmount();
  }],
  ['graph replacement binds resize to the new renderer', () => {
    const app = mount(); app.render({ graph: { ...app.props.graph, nodes: [...app.props.graph.nodes] } });
    assert.equal(app.instances.length, 2); assert.ok(app.instances[0].dead);
    app.resize(); app.unmount(); assert.ok(app.instances[1].dead); assert.equal(app.props.cyRef.current, null);
  }],
  ['unmount cancels deferred initialization', () => {
    const app = mount({ width: 0, height: 0 }); app.unmount();
    app.container.clientWidth = 900; app.container.clientHeight = 600;
    app.resize(); app.frames.forEach(fn => fn()); assert.equal(app.instances.length, 0);
  }],
];
let failures = 0;
for (const [name, run] of cases) {
  try { run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
process.exitCode = failures ? 1 : 0;
