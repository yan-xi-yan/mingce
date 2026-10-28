import {codeOutputNames} from './code-bindings.js';
import {resourceLink} from './resource-navigation.js';
import {escape as e,icon,badge,button,table,alert} from './html.js';

const taskType=task=>task.kind==='tasks'?'采集任务':task.kind==='code'?'代码任务':'转换流程';
const link=resourceLink;
const typeIcon=kind=>kind==='tasks'?'cloud-download':kind==='code'?'code-slash':kind==='connection'?'database':kind==='dataset'?'layers':kind==='file'?'file-earmark-spreadsheet':'diagram-3';
const state=task=>task.kind==='code'?badge(task.configStatus==='READY'?'已就绪':'草稿',task.configStatus==='READY'?'success':'warning'):badge(task.published?(task.mode==='continuous'?'已保存':'已发布'):'草稿',task.published?'success':'warning');
const node=(kind,body,extra='')=>`<div class="card mb-3 ${extra}"><div class="card-body"><div class="d-flex align-items-start gap-3"><span class="widget-stat-icon primary flex-shrink-0">${icon(typeIcon(kind))}</span><div class="flex-grow-1 text-break">${body}</div></div></div></div>`;

// Follows main's three-column dependency view, using template cards and table.
export function datasetLineage(record,{producer,downstream=[],connection,allDatasets=[]}={}){
 const hasOrigin=!!producer||!!record.producer||!!record.source;
 const sourceType=producer?taskType(producer):record.producer?'来源任务':record.method||'来源信息';
 const sourceTable=record.table||record.sourceTable||producer?.tables?.find(name=>producer.outputs?.[name]===record.name)||(producer?.tables?.length===1?producer.tables[0]:null);
 let origin;
 if(producer){
  const inputs=(producer.inputs||[]).map(id=>allDatasets.find(data=>data.id===id)).filter(Boolean);
  origin=node(producer.kind,`<p class="text-muted small mb-2">生产来源 · ${taskType(producer)}</p><h4 class="h6 mb-2">${link(producer.name,producer.kind,producer.id)}</h4>${state(producer)}${connection?`<div class="small mt-3">来源连接：${link(connection.name,'connection',connection.id)}</div>`:producer.connection?`<p class="small mt-3 mb-1">来源连接：${e(producer.connection)}（连接已不可用）</p>`:''}${sourceTable?`<p class="small text-muted mt-2 mb-0">源表：${e(connection?.database?connection.database+'.'+sourceTable:sourceTable)}</p>`:''}${inputs.length?`<div class="small mt-3">输入数据集：<div class="d-flex flex-column align-items-start gap-2 mt-2">${inputs.map(data=>link(data.name,'dataset',data.id)).join('')}</div></div>`:''}`);
 }else if(record.producer){
  origin=node('tasks',`<p class="text-muted small mb-2">生产来源 · ${e(sourceType)}</p><h4 class="h6">${e(record.source||'来源任务')}</h4><p class="small text-muted mb-0">来源任务已不可用，保留已有来源信息。</p>`);
 }else if(hasOrigin){
  const isFile=record.method==='文件导入';
  origin=node(isFile?'file':'dataset',`<p class="text-muted small mb-2">生产来源 · ${e(sourceType)}</p><h4 class="h6 text-break">${e(record.source)}</h4><p class="small text-muted mb-0">${isFile?'通过文件导入生成数据集。':['手动创建','手工录入','手动录入'].includes(record.method)?'通过手动录入维护数据，没有上游生产任务。':'当前仅有来源描述，未绑定可查看的生产任务。'}</p>`);
 }else origin=alert('暂无可确认的生产来源。','secondary');
 const targetCards=downstream.map(task=>{
  const names=task.kind==='code'?codeOutputNames(task):task.output?[task.output]:Object.values(task.outputs||{});
  const outputs=names.map(name=>{
   const existing=allDatasets.find(data=>data.name===name);
   const data=existing&&(!existing.producer||existing.producer===task.id)?existing:null;
   return `<div class="mt-2">${data?link(data.name,'dataset',data.id):`<span class="text-break">${e(name)}</span> <span class="text-muted">· ${existing?'当前由其他任务生产':'尚未产出'}</span>`}</div>`;
  });
  return '<div class="list-group-item"><div class="d-flex align-items-center justify-content-between gap-2"><span class="text-muted small">'+icon(typeIcon(task.kind))+' '+taskType(task)+'</span>'+state(task)+'</div><h4 class="h6 mt-2 mb-2">'+link(task.name,task.kind,task.id)+'</h4>'+(outputs.length?'<div class="small text-muted">输出去向：'+outputs.join('')+'</div>':'')+'</div>';
 }).join('');
 const destinations=targetCards?'<div class="list-group">'+targetCards+'</div>':alert('暂无直接使用方。当前没有任务绑定此数据集为输入。','secondary');

 const rows=[...(hasOrigin?[{relation:'生产来源',name:producer?.name||record.source||'来源任务',type:sourceType,description:'负责生成或更新当前数据集',resource:producer}]:[]),...downstream.map(task=>({relation:'直接使用方',name:task.name,type:taskType(task),description:'以当前数据集作为任务输入',resource:task}))];
 return `<section aria-label="数据集来源与去向"><div class="d-flex align-items-center justify-content-between gap-3 mb-3"><h3 class="h6 mb-0">当前依赖关系</h3>${badge((hasOrigin?1:0)+' 个生产来源 · '+downstream.length+' 个直接使用方','secondary')}</div><div class="row g-3 align-items-start flex-nowrap mb-4"><div class="col" aria-label="生产来源"><h4 class="h6 text-muted mb-3">生产来源</h4>${origin}</div><div class="col-auto text-center text-muted mt-5 pt-4" aria-hidden="true">${icon('arrow-right')}<div class="small mt-1">生成</div></div><div class="col" aria-label="当前数据集"><h4 class="h6 text-muted mb-3">当前数据集</h4>${node('dataset',`<p class="text-primary small mb-2">当前数据集</p><h4 class="h6 text-break">${e(record.name)}</h4><p class="text-muted small mb-2">${record.group==='processed'?'加工数据':'原始数据'}</p>${badge(record.state||'状态待确认',record.state==='可用'?'success':'warning')}${record.versionNumber!=null?' '+badge('v'+record.versionNumber,'primary'):''}`,'border-primary')}</div><div class="col-auto text-center text-muted mt-5 pt-4" aria-hidden="true">${icon('arrow-right')}<div class="small mt-1">使用</div></div><div class="col" aria-label="数据去向"><h4 class="h6 text-muted mb-3">数据去向</h4>${destinations}</div></div><h3 class="h6">关系明细</h3>${table([{key:'relation',title:'关系'},{key:'name',title:'资源名称'},{key:'type',title:'资源类型'},{key:'description',title:'引用说明'},{title:'操作',render:row=>row.resource?link('查看任务',row.resource.kind,row.resource.id):'—'}],rows,{search:false,id:'lineage-relations',empty:'当前没有已记录的依赖关系。'})}<p class="small text-muted mb-0">按当前任务配置展示直接依赖；不会将调度计划当作数据使用方。</p></section>`;
}
