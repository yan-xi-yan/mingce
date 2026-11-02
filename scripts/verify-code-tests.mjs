import assert from 'node:assert/strict';
import {Editor} from '../appdashboard-app/assets/js/editors.js';
import {write,read,key} from '../appdashboard-app/assets/js/domain/store.js';
import {saveCode,codes,datasets,datasetKey,codeKey} from '../appdashboard-app/assets/js/domain/domain.js';
import {submitCodeTest,submitExecution,cancelCodeTest,executions,tickWorkflow,executionKey} from '../appdashboard-app/assets/js/domain/execution-runtime.js';
import {runBody,codeTestPanel,sparkMetrics,safeSparkURL} from '../appdashboard-app/assets/js/run-details.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
globalThis.sessionStorage=storage();globalThis.localStorage=storage();globalThis.location={search:'',href:'http://127.0.0.1:3004/',origin:'http://127.0.0.1:3004',pathname:'/'};
const p={name:'代码测试隔离验收',empty:true};
write(datasetKey(p.name),[{id:'in',name:'订单',group:'raw',versionNumber:7,state:'可用',hasData:true,schema:[{name:'id',type:'BIGINT'}],rows:[[1]],versions:[{version:7}]}]);
saveCode(p,{id:'code',name:'测试任务',description:'',inputs:['in'],inputReferences:{in:'orders'},outputBindings:[{name:'输出A',reference:'a',mode:'new'},{name:'输出B',reference:'b',mode:'new'}],output:'输出A',fileName:'demo.zip',packageId:'local-package',configStatus:'READY'});
const before=sessionStorage.getItem(datasetKey(p.name));
const plan={id:'downstream',mode:'event',task:'other',enabled:true,watch:[datasets(p).find(d=>d.name==='输出A').id],combo:'any',baseline:{},records:[]};write(key(p.name,'plans'),[plan]);
let run=submitCodeTest(p,'code',1000);assert.equal(run.runMode,'TEST');assert.equal(run.inputVersions[0].version,7);assert.throws(()=>submitCodeTest(p,'code',1001),/正在运行/);assert.throws(()=>submitExecution(p,'flow','code',undefined,1000,'TEST'),/仅支持/);
tickWorkflow(p,2000);assert.equal(executions(p)[0].status,'RUNNING');tickWorkflow(p,4000);run=executions(p)[0];assert.equal(run.status,'SUCCEEDED');assert.equal(run.testResults.length,2);assert.equal(run.outputs.length,0);assert.equal(sessionStorage.getItem(datasetKey(p.name)),before);assert.equal(read(key(p.name,'plans'),[])[0].records.length,0);
// Each new test resolves the newest input; accepted runs retain their snapshot.
write(datasetKey(p.name),datasets(p).map(d=>d.id==='in'?{...d,versionNumber:8,rows:[[2]]}:d));
let latest=submitCodeTest(p,'code',5000);assert.equal(latest.inputVersions[0].version,8);assert.equal(run.inputVersions[0].version,7);assert.deepEqual(run.inputs[0].rows,[[1]]);cancelCodeTest(p,latest.id,5100);tickWorkflow(p,9000);assert.equal(executions(p)[0].status,'CANCELLED');assert.equal(datasets(p).find(d=>d.name==='输出A').versionNumber,null);
// Production still publishes and advances the version.
submitExecution(p,'code','code',undefined,10000);tickWorkflow(p,13000);assert.equal(datasets(p).find(d=>d.name==='输出A').versionNumber,1);
write(codeKey(p.name),codes(p).map(t=>({...t,packageId:''})));assert.throws(()=>submitCodeTest(p,'code',15000),/上传/);
const f={...codes(p)[0],inputReferences:{in:'orders'},outputBindings:codes(p)[0].outputBindings};const editor=Object.assign(Object.create(Editor.prototype),{kind:'code',project:p,record:f,f});assert.doesNotMatch(editor.codeForm(),/type="file"/);editor.packageOnly=true;assert.match(editor.codeForm(),/type="file"/);assert.doesNotMatch(editor.codeForm(),/code-input-bindings/);
assert.equal(safeSparkURL('javascript:alert(1)'),null);assert.equal(safeSparkURL('https://user:pass@example.com'),null);assert.equal(safeSparkURL('http://localhost:18080'),'http://localhost:18080/');
assert.equal(sparkMetrics({durationMs:2000,stages:[{startMs:0,durationMs:2000,taskRuntimeMs:4000,shuffleWriteBytes:0,diskSpillBytes:0}]}).parallelism,'2.00 ×');assert.equal(sparkMetrics().diskSpillBytes,null);
const html=runBody({...run,task:{...run.task,fileName:'<script>'},spark:{config:{password:'secret-value',a:'<img>'},queryPlan:'<script>'}},{outputs:datasets(p)});assert.ok(!html.includes('secret-value'));assert.ok(!html.includes('<script>'));assert.match(html,/临时测试结果/);assert.match(html,/run-tab-outputs/);
assert.match(codeTestPanel({...run.task,packageId:'new'},[run],{allDatasets:datasets(p),canWrite:true}),/旧代码包/);
console.log('PASS TEST isolation, no downstream event, latest inputs, immutable snapshots, duplicate prevention, cancellation, production publication, upload scope, rendering and safe Spark links.');
