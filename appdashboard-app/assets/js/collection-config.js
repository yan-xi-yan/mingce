import {publicationSeconds,validatePublicationSeconds,intervalLabel} from './continuous-versions.js';
import {databaseType,databaseLabel} from './database-types.js';
import {sourceCatalog} from './source-catalog.js';
import {queryMode,schemaBasis,sourceFields} from './collection-selection.js';
import {uuid} from './uuid.js';
import {escape as e,input,select,textarea,alert,table} from './html.js';

// Business configuration only. Runtime deployment, credentials, offsets and
// schema-history storage are supplied by the future execution service.
export function collectionDefaults(record={},connection={}){
 const type=databaseType(connection);
 return {
  sourceSchemas:structuredClone(record.sourceSchemas||{}),
  versionIntervalSeconds:publicationSeconds(record),
  method:record.method||(record.mode==='continuous'?'CDC':'JDBC'),
  jdbc:{readMode:record.mode==='incremental'?'incremental':'full',writeMode:record.mode==='incremental'?'append':'snapshot',fetchSize:'1000',queryTimeout:'300',...record.jdbc,tables:Object.fromEntries((record.tables||[]).map(t=>[t,{cursor:record.incrementalField||'',initialValue:'',sql:'',...record.jdbc?.tables?.[t]}]))},
  cdc:{'snapshot.mode':'initial','database.server.id':'','slot.name':'','publication.name':'','publication.autocreate.mode':'filtered','database.dbname':'','database.pdb.name':'',schema:type==='POSTGRESQL'?'public':type==='SQLSERVER'?'dbo':type==='ORACLE'?connection.user||'':'','max.batch.size':'2048','max.queue.size':'8192','poll.interval.ms':'500','heartbeat.interval.ms':'0',...record.cdc,'topic.prefix':record.cdc?.['topic.prefix']||'mc_cdc_'+uuid().replaceAll('-','')}
 };
}
export const collectionMode=f=>f.method==='CDC'?'continuous':f.jdbc.readMode==='incremental'?'incremental':'full';
export const tableRule=(f,t)=>f.jdbc.tables[t]??={cursor:'',initialValue:'',sql:''};
export function queryFor(f,t,connection={}){
 const type=databaseType(connection),quote=x=>type==='MYSQL'?'`'+x.replaceAll('`','``')+'`':type==='SQLSERVER'?'['+x.replaceAll(']',']]')+']':'"'+x.replaceAll('"','""')+'"';
 const rule=tableRule(f,t),fields=(f.fields[t]||[]).map(quote).join(', ');
 return `SELECT ${fields}\nFROM ${quote(t)}`+(f.jdbc.readMode==='incremental'&&rule.cursor?`\nWHERE ${quote(rule.cursor)} > ?\nORDER BY ${quote(rule.cursor)}`:'');
}
function integer(value,label,min=1,max=2147483647){if(!/^\d+$/.test(String(value))||Number(value)<min||Number(value)>max)throw Error(label+'需为 '+min+'～'+max+' 的整数');}
export function validateOutputs(f,existing=[],id){
 const names=f.tables.map(t=>String(f.outputs[t]||'').trim());
 if(names.some(n=>!n||n.length>100))throw Error('每个输出数据集名称需为 1～100 个字符');
 if(new Set(names).size!==names.length)throw Error('每张源表需要不同的输出数据集名称');
 if(names.some(n=>existing.some(d=>d.name===n&&d.producer!==id)))throw Error('输出名称已被数据集占用，请返回源表与输出页面修改');
}
export function validateCollection(f,connection={},otherTasks=[]){
 if(!['JDBC','CDC'].includes(f.method))throw Error('请选择 JDBC 或 CDC');
 if(f.method==='JDBC'){
  if(!['full','incremental'].includes(f.jdbc.readMode)||!['snapshot','append'].includes(f.jdbc.writeMode))throw Error('请选择有效的 JDBC 同步模式');
  if(f.jdbc.readMode==='incremental'&&f.jdbc.writeMode!=='append')throw Error('递增读取需要追加写入');
  integer(f.jdbc.fetchSize,'每批读取行数');integer(f.jdbc.queryTimeout,'查询超时',0);
  for(const t of f.tables){const rule=tableRule(f,t);if(f.jdbc.readMode==='incremental'){
   if(!(queryMode(f,t)==='sql'?sourceFields(f,t).map(field=>field.name):f.fields[t])?.includes(rule.cursor))throw Error(t+'：请选择已采集的递增字段');
   if(!String(rule.initialValue).trim())throw Error(t+'：请填写递增字段的初始值');
   const type=sourceCatalog[t]?.fields.find(([name])=>name===rule.cursor)?.[1]||'';
   if(/int|decimal|numeric|float|double/.test(type)&&!/^[-+]?\d+(\.\d+)?$/.test(rule.initialValue))throw Error(t+'：数值游标的初始值必须是数值');
  }
  if(queryMode(f,t)==='sql'&&rule.sql.trim()){if(!/^select\s/i.test(rule.sql.trim())||/;/.test(rule.sql))throw Error(t+'：仅支持单条 SELECT 查询，请勿包含分号');const count=(rule.sql.match(/\?/g)||[]).length;if(count!==(f.jdbc.readMode==='incremental'?1:0))throw Error(t+'：递增查询需恰好一个 ? 游标参数，全量查询不使用参数');}
  }
 }else{
  validatePublicationSeconds(f.versionIntervalSeconds);
  const c=f.cdc,type=databaseType(connection);
  if(!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(c['topic.prefix']))throw Error('逻辑源标识需以字母或数字开头，仅包含字母、数字、下划线、点或短横线');
  if(otherTasks.some(t=>t.id!==f.id&&t.cdc?.['topic.prefix']===c['topic.prefix']))throw Error('逻辑源标识已被当前项目的其他采集任务使用');
  if(!['initial','no_data'].includes(c['snapshot.mode']))throw Error('请选择有效的初始快照模式');
  for(const k of ['max.batch.size','max.queue.size','poll.interval.ms','heartbeat.interval.ms'])integer(c[k],k,k==='heartbeat.interval.ms'?0:1);
  if(+c['max.queue.size']<=+c['max.batch.size'])throw Error('队列容量必须大于单批事件数');
  if(type==='MYSQL'){integer(c['database.server.id'],'MySQL Server ID',1,4294967295);if(otherTasks.some(t=>t.id!==f.id&&t.connection===f.connection&&t.cdc?.['database.server.id']===c['database.server.id']))throw Error('该连接的 MySQL Server ID 已被其他采集任务使用');}
  if(type!=='MYSQL'&&!/^[A-Za-z_][A-Za-z0-9_$#]*$/.test(c.schema))throw Error('请填写一个有效的来源 Schema');
  if(type==='POSTGRESQL'){
   if(!/^[a-z0-9_]{1,63}$/.test(c['slot.name']))throw Error('复制槽名称需为 1～63 位小写字母、数字或下划线');
   if(!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(c['publication.name']))throw Error('请填写有效的 Publication 名称');
   if(!['filtered','disabled'].includes(c['publication.autocreate.mode']))throw Error('请选择 Publication 创建方式');
   if(otherTasks.some(t=>t.id!==f.id&&t.connection===f.connection&&t.cdc?.['slot.name']===c['slot.name']))throw Error('该连接的复制槽已被其他采集任务使用');
  }
  if(type==='ORACLE'&&!c['database.dbname'].trim())throw Error('请填写 Oracle 数据库名称（CDB / 非 CDB）');
  for(const t of f.tables){const names=sourceFields(f,t).map(field=>field.name);if(names.length!==f.fields[t]?.length||names.some(name=>!f.fields[t].includes(name)))throw Error(t+'：CDC 必须采集完整源表字段，请重新确认源表结构');}
 }
}
export function cdcScope(f,connection={}){
 const prefix=databaseType(connection)==='MYSQL'?connection.database:f.cdc.schema;
 const regexLiteral=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return f.tables.map(t=>regexLiteral(prefix)+String.raw`\.`+regexLiteral(t)).join(',');
}
export function savedCollection(f,connection){
 const jdbc={...f.jdbc,tables:Object.fromEntries(f.tables.map(t=>[t,{...tableRule(f,t),queryMode:queryMode(f,t),sql:queryMode(f,t)==='sql'?tableRule(f,t).sql.trim():'',sqlDraft:tableRule(f,t).sqlDraft||tableRule(f,t).sql}]))};
 const allowed=['topic.prefix','snapshot.mode','max.batch.size','max.queue.size','poll.interval.ms','heartbeat.interval.ms'];
 const type=databaseType(connection);
 if(type==='MYSQL')allowed.push('database.server.id');
 else allowed.push('schema');
 if(type==='POSTGRESQL')allowed.push('slot.name','publication.name','publication.autocreate.mode');
 if(type==='ORACLE')allowed.push('database.dbname','database.pdb.name');
 const cdc=Object.fromEntries(allowed.map(k=>[k,String(f.cdc[k]).trim()]));
 cdc['table.include.list']=cdcScope(f,connection);
 if(type==='MYSQL')cdc['database.include.list']=String(connection.database||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 if(type==='POSTGRESQL'){cdc['plugin.name']='pgoutput';cdc['slot.drop.on.stop']='false';}
 if(type==='ORACLE')cdc['database.connection.adapter']='logminer';
 if(type==='SQLSERVER')cdc['database.names']=connection.database;
 return {sourceSchemas:Object.fromEntries(f.tables.filter(t=>f.sourceSchemas?.[t]).map(t=>[t,structuredClone(f.sourceSchemas[t])])),schemaCheckBasis:schemaBasis(f),method:f.method,mode:collectionMode(f),...(f.method==='JDBC'?{jdbc}:{cdc,versionIntervalSeconds:validatePublicationSeconds(f.versionIntervalSeconds)})};
}
const section=(title,body)=>`<section class="card mb-3"><div class="card-header"><h3 class="card-title mb-0">${e(title)}</h3></div><div class="card-body">${body}</div></section>`;
const choices=(name,value,items)=>`<div class="row g-3 mb-4">${items.map(([id,label,description])=>`<div class="col-md-6"><div class="plan-card h-100"><input class="btn-check" type="radio" id="${name}-${id}" name="${name}" value="${id}" ${value===id?'checked':''}><label class="plan-card-label h-100" for="${name}-${id}"><strong class="d-block mb-1">${e(label)}</strong><span class="small text-muted">${e(description)}</span></label></div></div>`).join('')}</div>`;
export const collectionMethodForm=f=>choices('method',f.method,[['JDBC','JDBC · 批量读取','图形化选择字段或编写 SQL，支持全量与递增读取。'],['CDC','CDC · 持续变更','整表采集全部字段，使用 Debezium 持续捕获变更。']]);
export function collectionRulesForm(f,connection){
 let body='<p class="small text-muted mb-3">采集方式：'+e(f.method)+' · 结构检测依据：'+e(schemaBasis(f))+'</p>';
 if(f.method==='JDBC'){
  body+=section('同步模式',select('读取方式','jdbc:readMode',f.jdbc.readMode,[{value:'full',label:'全量读取'},{value:'incremental',label:'递增字段读取'}])+select('数据集写入方式','jdbc:writeMode',f.jdbc.writeMode,f.jdbc.readMode==='incremental'?[{value:'append',label:'Append · 追加新记录'}]:[{value:'snapshot',label:'Snapshot · 替换为本次完整结果'},{value:'append',label:'Append · 追加本次完整结果'}],{hint:f.jdbc.writeMode==='append'?'追加模式保留历史记录；重复读取可能产生重复数据。':'每次成功同步生成一个完整快照。'}));
  body+=f.tables.map(t=>{const r=tableRule(f,t);return section(t+' → '+f.outputs[t],(f.jdbc.readMode==='incremental'?`<div class="row"><div class="col-md-6">${select('递增字段','cursor:'+t,r.cursor,[{value:'',label:'请选择递增字段'},...(queryMode(f,t)==='sql'?sourceFields(f,t).map(field=>field.name):f.fields[t]||[]).map(x=>({value:x,label:x}))])}</div><div class="col-md-6">${input('初始游标值','initial:'+t,r.initialValue,{placeholder:'例如 0 或 2026-01-01 00:00:00'})}</div></div><p class="form-text mb-3">使用非空、单调递增的字段。只读取大于已保存游标的行，不捕获删除，也不会补读游标之前的修改。</p>`:'')+`<p class="small text-muted">${queryMode(f,t)==='sql'?'SQL 查询 · 在上一步编辑':'图形化选择 · 自动生成查询'}${f.jdbc.readMode==='incremental'?' · SQL 模式需在查询中保留一个 ? 游标参数':''}</p>`+`<pre class="bg-light border rounded p-3 small mb-0 text-wrap"><code>${e(queryMode(f,t)==='sql'?r.sql:queryFor(f,t,connection))}</code></pre>`);}).join('');
  body+=`<details class="card mb-3"><summary class="card-header">高级读取参数</summary><div class="card-body row"><div class="col-md-6">${input('每批读取行数','jdbc:fetchSize',f.jdbc.fetchSize,{type:'number',extra:'min="1"'})}</div><div class="col-md-6">${input('查询超时（秒，0 为不限）','jdbc:queryTimeout',f.jdbc.queryTimeout,{type:'number',extra:'min="0"'})}</div></div></details>`;
 }else{
  const c=f.cdc,type=databaseType(connection),text=(label,key,props={})=>input(label,'cdc:'+key,c[key],props);
  let specific='';
  if(type==='MYSQL')specific=text('MySQL Server ID','database.server.id',{placeholder:'例如 5401'})+'<p class="form-text">database.server.id · 必须在源 MySQL 集群内唯一。</p>';
  else specific=text('来源 Schema','schema');
  if(type==='POSTGRESQL')specific+='<p class="small text-muted">逻辑解码插件：pgoutput</p>'+text('复制槽名称（slot.name）','slot.name',{placeholder:'例如 sales_cdc'})+text('Publication 名称','publication.name',{placeholder:'例如 sales_publication'})+select('Publication 创建方式','cdc:publication.autocreate.mode',c['publication.autocreate.mode'],[{value:'filtered',label:'按所选源表创建 / 更新（filtered）'},{value:'disabled',label:'使用已存在的 Publication（disabled）'}]);
  if(type==='ORACLE')specific+='<p class="small text-muted">日志适配器：LogMiner</p>'+text('数据库名称（database.dbname）','database.dbname',{placeholder:'例如 ORCLCDB'})+text('PDB 名称（可选）','database.pdb.name',{placeholder:'例如 ORCLPDB1'})+'<p class="form-text">CDB 部署请填写 PDB。数据库名称与连接的 Service Name 分开配置。</p>';
  if(type==='SQLSERVER')specific+=`<p class="small text-muted">database.names：${e(connection.database)}（来自连接）</p>`;
  const prerequisites={MYSQL:'源库需启用 ROW 格式 binlog，并授予复制与快照读取权限。',POSTGRESQL:'源库需启用 logical WAL，账号需有复制权限；自动创建 Publication 还需要相应建表发布权限。',ORACLE:'源库需启用归档日志及补充日志，并授予 LogMiner 和快照读取权限。',SQLSERVER:'需在数据库及所选源表上启用 SQL Server CDC，并确保捕获作业运行。'};
  body+=section('初始快照与变更捕获',select('首次启动方式（snapshot.mode）','cdc:snapshot.mode',c['snapshot.mode'],[{value:'initial',label:'先读取已有数据，再持续捕获变更（initial）'},{value:'no_data',label:'仅捕获后续变更，不读取已有数据（no_data）'}],{hint:c['snapshot.mode']==='no_data'?'已有历史数据不会补入输出数据集。':'已有有效位点时从位点恢复；初始快照参数不用于强制重置位点。'}));
  body+=section('数据集版本发布',input('版本发布间隔（秒）','versionIntervalSeconds',f.versionIntervalSeconds,{type:'number',extra:'min="60" max="86400" required'})+'<p class="form-text">持续捕获源端变更，每个时间窗口结束时发布一个可见版本。默认 300 秒（5 分钟），不创建调度计划；'+(c['snapshot.mode']==='no_data'?'跳过初始快照，首个时间窗口结束后发布版本。':'初始快照完成后先发布基线版本。')+'</p>');
  body+=section(databaseLabel(connection)+' · Debezium 配置',specific+alert(prerequisites[type],'secondary'));
  body+=`<details class="card mb-3"><summary class="card-header">高级捕获参数</summary><div class="card-body row">${[['单批事件数','max.batch.size'],['队列容量','max.queue.size'],['轮询间隔（毫秒）','poll.interval.ms'],['心跳间隔（毫秒，0 为关闭）','heartbeat.interval.ms']].map(([label,k])=>`<div class="col-md-6">${text(label,k,{type:'number',extra:'min="'+(k==='heartbeat.interval.ms'?0:1)+'"'})}<span class="form-text mb-3">${e(k)}</span></div>`).join('')}</div></details>`;
  body+=`<p class="small text-muted">table.include.list：<code>${e(cdcScope(f,connection))}</code></p><p class="small text-muted">捕获范围继承上一步的 ${f.tables.length} 张表的全部字段；每张源表一个输出，主键用于更新与删除定位。字段筛选、别名与表达式请在下游转换中配置。</p>`;
 }
 return body;
}
export function collectionRuleDetails(record,connection={}){
 if(!record.method)return '';
 const f={...record,...collectionDefaults(record,connection)};
 if(f.method==='CDC')return section('数据集版本发布','<p class="mb-0">每 '+e(intervalLabel(f))+' 发布一个版本 · 持续采集内部处理，不使用调度计划。</p>')+section('CDC · Debezium 参数',table([{title:'配置项',key:'key'},{title:'配置值',key:'value'}],Object.entries(record.cdc||{}).map(([key,value])=>({key,value})),{search:false,id:'cdc-config-details'}));
 return section('JDBC · 同步配置',`<p>${f.jdbc.readMode==='incremental'?'递增字段读取':'全量读取'} · ${f.jdbc.writeMode==='append'?'追加写入':'完整快照'} · 每批 ${e(f.jdbc.fetchSize)} 行 · 超时 ${e(f.jdbc.queryTimeout)} 秒</p>`+f.tables.map(t=>`<h4 class="h6">${e(t)}</h4>${f.jdbc.readMode==='incremental'?`<p class="small">递增字段：${e(tableRule(f,t).cursor)} · 初始值：${e(tableRule(f,t).initialValue)}</p>`:''}<pre class="bg-light p-3 text-wrap"><code>${e(tableRule(f,t).sql||queryFor(f,t,connection))}</code></pre>`).join(''));
}
