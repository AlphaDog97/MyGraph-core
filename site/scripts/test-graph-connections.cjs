const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(file,'utf8'), {
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
}).outputText;
const geometry={}; vm.runInNewContext(compile('original-ui/components/graphConnectionGeometry.ts'),{exports:geometry});
function mount(){
  const slots=[],pending=[],listeners=new Map(),cyEvents=new Map(),created=[];
  let cursor=0;
  const changed=(a,b)=>!a||a.length!==b.length||a.some((value,i)=>value!==b[i]);
  const hooks={
    useRef(value){const i=cursor++;return slots[i]??={current:value};},
    useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return[slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
    useEffect(fn,deps){const i=cursor++;if(changed(slots[i]?.deps,deps))pending.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
  };
  const nodes=new Map([['a',{x1:20,y1:30,x2:120,y2:90}],['b',{x1:220,y1:30,x2:320,y2:90}],['foreign',{x1:420,y1:30,x2:520,y2:90}]].map(([id,box])=>[id,{id:()=>id,length:1,renderedBoundingBox:()=>box,addClass(){},removeClass(){}}]));
  const cy={destroyed:()=>false,getElementById:id=>nodes.get(id)??{length:0},nodes:()=>[...nodes.values()],
    container:()=>({clientWidth:600,clientHeight:400,getBoundingClientRect:()=>({left:10,top:20,width:600,height:400})}),
    on:(events,fn)=>cyEvents.set(events,fn),off:events=>cyEvents.delete(events),
  };
  const window={requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},
    addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  const exports={};
  vm.runInNewContext(compile('original-ui/components/useGraphConnections.ts'),{exports,window,
    require:name=>name==='react'?hooks:geometry});
  const props={cy,selectedNodeId:'a',focusedGraphId:'g1',bridgeRef:{current:null},
    nodeById:new Map(['a','b','foreign'].map(id=>[id,{provenance:[{graphId:id==='foreign'?'g2':'g1'}]}])),
    onCreateEdge:(...args)=>created.push(JSON.parse(JSON.stringify(args)))};
  let result;
  const render=next=>{Object.assign(props,next);cursor=0;result=exports.useGraphConnections(props);pending.splice(0).forEach(fn=>fn());return result;};
  render();render();
  return{props,created,listeners,cyEvents,nodes,render,get result(){return result;},
    fire:(name,event)=>listeners.get(name)?.(event),
    down(){result.pointerDown({button:0,isPrimary:true,pointerId:1,clientX:138,clientY:80,preventDefault(){},stopPropagation(){},currentTarget:{setPointerCapture(){}}},geometry.connectionPorts(result.bounds)[1]);},
    unmount(){slots.forEach(slot=>slot?.cleanup?.());}};
}
const tests=[];const test=(name,run)=>tests.push([name,run]);
test('four handles match node bounds and path preserves selected side',()=>{
  const ports=geometry.connectionPorts({x1:0,y1:0,x2:100,y2:60});
  assert.equal(ports.length,4);assert.equal(ports[1].x,100);assert.equal(ports[0].y,0);
  assert.match(geometry.connectionPath(ports[1],{x:300,y:30}),/^M 100 30 L/);
});
test('clicking a handle then a target creates exactly one connection',()=>{
  const app=mount();app.down();app.fire('pointerup',{pointerId:1,clientX:138,clientY:80});
  assert.equal(app.props.bridgeRef.current.tryComplete('b'),true);
  assert.deepEqual(app.created,[['a','b',{sourcePort:'right',targetPort:'left'}]]);assert.equal(app.props.bridgeRef.current.tryComplete('b'),false);app.unmount();
});
test('dragging a handle resolves the node under the released pointer',()=>{
  const app=mount();app.down();app.fire('pointermove',{pointerId:1,clientX:230,clientY:80});
  app.render();assert.equal(app.result.draft.targetId,'b');
  app.fire('pointerup',{pointerId:1,clientX:230,clientY:80});assert.deepEqual(app.created,[['a','b',{sourcePort:'right',targetPort:'left'}]]);app.unmount();
});
test('explicit target handle is retained instead of inferred from the node center',()=>{
  const app=mount();app.down();app.result.complete('b',{x:270,y:90},'bottom');
  assert.deepEqual(app.created,[['a','b',{sourcePort:'right',targetPort:'bottom'}]]);app.unmount();
});
test('self and cross-graph targets keep a cancellable draft without saving',()=>{
  const app=mount();app.down();
  for(const id of ['a','foreign']){assert.equal(app.props.bridgeRef.current.tryComplete(id),true);app.render();assert.ok(app.result.draft.error);}
  assert.equal(app.created.length,0);assert.equal(app.props.bridgeRef.current.cancel(),true);app.render();assert.equal(app.result.draft,null);app.unmount();
});
test('blank release and Escape cancel without opening an editor',()=>{
  const app=mount();app.down();app.fire('pointermove',{pointerId:1,clientX:580,clientY:300});app.fire('pointerup',{pointerId:1,clientX:580,clientY:300});
  app.render();assert.equal(app.result.draft,null);app.down();let prevented=false;
  app.fire('keydown',{key:'Escape',preventDefault(){prevented=true;}});app.render();assert.equal(app.result.draft,null);assert.equal(prevented,true);assert.equal(app.created.length,0);app.unmount();
});
test('changing graph cancels a pending connection and cleanup removes handlers',()=>{
  const app=mount();app.down();app.render({focusedGraphId:'g2',selectedNodeId:undefined});app.render();
  assert.equal(app.result.draft,null);assert.equal(app.result.bounds,null);app.unmount();assert.equal(app.listeners.size,0);assert.equal(app.cyEvents.size,0);assert.equal(app.props.bridgeRef.current,null);
});
let failures=0;for(const[name,run]of tests){try{run();console.log(`PASS ${name}`);}catch(error){failures++;console.error(`FAIL ${name}`,error);}}process.exitCode=failures?1:0;
