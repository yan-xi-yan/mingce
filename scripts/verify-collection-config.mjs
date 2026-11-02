import {normalizeCDC} from '../appdashboard-app/assets/js/collection-selection.js';
import assert from 'node:assert/strict';
import {collectionDefaults,collectionMode,tableRule,queryFor,validateCollection,validateOutputs,savedCollection,cdcScope,collectionRulesForm} from '../appdashboard-app/assets/js/collection-config.js';
import {Editor} from '../appdashboard-app/assets/js/editors.js';
import {SourcePicker} from '../appdashboard-app/assets/js/source-picker.js';
import {tasks,connections,key,write} from '../appdashboard-app/assets/js/domain/store.js';
import {validateTask} from '../appdashboard-app/assets/js/domain/execution-runtime.js';
import {startIngest} from '../appdashboard-app/assets/js/domain/domain.js';
import {sourceCatalog} from '../appdashboard-app/assets/js/source-catalog.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};};
globalThis.sessionStorage=memory();globalThis.localStorage=memory();globalThis.location={search:''};
const connection={name:'测试连接',connectorType:'MYSQL',database:'sales',user:'reader'};
const base=()=>({name:'采集验收',description:'配置验证',connection:connection.name,tables:['orders','customers'],fields:{orders:['order_id','amount'],customers:['customer_id','city']},outputs:{orders:'orders_demo',customers:'customers_demo'},...collectionDefaults({},connection)});
let f=base();validateOutputs(f);validateCollection(f,connection);assert.equal(collectionMode(f),'full');
f.outputs.customers='orders_demo';assert.throws(()=>validateOutputs(f),/不同/);f.outputs.customers='customers_demo';assert.throws(()=>validateOutputs(f,[{name:'orders_demo',producer:'other'}]),/占用/);
f.jdbc.readMode='incremental';f.jdbc.writeMode='append';assert.throws(()=>validateCollection(f,connection),/递增字段/);
for(const t of f.tables){Object.assign(tableRule(f,t),{cursor:sourceCatalog[t].key,initialValue:'0'});}
validateCollection(f,connection);assert.equal(collectionMode(f),'incremental');assert.match(queryFor(f,'customers',connection),/`customer_id` > \?/);
f.jdbc.tables.orders.initialValue='abc';assert.throws(()=>validateCollection(f,connection),/数值/);f.jdbc.tables.orders.initialValue='0';
f.jdbc.tables.orders.sql='SELECT order_id FROM orders WHERE order_id > ?';validateCollection(f,connection);f.jdbc.tables.orders.sql+=' AND amount > ?';assert.throws(()=>validateCollection(f,connection),/恰好一个/);f.jdbc.tables.orders.sql='';
for(const connectorType of ['MYSQL','POSTGRESQL','ORACLE','SQLSERVER']){
 const conn={...connection,connectorType};f=base();Object.assign(f,collectionDefaults({},conn));f.method='CDC';f.mode=collectionMode(f);assert.match(f.cdc['topic.prefix'],/^mc_cdc_[a-f0-9]{32}$/);assert.doesNotMatch(collectionRulesForm(f,conn),/name="cdc:topic.prefix"|逻辑源标识/);f.cdc['database.server.id']='5401';f.cdc['slot.name']='demo_cdc';f.cdc['publication.name']='demo_publication';f.cdc['database.dbname']='ORCLCDB';
 normalizeCDC(f);validateCollection(f,conn);assert.equal(collectionMode(f),'continuous');
 const saved=savedCollection(f,conn);assert.equal('jdbc' in saved,false);assert.equal('password' in saved.cdc,false);assert.equal('database.server.id' in saved.cdc,connectorType==='MYSQL');
 f.cdc['max.queue.size']='2048';assert.throws(()=>validateCollection(f,conn),/队列/);f.cdc['max.queue.size']='8192';
 if(connectorType==='POSTGRESQL'){f.cdc['slot.name']='Invalid-Name';assert.throws(()=>validateCollection(f,conn),/复制槽/);f.cdc['slot.name']='demo_cdc';}
 if(connectorType==='MYSQL'){f.cdc['database.server.id']='0';assert.throws(()=>validateCollection(f,conn),/Server ID/);f.cdc['database.server.id']='5401';}
 f.fields.orders=['amount'];const picker=new SourcePicker(f,()=>{});picker.ensureRequired();assert.ok(f.fields.orders.includes('order_id'));
}
const migrated=collectionDefaults({mode:'incremental',tables:['orders'],incrementalField:'order_id'},connection);assert.equal(migrated.jdbc.tables.orders.cursor,'order_id');
const project={name:'采集配置验收',empty:true};write(key(project.name,'connections'),[{id:'conn',...connection}]);
f=base();f.mode='full';const editor=Object.assign(Object.create(Editor.prototype),{kind:'task',project,record:undefined,done(){},f});editor.save();let saved=tasks(project)[0];assert.equal(saved.method,'JDBC');assert.equal(saved.tables.length,2);assert.equal(saved.outputs.customers,'customers_demo');
const id=saved.id;editor.record=saved;editor.f={...saved,...collectionDefaults(saved,connection)};editor.f.method='CDC';editor.f.mode='continuous';const generatedPrefix=editor.f.cdc['topic.prefix'];editor.f.cdc['database.server.id']='5401';editor.save();saved=tasks(project)[0];assert.equal(saved.id,id);assert.equal(saved.method,'CDC');assert.equal(saved.published,true);assert.equal('jdbc' in saved,false);assert.equal(saved.cdc['database.server.id'],'5401');assert.equal(saved.cdc['topic.prefix'],generatedPrefix);assert.equal(saved.cdc['table.include.list'],String.raw`sales\.orders,sales\.customers`);validateTask(project,'batch',saved);const run=startIngest(project,saved);assert.equal(run.task.cdc['database.server.id'],'5401');assert.notEqual(run.task,saved);
const reopened={...saved,...collectionDefaults(saved,connection)};assert.equal(reopened.cdc['topic.prefix'],generatedPrefix);assert.equal(run.task.cdc['topic.prefix'],generatedPrefix);assert.equal(reopened.method,'CDC');assert.equal(reopened.outputs.orders,'orders_demo');assert.equal(reopened.cdc['database.server.id'],'5401');
assert.equal(cdcScope(f,{...connection,database:'sales.v2'}),String.raw`sales\.v2\.orders,sales\.v2\.customers`);
console.log('PASS multi-output validation, per-table JDBC cursors/SQL, legacy migration, four Debezium configurations, numeric constraints, CDC primary keys, save/reopen and inactive parameter omission.');

assert.notEqual(base().cdc['topic.prefix'],base().cdc['topic.prefix']);
assert.equal(collectionDefaults({cdc:{'topic.prefix':'legacy_source'}},connection).cdc['topic.prefix'],'legacy_source');
assert.match(collectionDefaults({cdc:{'topic.prefix':''}},connection).cdc['topic.prefix'],/^mc_cdc_[a-f0-9]{32}$/);
const changedConnection=Object.assign(Object.create(Editor.prototype),{kind:'task',project,f:reopened,sync(){},render(){}});
changedConnection.onChange({target:{name:'connection'}});assert.equal(changedConnection.f.cdc['topic.prefix'],generatedPrefix);
console.log('PASS generated logical source identifiers, unique tasks, hidden input, save/reopen/run stability, legacy preservation and connection changes.');
