import assert from "node:assert/strict";
import {
  HttpGraphSource,
  MemoryKeyValueStorage,
  aggregateGraphsToKnowledgeGraph,
  buildGraphFromRaw,
  loadAllGraphsAsKnowledgeGraph,
  loadTagColors,
  saveTagColors,
} from "../dist/index.js";

const diagnosticGraph = buildGraphFromRaw(
  [
    {
      id: "root",
      label: "Root",
      tags: ["core"],
      links: [
        { target: "missing", type: "Unknown", label: "broken" },
        { target: "root", type: "Concept", label: "self" },
      ],
    },
  ],
  "tests",
  "diagnostics"
);
assert.ok(
  diagnosticGraph.diagnostics?.some((item) => item.code === "BROKEN_LINK"),
  "broken links should produce structured diagnostics"
);
assert.ok(
  diagnosticGraph.diagnostics?.some((item) => item.code === "UNKNOWN_EDGE_TYPE"),
  "unknown edge types should produce structured diagnostics"
);

const scopedGraph = aggregateGraphsToKnowledgeGraph([
  {
    categoryId: "category-a",
    graphId: "graph-a",
    graphLabel: "Graph A",
    nodes: [{ id: "shared", label: "A", tags: [] }],
  },
  {
    categoryId: "category-b",
    graphId: "graph-b",
    graphLabel: "Graph B",
    nodes: [{ id: "shared", label: "B", tags: [] }],
  },
]);
assert.equal(scopedGraph.nodes.length, 2, "local IDs must not merge across graphs");
assert.notEqual(scopedGraph.nodes[0].id, scopedGraph.nodes[1].id);
assert.ok(scopedGraph.nodes.every((node) => node.isAggregate));
assert.ok(scopedGraph.nodes.every((node) => node.provenance.length === 1));

const conceptGraph = aggregateGraphsToKnowledgeGraph([
  {
    categoryId: "category-a",
    graphId: "graph-a",
    graphLabel: "Graph A",
    nodes: [
      {
        id: "local-a",
        globalConceptId: "shared-concept",
        label: "Shared",
        tags: ["a"],
      },
    ],
  },
  {
    categoryId: "category-b",
    graphId: "graph-b",
    graphLabel: "Graph B",
    nodes: [
      {
        id: "local-b",
        globalConceptId: "shared-concept",
        label: "Shared",
        tags: ["b"],
      },
    ],
  },
]);
assert.equal(conceptGraph.nodes.length, 1, "globalConceptId should opt into merging");
assert.deepEqual(conceptGraph.nodes[0].tags.sort(), ["a", "b"]);
assert.equal(conceptGraph.nodes[0].provenance.length, 2);

let categoryFetchCount = 0;
const manifest = {
  categories: [
    {
      id: "cached",
      label: "Cached",
      graphs: [{ id: "one", label: "One" }],
    },
  ],
};
const categoryDocument = {
  schemaVersion: 1,
  categoryId: "cached",
  graphs: [
    {
      graphId: "one",
      graphLabel: "One",
      nodes: [{ id: "one", label: "One", tags: [] }],
    },
  ],
};

const originalFetch = globalThis.fetch;
let defaultFetchReceiver;
globalThis.fetch = function () {
  defaultFetchReceiver = this;
  return Promise.resolve(
    new Response(JSON.stringify(manifest), { status: 200 })
  );
};
try {
  const defaultSource = new HttpGraphSource({
    baseUrl: "https://example.test/graph-data/",
    cache: false,
  });
  await defaultSource.loadManifest();
  assert.equal(
    defaultFetchReceiver,
    globalThis,
    "default browser fetch must keep the global receiver"
  );
} finally {
  globalThis.fetch = originalFetch;
}

const source = new HttpGraphSource({
  baseUrl: "https://example.test/graph-data/",
  fetchImpl: async (input) => {
    const url = String(input);
    if (url.endsWith("manifest.json")) {
      return new Response(JSON.stringify(manifest), { status: 200 });
    }
    categoryFetchCount += 1;
    return new Response(JSON.stringify(categoryDocument), { status: 200 });
  },
});
await source.loadCategory("cached");
await source.loadCategory("cached");
assert.equal(categoryFetchCount, 1, "category requests should be cached");
const loaded = await loadAllGraphsAsKnowledgeGraph(manifest, source);
assert.equal(loaded.nodes.length, 1);

const storage = new MemoryKeyValueStorage();
saveTagColors({ core: "#123456" }, storage);
assert.deepEqual(loadTagColors(storage), { core: "#123456" });

console.log("MyGraph core smoke tests passed.");
