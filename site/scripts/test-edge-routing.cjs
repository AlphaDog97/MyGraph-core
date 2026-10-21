const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),cytoscape=require('cytoscape');
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name),module,module.exports);return module.exports;}
const {routeConnection,segmentCoordinates}=load('original-ui/components/edgeRouting.ts');
const {segments,hitsBox,expandBox,linePenalty}=load('original-ui/components/edgeRoutingGeometry.ts');
const {routeGraphEdges}=load('original-ui/components/graphCanvasRouting.ts');
const source={x:80,y:40,side:'right'},target={x:400,y:40,side:'left'};
const boxes=[{x1:0,y1:0,x2:80,y2:80},{x1:400,y1:0,x2:480,y2:80}];
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
function valid(points){assert.deepEqual(points[0],source);assert.deepEqual(points.at(-1),target);for(const {a,b}of segments(points))assert.ok(a.x===b.x||a.y===b.y);}
test('routes orthogonal segments around intervening nodes with clearance',()=>{
 const obstacle={x1:180,y1:-20,x2:240,y2:100};const points=routeConnection(source,target,[...boxes,obstacle]);valid(points);
 assert.ok(points.length>2);assert.ok(segments(points).every(({a,b})=>!hitsBox(a,b,expandBox(obstacle))));
 assert.ok(points[1].x>source.x);assert.ok(points.at(-2).x<target.x);
});
test('chooses a detour rather than crossing an existing connection',()=>{
 const occupied=[{a:{x:240,y:-40},b:{x:240,y:140}}];const points=routeConnection(source,target,boxes,occupied);valid(points);
 assert.equal(segments(points).reduce((total,{a,b})=>total+linePenalty(a,b,occupied),0),0);
});
test('routes around a long crossing connection and its endpoint nodes',()=>{
 const occupied=[{a:{x:240,y:-400},b:{x:240,y:500}}];
 const endpoints=[{x1:200,y1:-460,x2:280,y2:-400},{x1:200,y1:500,x2:280,y2:560}];
 const points=routeConnection(source,target,[...boxes,...endpoints],occupied);valid(points);
 assert.equal(segments(points).reduce((total,{a,b})=>total+linePenalty(a,b,occupied),0),0);
 assert.ok(segments(points).every(({a,b})=>endpoints.every(box=>!hitsBox(a,b,expandBox(box)))));
});
test('separates parallel edges after their shared port stubs',()=>{
 const occupied=[{a:source,b:target}],points=routeConnection(source,target,boxes,occupied);valid(points);
 assert.ok(points.some(p=>p.y!==40));assert.ok(segments(points).filter(({a,b})=>a.y===40&&b.y===40).every(({a,b})=>Math.abs(a.x-b.x)<=26));
});
test('segment coordinates reconstruct the intended absolute bends',()=>{
 const points=routeConnection(source,target,[...boxes,{x1:180,y1:-20,x2:240,y2:100}]);
 const a={x:40,y:40},b={x:440,y:40},coordinates=segmentCoordinates(points,a,b);
 coordinates.weights.forEach((weight,i)=>{assert.ok(Math.abs(a.x+(b.x-a.x)*weight-points[i+1].x)<.001);assert.ok(Math.abs(a.y+coordinates.distances[i]-points[i+1].y)<.001);});
 assert.equal(segmentCoordinates(points,a,a),null);
});
test('new routes preserve existing paths, node positions, selection and viewport',()=>{
 const cy=cytoscape({headless:true,styleEnabled:true,layout:{name:'preset'},style:[{selector:'node',style:{width:80,height:60}}],elements:[
  {data:{id:'a'},position:{x:0,y:0}},{data:{id:'b'},position:{x:400,y:0}},{data:{id:'c'},position:{x:200,y:200}},
  {data:{id:'e1',source:'a',target:'b',sourcePort:'right',targetPort:'left'}}]});
 try{cy.zoom(1.7);cy.pan({x:30,y:90});cy.$id('a').select();routeGraphEdges(cy);const first=JSON.stringify(cy.$id('e1').data('routePoints'));
 const positions=cy.nodes().map(n=>n.position());cy.add({data:{id:'e2',source:'c',target:'b',sourcePort:'top',targetPort:'bottom'}});routeGraphEdges(cy);
 assert.equal(JSON.stringify(cy.$id('e1').data('routePoints')),first);assert.deepEqual(cy.nodes().map(n=>n.position()),positions);assert.equal(cy.zoom(),1.7);assert.deepEqual(cy.pan(),{x:30,y:90});assert.ok(cy.$id('a').selected());
 cy.$id('c').position({x:200,y:0});routeGraphEdges(cy);assert.notEqual(JSON.stringify(cy.$id('e1').data('routePoints')),first);
 }finally{cy.destroy();}
});
test('routing remains bounded for a dense category fixture',()=>{
 const elements=[];for(let i=0;i<36;i++)elements.push({data:{id:`n${i}`},position:{x:i%6*180,y:Math.floor(i/6)*130}});
 for(let i=0;i<35;i++)elements.push({data:{id:`e${i}`,source:`n${i}`,target:`n${(i+7)%36}`}});
 const cy=cytoscape({headless:true,styleEnabled:true,layout:{name:'preset'},style:[{selector:'node',style:{width:80,height:50}}],elements});
 try{const start=performance.now();routeGraphEdges(cy);assert.equal(cy.edges().filter(e=>e.data('routed')===1).length,35);assert.ok(performance.now()-start<5000);}finally{cy.destroy();}
});
let failures=0;for(const[name,fn]of tests){try{fn();console.log(`PASS ${name}`);}catch(e){failures++;console.error(`FAIL ${name}`,e);}}process.exitCode=failures?1:0;
