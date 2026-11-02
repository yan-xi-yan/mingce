import {isCDC,queryMode,schemaBasis} from './collection-selection.js';
import {sourceCatalog} from './source-catalog.js';
import {read,write,key,connections,tasks} from './domain/store.js';
import {escape as e,button,table,badge} from './html.js';

// Explicit demo metadata adapter. A production adapter must query the connection
// service and Iceberg Catalog server-side in the publication transaction.
export const schemaCheckKey=p=>key(p.name,'schema-checks');
export const metadataKey=p=>key(p.name,'source-schema-samples');
export function sourceBinding(p,dataset,task=tasks(p).find(t=>t.id===dataset.producer)){
 const connection=connections(p).find(c=>dataset.sourceBinding?.connectionId?c.id===dataset.sourceBinding.connectionId:c.name===task?.connection);
 const table=dataset.sourceBinding?.table||dataset.table||task?.tables?.find(t=>task.outputs[t]===dataset.name);
 if(!connection||!task||!table||!task.tables?.includes(table))return null;
 return {connection,table,task};
}
export const icebergType=value=>{
 const type=String(value).toUpperCase().replaceAll(' ','');
 if(/^(VARCHAR|CHAR|TEXT|STRING)/.test(type))return 'STRING';
 if(['INTEGER','INT','SMALLINT','TINYINT'].includes(type))return 'INT';
 if(['TIMESTAMP','DATETIME'].includes(type))return 'TIMESTAMP';
 return type;
};
export function readSourceSchema(p,binding){
 if(!binding)throw Error('此数据集没有可查询的源数据库表绑定');
 const id=binding.connection.id+':'+binding.table;
 const sample=read(metadataKey(p),{})[id];
 const meta=sample||sourceCatalog[binding.table];
 if(!meta)throw Error('源表元数据不可用，请恢复来源连接后重试');
 if(meta.error)throw Error(meta.error);
 if(!Array.isArray(meta.fields)||!meta.fields.length)throw Error('未取得有效的源表结构，不能继续发布');
 const fields=meta.fields.map(([name,type])=>({name,type,icebergType:icebergType(type)}));
 if(fields.some(f=>!f.name||!f.type)||new Set(fields.map(f=>f.name)).size!==fields.length)throw Error('源表结构不完整或字段重复');
 return {fields,primaryKey:meta.key,checkedAt:new Date().toISOString(),demo:true,origin:'本地源表结构样例',fingerprint:JSON.stringify({fields,primaryKey:meta.key}),bindingId:id};
}
export function setDemoSourceSchema(p,binding,removed=''){
 const base=sourceCatalog[binding.table];if(!base)throw Error('此来源不支持演示结构切换');
 const samples=read(metadataKey(p),{});samples[binding.connection.id+':'+binding.table]={...base,fields:base.fields.filter(([name])=>name!==removed)};write(metadataKey(p),samples);
}
export function compareSourceSchema(schema,source){
 const current=new Map((schema||[]).map(f=>[f.name,f])),incoming=new Map(source.fields.map(f=>[f.name,f]));
 return [...(schema||[]).map(f=>({name:f.name,before:f.type,after:incoming.get(f.name)?.type||null,kind:!incoming.has(f.name)?'removed':icebergType(f.type)!==incoming.get(f.name).icebergType?'changed':'same'})),...source.fields.filter(f=>!current.has(f.name)).map(f=>({name:f.name,before:null,after:f.type,kind:'added'}))];
}
export function inspectSchema(p,dataset,task){
 const binding=sourceBinding(p,dataset,task);
 try{
  const source=readSourceSchema(p,binding),config=binding.task;
  if(!isCDC(config)&&queryMode(config,binding.table)==='sql')return {datasetId:dataset.id,datasetName:dataset.name,sourceTable:binding.table,source,status:'ERROR',checkedAt:source.checkedAt,diff:[],basis:schemaBasis(config),reason:'尚未接入 SQL 查询元数据服务，无法校验查询结果结构及查询依赖。请接入服务后再发布版本。'};
  // Legacy demo records originated from the complete static sample catalog.
  const baseline=dataset.acceptedSourceSchema||dataset.sourceSchemaAtCreation||config.sourceSchemas?.[binding.table];
  const accepted=baseline?.fields||sourceCatalog[binding.table]?.fields.map(([name,type])=>({name,type}))||dataset.schema;
  const dependencies=new Set([...(config.fields?.[binding.table]||[]),...(config.jdbc?.readMode==='incremental'?[config.jdbc.tables?.[binding.table]?.cursor].filter(Boolean):[])]);
  const compared=isCDC(config)?source:{...source,fields:source.fields.filter(f=>dependencies.has(f.name))};
  const prior=isCDC(config)?accepted:(dataset.schema?.length?dataset.schema:(config.sourceSchemas?.[binding.table]?.fields||[]).filter(f=>dependencies.has(f.name)));
  const diff=compareSourceSchema(prior,compared);
  for(const name of dependencies)if(!isCDC(config)&&!source.fields.some(f=>f.name===name)&&!diff.some(f=>f.name===name))diff.push({name,before:'查询依赖',after:null,kind:'removed'});
  const removed=diff.filter(f=>f.kind==='removed'),sourceDeleted=removed.filter(f=>!source.fields.some(field=>field.name===f.name)),blockReason=sourceDeleted.length?'source-deletion':'query-schema';
  return {datasetId:dataset.id,datasetName:dataset.name,sourceTable:binding.table,basis:schemaBasis(config),source,sourceVersion:dataset.versionNumber??null,diff,status:removed.length?'BLOCKED':'PASSED',blockReason,checkedAt:source.checkedAt,reason:removed.length?(sourceDeleted.length?'源表已删除列：':'查询结果已移除列：')+removed.map(f=>f.name).join('、')+'。请基于此创建新数据集。':null};
 }catch(error){return {datasetId:dataset.id,datasetName:dataset.name,status:'ERROR',checkedAt:new Date().toISOString(),reason:error.message,diff:[]};}
}
export function rememberChecks(p,checks){const prior=read(schemaCheckKey(p),{});for(const check of checks)if(check.datasetId)prior[check.datasetId]=check;write(schemaCheckKey(p),prior);}
export function checkDatasetSchema(p,dataset){const check=inspectSchema(p,dataset);rememberChecks(p,[check]);return check;}
export function schemaDiffTable(diff,basis){const labels={removed:['源表已删除','danger'],added:['源表新增','success'],changed:['类型变化','warning'],same:['一致','secondary']};return table([{title:'字段',render:f=>'<code>'+e(f.name)+'</code>'},{title:basis?.startsWith('已接受')?'已接受的源表类型':'当前查询结果 / Iceberg Schema',render:f=>e(f.before||'—')},{title:'源数据库类型',render:f=>e(f.after||'—')},{title:'差异',render:f=>badge(...labels[f.kind])}],diff,{search:false,id:'source-schema-diff'});}
export function schemaCheckBanner(check,{canWrite=false,showCreate=true,showPassed=false}={}){
 if(!check||check.status==='PASSED'&&!showPassed)return '';
 const blocked=check.status==='BLOCKED',failed=check.status==='ERROR',changed=check.diff?.some(field=>field.kind!=='same');
 return `<div class="alert alert-${blocked?'danger':failed||changed?'warning':'success'} mb-3" role="status"><div class="d-flex justify-content-between gap-3 flex-wrap"><div><strong>${blocked?(check.blockReason==='query-schema'?'版本发布已拦截 · 查询结果字段变化':'版本发布已拦截 · 源表删列'):failed?'Schema 检查未完成':changed?'Schema 检查完成 · 检测到表结构变更':'Schema 检查通过 · 未发现表结构变更'}</strong><p class="mb-1 mt-1">${e(check.reason||(changed?'发现新增列或类型变化，可展开查看结构差异。':'未发现表结构变更。'))}</p><small>${e(new Date(check.checkedAt).toLocaleString('zh-CN'))} · ${check.source?.demo?'本地演示元数据':'元数据不可用'} · 当前版本保留${check.basis?' · '+e(check.basis):''}</small></div>${showCreate&&blocked&&check.datasetId?button('基于此创建新数据集','fork-dataset',{id:check.datasetId,disabled:!canWrite}):''}</div>${blocked||changed?'<details class="mt-2"><summary>查看结构差异</summary>'+schemaDiffTable(check.diff,check.basis)+'</details>':''}</div>`;
}
