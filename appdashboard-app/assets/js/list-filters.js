import {escape as e,table,icon,pickerControl} from './html.js';
import {databaseLabel} from './database-types.js';
const states=new Map();
export {mountFilterSelects,disposeFilterSelects,syncFilterSelects} from './filter-selects.js';
const field=(key,label,get,labels)=>({key,label,get,labels});
const definitions={
 projects:[field('organization','所属组织',r=>r.organization),field('role','我的角色',r=>r.role),field('status','项目状态',r=>r.status)],
 connections:[field('databaseType','数据库类型',databaseLabel),field('test','测试状态',r=>r.test||'未测试')],
 datasets:[field('group','数据分组',r=>r.group,{raw:'原始数据',processed:'加工数据'}),field('method','来源方式',r=>r.method),field('source','来源',r=>r.source),field('state','数据状态',r=>r.state||'状态待确认')],
 tasks:[field('mode','采集方式',r=>r.mode,{full:'全量读取',incremental:'递增字段读取',continuous:'持续变更采集'}),field('connection','来源连接',r=>r.connection),field('published','配置状态',r=>r.published?(r.mode==='continuous'?'已保存':'已发布'):'草稿')],
 code:[field('configStatus','配置状态',r=>r.configStatus||'DRAFT',{DRAFT:'草稿',READY:'已就绪'}),field('updatedBy','修改人',r=>r.updatedBy)],
 plans:[field('mode','触发方式',r=>r.mode,{event:'上游更新触发',cron:'定时触发',time:'定时触发',schedule:'定时触发'}),field('enabled','计划状态',r=>r.enabled?'enabled':'disabled',{enabled:'已启用',disabled:'停用'})],
 runs:[field('type','任务类型',r=>r.type,{batch:'批次采集',continuous:'持续采集',code:'代码任务',flow:'转换流程'}),field('status','运行状态',r=>r.status==='SUCCESS'?'SUCCEEDED':r.status,{QUEUED:'排队中',RUNNING:'运行中',SUCCEEDED:'成功',FAILED:'失败',PARTIAL_FAILED:'部分失败',STOPPING:'停止中',STOPPED:'已停止',CANCELLED:'已取消'})]
};
function state(key){if(!states.has(key))states.set(key,{draft:{},applied:{}});return states.get(key);}
export function filterSnapshot(form){return form?{key:form.dataset.resourceFilters,...structuredClone(state(form.dataset.resourceFilters))}:null;}
export function restoreFilterSnapshot(saved){if(saved)states.set(saved.key,{draft:{...saved.draft},applied:{...saved.applied}});}
export function rememberFilters(form){state(form.dataset.resourceFilters).draft=Object.fromEntries(new FormData(form));}
export function applyFilters(form){rememberFilters(form);const s=state(form.dataset.resourceFilters),{from,to}=s.draft,error=form.querySelector('[data-filter-error]');if(from&&to&&from>to){error.textContent='开始日期不能晚于结束日期。';error.hidden=false;return false;}s.applied={...s.draft};return true;}
export function resetFilters(form){states.delete(form.dataset.resourceFilters);}
export function resourceTable(view,project,columns,rows,options={}){
 const key=JSON.stringify([project,view]),s=state(key),defs=definitions[view]||[],q=s.applied,keyword=(q.keyword||'').trim().toLocaleLowerCase();
 const filtered=rows.filter(r=>{
 const text=view==='projects'?r.name.toLocaleLowerCase():columns.filter(c=>c.title!=='操作').map(c=>c.render?c.render(r):r[c.key]||'').join(' ').replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').toLocaleLowerCase();
 if(keyword&&!text.includes(keyword))return false;
 if(defs.some(f=>q[f.key]&&String(f.get(r)??'')!==q[f.key]))return false;
 if(view==='runs'&&(q.from||q.to)){const date=r.start?new Date(new Date(r.start).getTime()+8*3600000).toISOString().slice(0,10):'';if(!date||q.from&&date<q.from||q.to&&date>q.to)return false;}
 return true;
 });
 const controls=defs.map(f=>{const values=[...new Set(rows.map(r=>String(f.get(r)??'')).filter(Boolean))];if(s.draft[f.key]&&!values.includes(s.draft[f.key]))values.push(s.draft[f.key]);return '<div class="col-auto" style="width: '+(view==='datasets'?(f.key==='source'?260:160):180)+'px;"><label class="form-label" for="filter-'+e(f.key)+'">'+e(f.label)+'</label><select class="form-select" data-choices data-choices-sort="false" data-choices-search="'+(f.key==='source'||values.length>8)+'" name="'+e(f.key)+'" id="filter-'+e(f.key)+'"><option value="">全部</option>'+values.map(v=>'<option value="'+e(v)+'" '+(s.draft[f.key]===v?'selected':'')+'>'+e(f.labels?.[v]||v)+'</option>').join('')+'</select></div>';}).join('');
 const dates=view==='runs'?['from','to'].map((name,i)=>'<div class="col-auto" style="width: 210px;"><label class="form-label" for="filter-'+name+'">'+(i?'结束日期':'开始日期')+'</label>'+pickerControl({id:'filter-'+name,name,value:s.draft[name]||''})+'</div>').join(''):'';
 return '<form data-resource-filters="'+e(key)+'" class="mb-3"><div class="row g-3 align-items-end"><div class="col-auto" style="width: '+(view==='datasets'?240:260)+'px;"><label class="form-label" for="resource-keyword">'+(view==='projects'?'项目名称':'关键词')+'</label><div class="input-group"><span class="input-group-text">'+icon('search')+'</span><input type="search" class="form-control" id="resource-keyword" name="keyword" aria-label="'+(view==='projects'?'搜索项目名称':'搜索列表')+'" placeholder="'+(view==='projects'?'搜索项目名称':'名称或关键词')+'" value="'+e(s.draft.keyword||'')+'"></div></div>'+controls+dates+'<div class="col-auto d-flex gap-2"><button class="btn btn-primary" type="submit">查询</button><button class="btn btn-outline-secondary" type="reset">重置</button></div></div><div class="text-danger small mt-2" data-filter-error role="alert" hidden></div></form><p class="text-muted small mb-3" role="status">共 '+rows.length+' 条，符合条件 '+filtered.length+' 条</p>'+table(columns,filtered,{...options,search:false,empty:rows.length?'没有符合筛选条件的记录，请调整条件或重置。':options.empty});
}
