import {sourceCatalog} from './source-catalog.js';
import {escape as e,icon,badge,table,alert} from './html.js';

// The original selection workflow, using AppDashboard's list-group, table and tabs.
export class SourcePicker{
 constructor(form,onChange){this.form=form;this.onChange=onChange;this.active=form.tables[0]||Object.keys(sourceCatalog)[0];this.tableQuery='';this.fieldQuery='';this.onlySelected=false;this.previewFresh=false;}
 required(name){const f=this.form;return f.mode==='continuous'?[sourceCatalog[name].key]:f.mode==='incremental'&&sourceCatalog[name].fields.some(([field])=>field===f.incrementalField)?[f.incrementalField]:[];}
 ensureRequired(){for(const name of this.form.tables){const fields=this.form.fields[name]||[];this.form.fields[name]=[...new Set([...fields,...this.required(name)])];}}
 selectedFields(name){return this.form.fields[name]||[];}
 visibleTables(){return Object.keys(sourceCatalog).filter(name=>name.toLowerCase().includes(this.tableQuery.trim().toLowerCase()));}
 visibleFields(){return sourceCatalog[this.active].fields.filter(([name])=>name.toLowerCase().includes(this.fieldQuery.trim().toLowerCase())&&(!this.onlySelected||this.selectedFields(this.active).includes(name)));}
 markup(connection){
  this.ensureRequired();const f=this.form,total=f.tables.reduce((n,name)=>n+this.selectedFields(name).length,0);
  return `<div data-source-picker><div class="d-flex justify-content-between align-items-center gap-3 mb-3"><p class="text-muted small mb-0">来源连接：${e(connection?.name||'—')} · ${e(connection?.database||'—')}</p><span class="badge badge-soft-primary" id="source-selection-summary">已选 ${f.tables.length} 张表 · ${total} 个字段</span></div><div class="row g-3"><div class="col-4"><section class="card h-100"><div class="card-header"><h3 class="card-title mb-0">源表 <span class="text-muted small">${Object.keys(sourceCatalog).length} 张</span></h3></div><div class="card-body"><label class="visually-hidden" for="source-table-search">搜索表名称</label><div class="input-group mb-2"><span class="input-group-text">${icon('search')}</span><input id="source-table-search" class="form-control" type="search" placeholder="搜索表名称" value="${e(this.tableQuery)}"></div><div class="d-flex gap-2 mb-2"><button type="button" class="btn btn-link btn-sm p-0" data-source-action="select-tables">全选结果</button><button type="button" class="btn btn-link btn-sm" data-source-action="clear-tables">取消选择</button></div><div class="list-group" id="source-table-list"></div><p class="text-muted small mt-3 mb-0">点击整行选择，点击复选框取消。</p></div></section></div><div class="col-8"><section class="card h-100"><div class="card-header d-flex justify-content-between align-items-center gap-2"><h3 class="card-title mb-0" id="source-active-table"></h3><span class="badge badge-soft-secondary" id="source-field-count"></span></div><div class="card-body"><p class="small text-muted" id="source-scope-status"></p><ul class="nav nav-tabs mb-3" role="tablist"><li class="nav-item" role="presentation"><button class="nav-link active" id="source-fields-tab" type="button" data-bs-toggle="tab" data-bs-target="#source-fields-pane" role="tab" aria-controls="source-fields-pane" aria-selected="true">采集字段</button></li><li class="nav-item" role="presentation"><button class="nav-link" id="source-preview-tab" type="button" data-bs-toggle="tab" data-bs-target="#source-preview-pane" role="tab" aria-controls="source-preview-pane" aria-selected="false">数据预览</button></li></ul><div class="tab-content"><div class="tab-pane fade show active" id="source-fields-pane" role="tabpanel" aria-labelledby="source-fields-tab"><label class="visually-hidden" for="source-field-search">搜索字段名</label><div class="input-group mb-2"><span class="input-group-text">${icon('search')}</span><input type="search" id="source-field-search" class="form-control" placeholder="搜索字段名" value="${e(this.fieldQuery)}"></div><div class="d-flex align-items-center gap-2 flex-wrap mb-3"><button class="btn btn-link btn-sm p-0" type="button" data-source-action="select-fields">全选搜索结果</button><button class="btn btn-link btn-sm" type="button" data-source-action="clear-fields">取消选择搜索结果</button><div class="form-check ms-auto"><input class="form-check-input" type="checkbox" id="source-only-selected" ${this.onlySelected?'checked':''}><label class="form-check-label small" for="source-only-selected">仅看已选</label></div></div><div id="source-fields-table"></div><p class="form-text" id="source-required-info"></p></div><div class="tab-pane fade" id="source-preview-pane" role="tabpanel" aria-labelledby="source-preview-tab"><div class="d-flex justify-content-between gap-2 align-items-center mb-3"><span class="text-muted small" id="source-preview-status">所选字段的样例数据</span><button class="btn btn-outline-secondary btn-sm" type="button" data-source-action="refresh-preview">刷新预览</button></div><div id="source-preview-output"></div></div></div></div></section></div></div><p class="text-muted small mt-3 mb-0">源表结构和预览均为演示样例；每张所选源表至少保留一个采集字段。</p></div>`;
 }
 mount(host,next){
  this.dispose();this.host=host.querySelector('[data-source-picker]');this.next=next;if(!this.host)return;
  this.inputHandler=event=>{if(event.target.id==='source-table-search'){this.tableQuery=event.target.value;this.renderTables();}if(event.target.id==='source-field-search'){this.fieldQuery=event.target.value;this.renderFields();}};
  this.changeHandler=event=>{
   const target=event.target;if(target.id==='source-only-selected'){this.onlySelected=target.checked;this.renderFields();return;}
   if(target.dataset.sourceTable){const name=target.dataset.sourceTable;if(target.checked){this.addTable(name);this.active=name;this.fieldQuery='';this.onlySelected=false;this.host.querySelector('#source-field-search').value='';this.host.querySelector('#source-only-selected').checked=false;}else this.form.tables=this.form.tables.filter(t=>t!==name);this.changed();}
   if(target.dataset.sourceField){const name=target.dataset.sourceField,fields=this.selectedFields(this.active);this.form.fields[this.active]=target.checked?[...new Set([...fields,name])]:fields.filter(f=>f!==name);this.changed();}
  };
  this.clickHandler=event=>{
   const target=event.target.closest('[data-source-action],[data-source-view]');if(!target||target.disabled)return;
   if(target.dataset.sourceView){const name=target.dataset.sourceView,added=!this.form.tables.includes(name);this.addTable(name);this.active=name;this.fieldQuery='';this.onlySelected=false;this.host.querySelector('#source-field-search').value='';this.host.querySelector('#source-only-selected').checked=false;this.previewFresh=false;if(added)this.changed();else this.refresh();return;}
   const command=target.dataset.sourceAction;
   if(command==='refresh-preview'){this.previewFresh=true;this.renderPreview();return;}
   if(command==='select-tables')this.visibleTables().forEach(name=>this.addTable(name));
   if(command==='clear-tables')this.form.tables=this.form.tables.filter(name=>!this.visibleTables().includes(name));
   if(command==='select-fields')this.form.fields[this.active]=[...new Set([...this.selectedFields(this.active),...this.visibleFields().map(([name])=>name)])];
   if(command==='clear-fields'){const visible=this.visibleFields().map(([name])=>name);this.form.fields[this.active]=this.selectedFields(this.active).filter(name=>!visible.includes(name)||this.required(this.active).includes(name));}
   this.changed();
  };
  this.host.addEventListener('input',this.inputHandler);this.host.addEventListener('change',this.changeHandler);this.host.addEventListener('click',this.clickHandler);this.refresh();
 }
 dispose(){if(!this.host)return;this.host.removeEventListener('input',this.inputHandler);this.host.removeEventListener('change',this.changeHandler);this.host.removeEventListener('click',this.clickHandler);this.host=null;}
 addTable(name){if(!this.form.tables.includes(name))this.form.tables.push(name);this.form.fields[name]??=sourceCatalog[name].fields.map(([field])=>field);this.form.outputs[name]??=name+'_raw';}
 changed(){this.ensureRequired();this.previewFresh=false;this.onChange();this.refresh();}
 refresh(){const active=document.activeElement,key=active?.dataset.sourceField?'sourceField':active?.dataset.sourceTable?'sourceTable':active?.dataset.sourceView?'sourceView':null,value=key?active.dataset[key]:null;this.renderTables();this.renderFields();this.renderPreview();if(key){const selector={sourceField:'[data-source-field]',sourceTable:'[data-source-table]',sourceView:'[data-source-view]'}[key];Array.from(this.host.querySelectorAll(selector)).find(el=>el.dataset[key]===value)?.focus({preventScroll:true});}}
 // Original components-list-group.html uses stretched-link to make a whole
 // list item clickable. Keep a separate checkbox above that hit area so users
 // can remove a table without losing selections when revisiting its fields.
 renderTables(){const f=this.form;this.host.querySelector('#source-table-list').innerHTML=this.visibleTables().map(name=>`<div class="list-group-item list-group-item-action position-relative d-flex align-items-center gap-2 ${name===this.active?'list-group-item-primary':''}"><div class="form-check mb-0"><input type="checkbox" class="form-check-input position-relative z-2" id="source-table-${e(name)}" data-source-table="${e(name)}" aria-label="${e(name)}" ${f.tables.includes(name)?'checked':''}></div><button type="button" class="btn btn-link stretched-link position-static text-start justify-content-start p-0 flex-grow-1" data-source-view="${e(name)}" aria-pressed="${name===this.active}">${e(name)}</button><span class="small text-muted">${f.tables.includes(name)?this.selectedFields(name).length+' 字段':'未选'}</span></div>`).join('')||alert('未找到源表。','secondary');}
 renderFields(){
  const name=this.active,selected=this.form.tables.includes(name),locks=this.required(name),fields=this.selectedFields(name),items=this.visibleFields();
  this.host.querySelector('#source-active-table').textContent=name;
  this.host.querySelector('#source-field-count').textContent=(selected?fields.length:0)+' / '+sourceCatalog[name].fields.length+' 个字段';
  this.host.querySelector('#source-scope-status').textContent=selected?'已加入采集范围':'未加入采集范围 · 点击左侧源表即可选择并配置字段';
  this.host.querySelector('#source-fields-table').innerHTML=table([{title:'选择',render:([field])=>`<div class="form-check"><input class="form-check-input" type="checkbox" data-source-field="${e(field)}" aria-label="采集 ${e(field)}" ${selected&&fields.includes(field)?'checked':''} ${!selected||locks.includes(field)?'disabled':''}></div>`},{title:'字段名称',render:([field])=>e(field)},{title:'数据类型',render:([,type])=>e(type)},{title:'主键',render:([field])=>field===sourceCatalog[name].key?badge('主键','primary'):'—'}],items,{search:false,id:'source-field-table',empty:'没有匹配的字段。'});
  this.host.querySelectorAll('[data-source-action="select-fields"],[data-source-action="clear-fields"]').forEach(button=>button.disabled=!selected||!items.length);
  this.host.querySelector('#source-required-info').textContent=selected&&locks.length?'当前采集方式必须保留：'+locks.join('、'):'';
  this.host.querySelector('#source-selection-summary').textContent='已选 '+this.form.tables.length+' 张表 · '+this.form.tables.reduce((n,t)=>n+this.selectedFields(t).length,0)+' 个字段';
  if(this.next)this.next.disabled=!this.form.tables.length||this.form.tables.some(t=>!this.selectedFields(t).length);
 }
 renderPreview(){
  const name=this.active,fields=this.selectedFields(name),selected=this.form.tables.includes(name);
  this.host.querySelector('[data-source-action="refresh-preview"]').disabled=!selected||!fields.length;
  this.host.querySelector('#source-preview-status').textContent=this.previewFresh?name+' · 2 条样例':'预览待刷新';
  const indices=sourceCatalog[name].fields.map(([field],index)=>fields.includes(field)?index:-1).filter(i=>i>=0);
  this.host.querySelector('#source-preview-output').innerHTML=this.previewFresh?table(indices.map(index=>({title:sourceCatalog[name].fields[index][0],render:row=>e(row[index]===''?'（空字符串）':row[index])})),sourceCatalog[name].rows,{search:false,id:'source-preview-table'}):alert(selected?'点击“刷新预览”查看所选字段的样例数据。':'点击左侧源表即可选择。','secondary');
 }
}
