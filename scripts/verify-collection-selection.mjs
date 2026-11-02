import assert from 'node:assert/strict';
import {collectionDefaults,tableRule,savedCollection,validateCollection,collectionRulesForm} from '../appdashboard-app/assets/js/collection-config.js';
import {normalizeCDC,queryMode,validateSelection} from '../appdashboard-app/assets/js/collection-selection.js';
import {inspectSchema,readSourceSchema,setDemoSourceSchema,metadataKey} from '../appdashboard-app/assets/js/schema-evolution.js';
import {Editor} from '../appdashboard-app/assets/js/editors.js';
import {write,key,tasks} from '../appdashboard-app/assets/js/domain/store.js';
import {datasetKey,datasets} from '../appdashboard-app/assets/js/domain/domain.js';
import {forkDefaults,createDatasetFromSource} from '../appdashboard-app/assets/js/domain/dataset-fork.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
globalThis.sessionStorage=storage();globalThis.localStorage=storage();globalThis.location={search:''};
const p={name:'采集选择验收',empty:true},connection={id:'db',name:'业务库',connectorType:'MYSQL',database:'sales'};
write(key(p.name,'connections'),[connection]);
const binding={connection,table:'orders'},source=readSourceSchema(p,binding);
const f={id:'t',name:'SQL采集',connection:connection.name,tables:['orders'],fields:{orders:['order_id','amount']},outputs:{orders:'订单结果'},...collectionDefaults({},connection),sourceSchemas:{orders:source}};
Object.assign(tableRule(f,'orders'),{queryMode:'sql',sql:'SELECT order_id AS id, amount * 2 AS doubled FROM orders'});
validateSelection(f);validateCollection(f,connection);
let saved=savedCollection(f,connection);assert.equal(saved.jdbc.tables.orders.queryMode,'sql');assert.match(saved.jdbc.tables.orders.sql,/AS doubled/);
const editor=Object.assign(Object.create(Editor.prototype),{kind:'task',project:p,f,done(){}});editor.save();let task=tasks(p)[0];assert.equal(queryMode(task,'orders'),'sql');
const ds={id:'d',name:'订单结果',producer:task.id,table:'orders',schema:[{name:'id',type:'BIGINT'},{name:'doubled',type:'DECIMAL(18,2)'}],versionNumber:1};write(datasetKey(p.name),[ds]);
assert.equal(inspectSchema(p,ds).status,'ERROR');assert.match(inspectSchema(p,ds).reason,/查询结果结构及查询依赖/); // aliases must not look like deleted source columns
f.jdbc.tables.orders.queryMode='graphical';saved=savedCollection(f,connection);assert.equal(saved.jdbc.tables.orders.sql,'');assert.match(saved.jdbc.tables.orders.sqlDraft,/AS doubled/);
assert.doesNotMatch(collectionRulesForm(f,connection),/name="method"|name="sql:orders"/);
f.method='CDC';f.cdc['database.server.id']='5461';assert.throws(()=>validateCollection(f,connection),/完整源表/);normalizeCDC(f);assert.equal(f.fields.orders.length,6);validateCollection(f,connection);
const cdc={...f,id:'cdc',...savedCollection(f,connection)};write(key(p.name,'tasks'),[cdc]);const cdcData={...ds,producer:'cdc',schema:[{name:'order_id',type:'BIGINT'}],acceptedSourceSchema:source};write(datasetKey(p.name),[cdcData]);
setDemoSourceSchema(p,binding,'remark');let check=inspectSchema(p,cdcData);assert.equal(check.status,'BLOCKED');assert.equal(check.diff.find(f=>f.name==='remark').kind,'removed'); // even a previously unselected field is in CDC scope
const fork=forkDefaults(p,cdcData);fork.f.fields.orders=['order_id'];fork.f.name='新整表任务';fork.f.datasetName='新整表数据集';
const created=createDatasetFromSource(p,'d',fork.f,{baseTask:fork.baseTask,fingerprint:readSourceSchema(p,binding).fingerprint});assert.equal(created.schema.length,5);assert.equal(tasks(p).find(t=>t.id===created.producer).fields.orders.length,5);assert.equal(created.acceptedSourceSchema.fields.length,5);assert.equal(datasets(p).find(d=>d.id==='d').versionNumber,1);
// A source change between selection and save requires a fresh review.
f.sourceSchemas.orders=source;f.outputs.orders='结构变更验收';assert.throws(()=>editor.taskValid(2),/源表结构已变化/);
console.log('PASS SQL draft save/reopen, mode isolation, no invented query metadata, CDC full-field normalization and deletion basis, full-table fork, stale metadata protection.');
