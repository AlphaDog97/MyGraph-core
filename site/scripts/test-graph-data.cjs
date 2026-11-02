// Real Cytoscape verifies patches retain live geometry and fixed endpoints.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cytoscape = require('cytoscape');
const cache = new Map();
function load(file) {
  file=path.resolve(file); if(cache.has(file)) return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const requireSource=name=>name.startsWith('.')||name.startsWith('@/')
    ?load(path.resolve(name.startsWith('@/')?'.':path.dirname(file),name.startsWith('@/')?name.slice(2):name)+'.ts'):require(name);
  new Function('require','module','exports',code)(requireSource,module,module.exports);return module.exports;
}
const {KnowledgeNode}=load('original-ui/domain/types.ts');
const {toCytoscapeElements}=load('original-ui/data/loader.ts');
const {syncGraphElements}=load('original-ui/components/graphCanvasData.ts');
const {buildGraphCanvasStyles}=load('original-ui/components/graphCanvasStyles.ts');
const {toKnowledgeGraph}=load('app/components/original-workspace/graph-adapter.ts');
const graph={nodes:['a','b','c'].map(id=>new KnowledgeNode({id,label:id,tags:[]})),edges:[],tags:[],warnings:[]};
const cy=cytoscape({headless:true,styleEnabled:true,layout:{name:'preset'},style:buildGraphCanvasStyles(true,'light'),elements:toCytoscapeElements(graph,{})});
cy.$id('a').position({x:11,y:22}).addClass('selected-node');cy.$id('b').position({x:333,y:444});
cy.zoom(1.7);cy.pan({x:35,y:79});
const original=cy.$id('a')[0], positions=cy.nodes().map(n=>n.position()), viewport={zoom:cy.zoom(),pan:cy.pan()};
const unchanged=()=>{assert.equal(cy.$id('a')[0],original);assert.deepEqual(cy.nodes().map(n=>n.position()),positions);assert.deepEqual({zoom:cy.zoom(),pan:cy.pan()},viewport);assert.ok(cy.$id('a').hasClass('selected-node'));};
try {
  const edge={id:'e1',source:'a',target:'b',type:'Concept',label:'包含',sourcePort:'right',targetPort:'left'};
  syncGraphElements(cy,{...graph,edges:[edge]},{});unchanged();
  assert.equal(cy.$id('e1').style('curve-style'),'unbundled-bezier');
  assert.equal(cy.$id('e1').data('routed'),1);
  assert.equal(cy.$id('e1').data('sourceEndpoint'),'50% 0%');assert.equal(cy.$id('e1').data('targetEndpoint'),'-50% 0%');
  console.log('PASS adding an anchored edge retains renderer geometry, selection and viewport');
  syncGraphElements(cy,{...graph,edges:[{...edge,target:'c',sourcePort:'bottom',targetPort:'top',label:'修改'}]},{});unchanged();
  assert.equal(cy.$id('e1').target().id(),'c');assert.equal(cy.$id('e1').data('label'),'修改');assert.equal(cy.$id('e1').data('targetEndpoint'),'0% -50%');
  console.log('PASS edge endpoint and label edits patch the existing graph');
  syncGraphElements(cy,graph,{});unchanged();assert.equal(cy.edges().length,0);
  console.log('PASS deleting a relation leaves all nodes and viewport unchanged');
  syncGraphElements(cy,{...graph,edges:[{...edge,sourcePort:null,targetPort:null}]},{});
  assert.equal(cy.$id('e1').data('routed'),1);unchanged();
  console.log('PASS legacy relations receive automatic obstacle-aware routing');
  const adapted=toKnowledgeGraph([{graph:{id:'g',categoryId:'c',label:'G'},nodes:graph.nodes.map(n=>({...n,nodeKey:n.id,graphId:'g'})),edges:[{id:'saved',sourceNodeId:'a',targetNodeId:'b',sourcePort:'bottom',targetPort:'left',type:'Concept',label:''}]}]);
  assert.equal(adapted.edges[0].sourcePort,'bottom');assert.equal(adapted.edges[0].targetPort,'left');
  console.log('PASS stored connection points survive the workspace graph adapter');
} finally {cy.destroy();}
