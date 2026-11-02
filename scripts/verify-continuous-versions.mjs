import assert from 'node:assert/strict';
import {write,read,key,tasks} from '../appdashboard-app/assets/js/domain/store.js';
import {runs,startIngest,datasets,datasetKey,runKey,targets} from '../appdashboard-app/assets/js/domain/domain.js';
import {tickWorkflow,submitExecution} from '../appdashboard-app/assets/js/domain/execution-runtime.js';
import {publicationSeconds,validatePublicationSeconds,nextPublication} from '../appdashboard-app/assets/js/continuous-versions.js';
import {continuousRunBody} from '../appdashboard-app/assets/js/continuous-run-details.js';
import {DatasetExplorer} from '../appdashboard-app/assets/js/dataset-explorer.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
globalThis.sessionStorage=storage();globalThis.localStorage=storage();globalThis.location={search:'',href:'http://127.0.0.1:3004/',origin:'http://127.0.0.1:3004',pathname:'/'};
const p={name:'持续采集窗口验收',empty:true},t={id:'cdc',name:'持续采集',mode:'continuous',published:true,connection:'db',tables:['orders'],fields:{orders:['order_id']},outputs:{orders:'orders_raw'},versionIntervalSeconds:60};
write(key(p.name,'tasks'),[t]);write(key(p.name,'connections'),[{id:'db',name:'db'}]);
const start=Date.parse('2026-10-28T00:00:00Z');const run=startIngest(p,t,start);
assert.equal(targets(p).length,0);assert.throws(()=>submitExecution(p,'batch',t.id),/持续采集/);
tickWorkflow(p,start+2000);assert.equal(datasets(p).length,0);assert.equal(runs(p.name,t.id)[0].objects[0].version,null);
tickWorkflow(p,start+6001);assert.equal(datasets(p)[0].versionNumber,1);assert.equal(runs(p.name,t.id)[0].publications[0].kind,'INITIAL');
tickWorkflow(p,start+65000);assert.equal(datasets(p)[0].versionNumber,1);
tickWorkflow(p,start+66000);assert.equal(datasets(p)[0].versionNumber,2);tickWorkflow(p,start+66000);assert.equal(datasets(p)[0].versionNumber,2);
tickWorkflow(p,start+126000);assert.equal(datasets(p)[0].versionNumber,3);assert.equal(runs(p.name,t.id).length,1);assert.equal(runs(p.name,t.id)[0].status,'RUNNING');
const history=runs(p.name,t.id)[0].publications;assert.equal(history[1].windowEnd,history[2].windowStart);assert.ok(datasets(p)[0].versions.every(v=>v.runId===run.id&&v.publication));
// Changing the task does not change cadence accepted by the active collector.
write(key(p.name,'tasks'),[{...t,versionIntervalSeconds:300}]);tickWorkflow(p,start+186000);assert.equal(datasets(p)[0].versionNumber,4);
// Suspension coalesces expired windows without creating bursts of fake runs.
tickWorkflow(p,start+786000);assert.equal(datasets(p)[0].versionNumber,5);assert.equal(runs(p.name,t.id)[0].publications.at(-1).mergedWindows,10);tickWorkflow(p,start+786000);assert.equal(datasets(p)[0].versionNumber,5);
let r=runs(p.name,t.id)[0];r.status='STOPPING';r.stopRequestedAt=new Date(start+786000).toISOString();write(runKey(p.name,t.id),[r]);tickWorkflow(p,start+900000);assert.equal(datasets(p)[0].versionNumber,5);assert.equal(runs(p.name,t.id)[0].status,'STOPPED');
assert.equal(nextPublication({status:'RUNNING',phase:'SYNCING',start:new Date(start).toISOString(),syncStartedAt:new Date(start+6000).toISOString(),versionIntervalSeconds:60,task:{cdc:{'snapshot.mode':'no_data'}}},start+6001),null);
assert.equal(publicationSeconds({}),300);assert.throws(()=>validatePublicationSeconds(0),/发布间隔/);
const html=continuousRunBody({...r,type:'continuous'},{task:t,outputs:datasets(p)});assert.match(html,/版本发布记录/);assert.match(html,/时间窗口/);assert.doesNotMatch(html,/调度触发|Spark UI/);
const data=datasets(p)[0],explorer=Object.assign(Object.create(DatasetExplorer.prototype),{record:data,context:{runs:[{...r,type:'continuous',taskId:t.id}]},state:{history:'v:3'}});assert.equal(new Set(explorer.events().filter(e=>e.run).map(e=>e.run.id)).size,1);assert.match(explorer.history(),/窗口开始/);
// A failed publication leaves the last published dataset version intact.
const resumed=startIngest(p,t,start+1000000);tickWorkflow(p,start+1006001);
const prior=datasets(p)[0].versionNumber;write(datasetKey(p.name),datasets(p).map(d=>({...d,producer:'other-task'})));
tickWorkflow(p,start+1066000);assert.equal(datasets(p)[0].versionNumber,prior);assert.equal(runs(p.name,t.id)[0].status,'FAILED');assert.equal(runs(p.name,t.id)[0].failedPublication.outputs.length,0);
console.log('PASS baseline + periodic versions, interval boundaries, idempotent ticks, single run, immutable cadence, merged resume, stop isolation, no-data mode, no schedule target and dataset window details.');
