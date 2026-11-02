// Real SQLite exercises authenticated relation creation, edits, and graph boundaries.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys=ON');
const migrations=fs.readdirSync('drizzle').filter(name=>name.endsWith('.sql')).sort();
for(const name of migrations.slice(0,-1))sqlite.exec(fs.readFileSync(`drizzle/${name}`,'utf8'));
sqlite.prepare('INSERT INTO categories(id,label) VALUES (?,?)').run('c','测试');
for (const id of ['g1','g2']) sqlite.prepare('INSERT INTO graphs(id,category_id,slug,label) VALUES (?,?,?,?)').run(id,'c',id,id);
for (const [id, graph] of [['a','g1'],['b','g1'],['c','g1'],['other','g2']]) sqlite.prepare('INSERT INTO nodes(id,graph_id,node_key,label) VALUES (?,?,?,?)').run(id,graph,id,id);
sqlite.prepare('INSERT INTO edges(id,graph_id,source_node_id,target_node_id,type,label) VALUES (?,?,?,?,?,?)').run('legacy','g1','a','b','Concept','旧连线');
sqlite.exec(fs.readFileSync(`drizzle/${migrations.at(-1)}`,'utf8'));
sqlite.prepare('INSERT INTO app_meta(key,value) VALUES (?,?)').run('github_seed_v1','test');
const db = { prepare(sql) { return { params: [], bind(...params) { this.params=params; return this; },
  async first() { return sqlite.prepare(sql).get(...this.params) ?? null; },
  async all() { return { results: sqlite.prepare(sql).all(...this.params) }; },
  async run() { return { meta: { changes: sqlite.prepare(sql).run(...this.params).changes } }; },
}; } };
let authenticated=true;
const cache = new Map();
function load(filename) {
  filename=path.resolve(filename); if(cache.has(filename)) return cache.get(filename).exports;
  const module={exports:{}}; cache.set(filename,module);
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const requireSource=name=>{
    if(name==='@/data/seed')return{seedGraphs:[]};
    if(name==='@/db')return{getD1:()=>db};
    if(name==='@/app/lib/graph-store')return{newId:()=> 'test-edge'};
    if(name==='@/app/lib/auth')return{requireApiUser:async()=>{if(!authenticated)throw new(load('app/lib/route-utils.ts').RequestError)('请先登录',401);return{id:'tester'};}};
    return load((name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(filename),name))+'.ts');
  };
  new Function('require','module','exports',code)(requireSource,module,module.exports); return module.exports;
}
const {POST}=load('app/api/edges/route.ts');
const {PATCH,DELETE}=load('app/api/edges/[id]/route.ts');
const req=value=>new Request('https://example.test/api/edges',{method:'POST',body:JSON.stringify(value)});
const context=id=>({params:Promise.resolve({id})});
const edge=()=>sqlite.prepare('SELECT * FROM edges WHERE id=?').get('test-edge');
const tests=[]; const test=(name,run)=>tests.push([name,run]);
test('migration keeps old relations and defaults connection points to automatic',()=>{
  const legacy=sqlite.prepare('SELECT * FROM edges WHERE id=?').get('legacy');
  assert.equal(legacy.label,'旧连线');assert.equal(legacy.source_port,null);assert.equal(legacy.target_port,null);
});
test('requires login before creating or editing',async()=>{
  authenticated=false;
  assert.equal((await POST(req({}))).status,401);
  assert.equal((await PATCH(req({}),context('test-edge'))).status,401);
  authenticated=true;
});
test('creates the visually chosen directed connection',async()=>{
  assert.equal((await POST(req({graphId:'g1',sourceNodeId:'a',targetNodeId:'b',type:'Concept',label:'包含',sourcePort:'right',targetPort:'left'}))).status,201);
  assert.equal(edge().source_node_id,'a'); assert.equal(edge().target_node_id,'b'); assert.equal(edge().source_port,'right'); assert.equal(edge().target_port,'left');
});
test('edits endpoints, type and label and retains graph identity',async()=>{
  assert.equal((await PATCH(req({sourceNodeId:'b',targetNodeId:'c',type:'DependsOn',label:'依赖'}),context('test-edge'))).status,200);
  assert.equal(edge().source_node_id,'b'); assert.equal(edge().target_node_id,'c');
  assert.equal(edge().type,'DependsOn'); assert.equal(edge().label,'依赖'); assert.equal(edge().graph_id,'g1');
});
test('validates, updates, clears and retains saved connection points',async()=>{
  const payload={sourceNodeId:'b',targetNodeId:'c',type:'DependsOn',label:'依赖'};
  assert.equal(edge().source_port,'right'); assert.equal(edge().target_port,'left');
  assert.equal((await PATCH(req({...payload,sourcePort:'sideways'}),context('test-edge'))).status,400);
  assert.equal(edge().source_port,'right');
  assert.equal((await PATCH(req({...payload,sourcePort:'bottom',targetPort:'top'}),context('test-edge'))).status,200);
  assert.equal(edge().source_port,'bottom');assert.equal(edge().target_port,'top');
  const detail=await load('app/lib/graph-store.ts').getGraphDetail('g1');
  const reloaded=detail.edges.find(item=>item.id==='test-edge');
  assert.equal(reloaded.sourcePort,'bottom');assert.equal(reloaded.targetPort,'top');
  assert.equal((await PATCH(req({...payload,sourcePort:null,targetPort:null}),context('test-edge'))).status,200);
  assert.equal(edge().source_port,null);assert.equal(edge().target_port,null);
});
test('rejects foreign-graph and missing endpoints without changing the relation',async()=>{
  for(const target of ['other','missing']) {
    assert.equal((await PATCH(req({sourceNodeId:'a',targetNodeId:target,type:'Concept'}),context('test-edge'))).status,409);
    assert.equal(edge().source_node_id,'b'); assert.equal(edge().target_node_id,'c');
  }
});
test('returns not found for stale editor and permits deletion',async()=>{
  assert.equal((await PATCH(req({sourceNodeId:'a',targetNodeId:'b',type:'Concept'}),context('missing'))).status,404);
  assert.equal((await DELETE(req({}),context('test-edge'))).status,200); assert.equal(edge(),undefined);
});
(async()=>{let failures=0;for(const[name,run]of tests){try{await run();console.log(`PASS ${name}`);}catch(error){failures++;console.error(`FAIL ${name}`,error);}}sqlite.close();process.exitCode=failures?1:0;})();
