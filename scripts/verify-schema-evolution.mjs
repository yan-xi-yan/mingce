import assert from 'node:assert/strict';
import {read,write,key,tasks} from '../appdashboard-app/assets/js/domain/store.js';
import {datasets,datasetKey,runs,runKey} from '../appdashboard-app/assets/js/domain/domain.js';
import {sourceBinding,readSourceSchema,inspectSchema,setDemoSourceSchema,metadataKey,compareSourceSchema,schemaCheckBanner} from '../appdashboard-app/assets/js/schema-evolution.js';
import {forkDefaults,createDatasetFromSource} from '../appdashboard-app/assets/js/domain/dataset-fork.js';
import {submitExecution,tickWorkflow,executions,publishTask} from '../appdashboard-app/assets/js/domain/execution-runtime.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
globalThis.sessionStorage=storage();globalThis.localStorage=storage();globalThis.location={search:'',href:'http://127.0.0.1:3004/',origin:'http://127.0.0.1:3004',pathname:'/'};
const p={name:'Schema验收',empty:true};
write(key(p.name,'connections'),[{id:'c',name:'业务库',connectorType:'MYSQL',database:'sales'}]);
const task={id:'t',name:'原采集',mode:'full',connection:'业务库',tables:['customers','orders'],fields:{orders:['order_id','status'],customers:['customer_id']},outputs:{customers:'客户',orders:'订单'},published:true};write(key(p.name,'tasks'),[task]);
const ds={id:'d',name:'订单',producer:'t',table:'orders',versionNumber:7,state:'可用',schema:[{name:'order_id',type:'BIGINT'},{name:'status',type:'STRING'}],versions:[{version:7,schema:[{name:'status',type:'STRING'}]}],rows:[[1,'完成']]};
write(datasetKey(p.name),[{id:'c1',name:'客户',producer:'t',table:'customers',versionNumber:2,schema:[{name:'customer_id',type:'BIGINT'}]},ds]);
const binding=sourceBinding(p,ds);assert.equal(inspectSchema(p,ds).status,'PASSED');
setDemoSourceSchema(p,binding,'remark');assert.equal(inspectSchema(p,ds).status,'PASSED'); // unselected source column
setDemoSourceSchema(p,binding,'status');assert.equal(inspectSchema(p,ds).status,'BLOCKED');
const before=sessionStorage.getItem(datasetKey(p.name));submitExecution(p,'batch','t',undefined,1000);tickWorkflow(p,4000);
assert.equal(executions(p)[0].status,'FAILED');assert.equal(executions(p)[0].outputs.length,0);assert.equal(sessionStorage.getItem(datasetKey(p.name)),before);assert.equal(executions(p)[0].schemaChecks[1].status,'BLOCKED');
// An unavailable source also fails closed.
write(metadataKey(p),{'c:orders':{error:'来源连接不可用'}});submitExecution(p,'batch','t',undefined,5000);tickWorkflow(p,8000);assert.equal(executions(p)[0].status,'FAILED');assert.equal(sessionStorage.getItem(datasetKey(p.name)),before);
setDemoSourceSchema(p,binding,'status');
const {f,baseTask}=forkDefaults(p,ds);f.fields.orders=['order_id'];f.datasetName='订单新';f.name='新采集';let source=readSourceSchema(p,binding);
assert.throws(()=>createDatasetFromSource(p,'d',f,{baseTask,fingerprint:'outdated'}),/结构已变化/);
const original=structuredClone(datasets(p).find(d=>d.id==='d'));
const created=createDatasetFromSource(p,'d',f,{baseTask,fingerprint:source.fingerprint});assert.equal(created.versionNumber,null);assert.deepEqual(created.versions,[]);assert.deepEqual(datasets(p).find(d=>d.id==='d'),original);assert.deepEqual(created.schema,[{name:'order_id',type:'BIGINT'}]);
assert.notEqual(created.producer,'t');assert.equal(tasks(p).find(t=>t.id===created.producer).published,false);assert.throws(()=>createDatasetFromSource(p,'d',f,{baseTask,fingerprint:source.fingerprint}),/占用/);
publishTask(p,'batch',created.producer);submitExecution(p,'batch',created.producer,undefined,9000);tickWorkflow(p,12000);assert.equal(datasets(p).find(d=>d.id===created.id).versionNumber,1);assert.equal(datasets(p).find(d=>d.id==='d').versionNumber,7);
// CDC checks the current source on every publication window, and never consumes a failed version.
const cdc={...task,id:'cdc',mode:'continuous',tables:['orders'],outputs:{orders:'CDC订单'},fields:{orders:['order_id','status']},versionIntervalSeconds:60};write(key(p.name,'tasks'),[...tasks(p),cdc]);write(datasetKey(p.name),[...datasets(p),{...ds,id:'cdc-d',producer:'cdc',name:'CDC订单'}]);
write(runKey(p.name,'cdc'),[{id:'cdc-run',demoStarted:true,status:'RUNNING',phase:'SYNCING',start:new Date(1000).toISOString(),syncStartedAt:new Date(1000).toISOString(),versionIntervalSeconds:60,task:cdc,objects:[],publications:[]}]);tickWorkflow(p,70000);
assert.equal(runs(p.name,'cdc')[0].status,'FAILED');assert.equal(runs(p.name,'cdc')[0].schemaChecks[0].status,'BLOCKED');assert.equal(datasets(p).find(d=>d.id==='cdc-d').versionNumber,7);
const cdcForm=forkDefaults(p,datasets(p).find(d=>d.id==='cdc-d'));assert.equal(cdcForm.f.cdc['snapshot.mode'],'initial');assert.ok(cdcForm.f.cdc['topic.prefix']);
const diff=compareSourceSchema([{name:'order_id',type:'STRING'}],readSourceSchema(p,binding));assert.equal(diff[0].kind,'changed');
assert.doesNotMatch(schemaCheckBanner({...inspectSchema(p,ds),reason:'<script>alert(1)</script>'}),/<script>/);
console.log('PASS schema diff; JDBC and CDC publication gate; atomic multiple outputs; failed metadata; unchanged history/version; stale schema; independent fork; v1 after successful run; escaped UI.');
