// Real SQLite + application parser/store/route; Supabase session is the only auth stub.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const ts = require("typescript");
const cache = new Map();
let authenticated = true;
let failAt = -1;
const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys = ON");
for (const name of fs.readdirSync("drizzle").filter(name => name.endsWith(".sql")).sort()) {
  sqlite.exec(fs.readFileSync(`drizzle/${name}`, "utf8"));
}
sqlite.prepare("INSERT INTO categories (id, label) VALUES (?, ?)").run("test", "导入测试");
const db = {
  prepare(sql) {
    const statement = {
      sql, params: [],
      bind(...params) { return { ...statement, params }; },
      async first() { return sqlite.prepare(this.sql).get(...this.params) ?? null; },
    };
    return statement;
  },
  async batch(statements) {
    sqlite.exec("BEGIN");
    try {
      statements.forEach((statement, index) => {
        if (index === failAt) throw new Error("simulated write failure");
        sqlite.prepare(statement.sql).run(...statement.params);
      });
      sqlite.exec("COMMIT");
    } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  },
};

function load(filename) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const requireSource = name => {
    if (name === "@/db") return { getD1: () => db };
    if (name === "@/app/lib/auth") return { requireApiUser: async () => {
      if (!authenticated) throw new (load("app/lib/route-utils.ts").RequestError)("请先登录", 401);
      return { id: "test-user" };
    } };
    const target = name.startsWith("@/") ? path.resolve(name.slice(2)) : path.resolve(path.dirname(filename), name);
    return load(target + ".ts");
  };
  new Function("require", "module", "exports", code)(requireSource, module, module.exports);
  return module.exports;
}
const { parseGraphImport } = load("app/lib/graph-import.ts");
const { saveGraphImport } = load("app/lib/graph-import-store.ts");
const { POST } = load("app/api/graphs/import/route.ts");
const { IMPORT_EXAMPLE } = load("app/components/original-workspace/graph-import-example.ts");
const nodes = [
  { id: "a", label: "节点 A", tags: ["数据库", "数据库"], links: [{ target: "b", type: "Concept", label: "包含" }] },
  { id: "b", label: "节点 B" },
];
const json = value => JSON.stringify(value);
const count = table => Number(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n);
const totals = () => [count("graphs"), count("nodes"), count("edges")];
const request = value => new Request("https://example.test/api/graphs/import", {
  method: "POST", body: json(value), headers: { "Content-Type": "application/json" },
});
const tests = [];
const test = (name, run) => tests.push([name, run]);

test("legacy node array, current example and fenced AI JSON parse", () => {
  assert.equal(parseGraphImport(json(nodes), "测试").graphs[0].graphLabel, "测试");
  assert.equal(parseGraphImport(IMPORT_EXAMPLE).edgeCount, 1);
  assert.equal(parseGraphImport("```json\n" + IMPORT_EXAMPLE + "\n```").nodeCount, 2);
  assert.deepEqual(parseGraphImport(json(nodes)).graphs[0].nodes[0].tags, ["数据库"]);
});
test("bundle permits graph-local node IDs and retains labels", () => {
  const result = parseGraphImport(json({ categoryId: "ignored", graphs: [
    { graphId: "first", graphLabel: "第一个", nodes }, { graphId: "second", graphLabel: "第二个", nodes },
  ] }));
  assert.equal(result.nodeCount, 4); assert.equal(result.edgeCount, 2);
  assert.equal(result.graphs[1].graphLabel, "第二个");
});
test("malformed, duplicate IDs, dangling links and invalid field types are rejected", () => {
  for (const input of ["bad", "null", "[]", json([{ id: "a", label: "" }]),
    json([nodes[1], nodes[1]]), json([nodes[0]]), json([{ ...nodes[1], tags: null }]),
    json([{ ...nodes[1], links: [{ target: "b", type: 1 }] }]),
    json({ graphs: [{ graphId: "same", nodes }, { graphId: "same", nodes }] })]) {
    assert.throws(() => parseGraphImport(input));
  }
});
test("bounded imports reject oversized text and record counts", () => {
  assert.throws(() => parseGraphImport(" ".repeat(200001)), /20 万/);
  assert.throws(() => parseGraphImport(json(Array.from({ length: 400 }, (_, i) => ({ id: String(i), label: "N" })))), /400/);
});
test("database saves graph, tags and correctly scoped relationship endpoints", async () => {
  const result = await saveGraphImport(db, "test", parseGraphImport(IMPORT_EXAMPLE));
  assert.deepEqual(totals(), [1, 2, 1]);
  const edge = sqlite.prepare(`SELECT e.label, s.node_key source, t.node_key target
    FROM edges e JOIN nodes s ON s.id=e.source_node_id JOIN nodes t ON t.id=e.target_node_id
    WHERE e.graph_id=?`).get(result.graphIds[0]);
  assert.equal(edge.source, "dbcontext"); assert.equal(edge.target, "dbset"); assert.equal(edge.label, "包含");
  assert.equal(sqlite.prepare("SELECT tags FROM nodes WHERE node_key='dbset'").get().tags, '["EF Core"]');
});
test("repeated imports create copies without overwriting", async () => {
  await saveGraphImport(db, "test", parseGraphImport(IMPORT_EXAMPLE));
  assert.deepEqual(totals(), [2, 4, 2]);
  assert.equal(sqlite.prepare("SELECT COUNT(DISTINCT slug) n FROM graphs").get().n, 2);
});
test("mid-batch failure rolls back every new record", async () => {
  const before = totals(); failAt = 2;
  await assert.rejects(() => saveGraphImport(db, "test", parseGraphImport(IMPORT_EXAMPLE)), /simulated/);
  failAt = -1; assert.deepEqual(totals(), before);
});
test("nonexistent category writes nothing", async () => {
  const before = totals();
  await assert.rejects(() => saveGraphImport(db, "missing", parseGraphImport(IMPORT_EXAMPLE)), /分类不存在/);
  assert.deepEqual(totals(), before);
});
test("route authenticates before processing and rejects invalid JSON without writes", async () => {
  const before = totals(); authenticated = false;
  assert.equal((await POST(request({}))).status, 401); authenticated = true;
  assert.equal((await POST(request({ categoryId: "test", rawText: "invalid" }))).status, 400);
  assert.equal((await POST(request([]))).status, 400);
  assert.equal((await POST(request({ categoryId: "missing", rawText: IMPORT_EXAMPLE }))).status, 404);
  assert.deepEqual(totals(), before);
});
test("route bounds request bodies and persists multiple graphs with reused local IDs", async () => {
  assert.equal((await POST(request({ rawText: "x".repeat(1024 * 1024) }))).status, 413);
  const response = await POST(request({ categoryId: "test", rawText: json({ graphs: [
    { graphId: "one", nodes }, { graphId: "two", nodes },
  ] }) }));
  assert.equal(response.status, 201); const result = await response.json();
  assert.equal(result.graphCount, 2); assert.equal(result.edgeCount, 2);
  const rows = sqlite.prepare(`SELECT e.graph_id = s.graph_id AND e.graph_id = t.graph_id AS valid
    FROM edges e JOIN nodes s ON e.source_node_id=s.id JOIN nodes t ON e.target_node_id=t.id`).all();
  assert.ok(rows.every(row => row.valid === 1));
});

(async () => {
  let failures = 0;
  const logError = console.error;
  for (const [name, run] of tests) {
    try { console.error = () => {}; await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; logError(`FAIL ${name}`, error); }
    finally { console.error = logError; }
  }
  sqlite.close(); process.exitCode = failures ? 1 : 0;
})();
