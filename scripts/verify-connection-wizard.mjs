import assert from 'node:assert/strict';
import {Editor} from '../appdashboard-app/assets/js/editors.js';
import {databaseTypes} from '../appdashboard-app/assets/js/database-types.js';
import {connections} from '../appdashboard-app/assets/js/domain/store.js';

const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};};
globalThis.sessionStorage=memory();globalThis.localStorage=memory();globalThis.location={search:''};
const project={name:'连接向导验收',empty:true};
const editor=Object.assign(Object.create(Editor.prototype),{kind:'connection',project,record:undefined,tested:false,done(){},f:{name:'',description:'',connectorType:'',host:'demo.example.test',port:'',database:'demo',user:'reader',password:'demo-only'}});
for(const [connectorType,type] of Object.entries(databaseTypes)){
 editor.f={...editor.f,name:type.label,connectorType,port:type.port,host:'demo.example.test'};editor.tested=false;
 assert.throws(()=>editor.save(),/先测试连接/);
 editor.tested=true;editor.save();
 const saved=connections(project).find(row=>row.name===type.label);
 assert.equal(saved.connectorType,connectorType);assert.equal(saved.port,type.port);
 assert.equal('password' in saved,false);assert.equal(JSON.stringify(saved).includes('demo-only'),false);
 editor.record=saved;editor.f.password='';editor.tested=false;
 assert.equal(editor.connectionChanged(),false);editor.save();
 editor.f.host='changed.example.test';assert.equal(editor.connectionChanged(),true);assert.throws(()=>editor.save(),/先测试连接/);
 editor.f.port='65536';assert.throws(()=>editor.connectionValid(),/端口/);
 editor.f.port=type.port;editor.f.connectorType=connectorType==='MYSQL'?'POSTGRESQL':'MYSQL';assert.throws(()=>editor.connectionValid(),/密码/);
 editor.record=undefined;editor.f.password='demo-only';
}
editor.f.connectorType='UNKNOWN';assert.throws(()=>editor.connectionValid(),/数据库类型/);
// Type changes replace only a default port, retaining intentional custom ports.
for(const [port,expected] of [['3306','5432'],['13306','13306']]){
 editor.f.connectorType='MYSQL';editor.f.port=port;editor.f.tables=[];editor.tested=true;
 editor.sync=()=>{editor.f.connectorType='POSTGRESQL';};editor.render=()=>{};
 editor.onChange({target:{name:'connectorType',type:'radio'}});
 assert.equal(editor.f.port,expected);assert.equal(editor.tested,false);
}
console.log('PASS four source types, test-before-save, edit compatibility, parameter changes, port validation, credential handling, and custom port preservation.');
