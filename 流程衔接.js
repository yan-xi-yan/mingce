/* Frontend workflow affordances and session list projections. No service calls or lifecycle transitions. */
(() => {
'use strict';
const d=document,page=d.body.dataset.page,p=new URLSearchParams(location.search),project=p.get('project')||'销售数据工程';
const $=s=>d.querySelector(s),all=s=>[...d.querySelectorAll(s)],id=s=>d.getElementById(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(key,fallback=[])=>{try{return JSON.parse(sessionStorage.getItem(key))??fallback;}catch{return fallback;}};
const store=(key,value)=>{try{sessionStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
// Discard obsolete workflow indexes left by the previous UI version.
try{for(const key of Object.keys(sessionStorage))if(key.startsWith('mingce.ui.ingest-drafts.v1.'))sessionStorage.removeItem(key);}catch{}
const route=(file,extra={})=>{const q=new URLSearchParams();for(const k of ['project','empty','as','projectId'])if(p.has(k))q.set(k,p.get(k));Object.entries(extra).forEach(([k,v])=>{if(v!=null)q.set(k,v);});return file+'?'+q;};
const connectionKey='mingce.ui.connections.v1.'+project,taskKey='mingce.ui.ingest-tasks.v1.'+project;
const connections=()=>{const rows=read(connectionKey);return Array.isArray(rows)?rows.filter(x=>x&&typeof x.name==='string'):[];};
const tasks=()=>{const rows=read(taskKey);return Array.isArray(rows)?rows.filter(x=>x&&typeof x.name==='string'&&typeof x.query==='string'):[];};
function notice(host,text,actions=[]){if(!host)return;const n=d.createElement('div');n.className='workflow-notice';n.setAttribute('role','status');const s=d.createElement('span');s.textContent=text;n.append(s);for(const [label,href]of actions){const a=d.createElement('a');a.textContent=label;a.href=href;n.append(a);}host.prepend(n);return n;}
function focusError(button,selector){button?.addEventListener('click',()=>{const field=$(selector);if(field){field.focus();field.scrollIntoView({block:'center'});}});}
if(page==='02-创建项目.html'){
 all('.modal-foot button').filter(b=>b.classList.contains('primary')).forEach(button=>button.addEventListener('click',()=>{const input=id('new-project-name'),name=input?.value.trim(),rows=all('main tbody tr');let message='';if(!name||name.length<2)message='请输入 2～50 个字符的项目名称';else if(rows.some(r=>r.cells[0]?.textContent===name))message='同一组织内已有这个项目，请换一个名称';if(message){let error=id('project-name-error');if(!error){error=d.createElement('div');error.id='project-name-error';error.className='workflow-error';input.after(error);input.setAttribute('aria-describedby',error.id);}error.textContent=message;input.setAttribute('aria-invalid','true');input.focus();}}));
}
if(page==='04-数据连接列表.html'){
 if(p.has('savedConnection')){const saved=new URLSearchParams(p.get('savedConnection')),name=saved.get('connection');if(name)notice($('.content'),'连接已保存。接下来选择源表并配置采集任务。',[['使用此连接创建采集任务',route('07-选择连接.html',{connection:name})]]);}
 all('.content tbody tr').forEach(row=>{const name=row.cells[0]?.textContent.trim();if(!name)return;const a=d.createElement('a');a.className='action';a.href=route('07-选择连接.html',{connection:name});a.textContent='创建采集任务';row.cells[6].append(a);});
}
if(['补充-选择连接源.html','补充-数据连接配置.html','05-新建数据连接-数据库.html','数据连接-编辑配置.html'].includes(page)){
 id('save')?.addEventListener('click',e=>{const name=id('name').value.trim(),original=p.get('connection');if(connections().some(x=>x.name===name&&x.name!==original)){e.preventDefault();e.stopImmediatePropagation();const error=id('nameError');error.hidden=false;error.textContent='当前项目已有同名连接，请换一个名称';id('name').setAttribute('aria-invalid','true');id('name').focus();}},true);
 // Existing validation remains authoritative; bring its first error into view.
 for(const key of ['test','save'])focusError(id(key),'#configPage input[aria-invalid="true"]');
}
if(page==='07-选择连接.html'){
 const body=$('.workspace tbody'),next=id('next'),toolbar=$('.workspace .toolbar');if(!body||!next)return;
 let records=connections();
 if(!records.length&&p.get('empty')!=='1')records=[{name:'订单业务库',test:'成功'},{name:'历史业务库',test:'失败'}];
 let selected=p.get('connection')||'';if(!records.some(r=>r.name===selected))selected='';
 const oldSearch=toolbar.querySelector('.input'),search=d.createElement('input');search.className='unified-input';search.placeholder='搜索连接名称';search.setAttribute('aria-label','搜索连接名称');oldSearch?.replaceWith(search);
 const oldSelect=toolbar.querySelector('.select');if(oldSelect){const label=d.createElement('span');label.className='workflow-subtle';label.textContent='MySQL';oldSelect.replaceWith(label);}
 body.replaceChildren();records.forEach((record,i)=>{const row=body.insertRow();row.innerHTML='<td><input type="radio" name="source" value="db" aria-label="'+esc(record.name)+'" data-index="'+i+'"></td><td>'+esc(record.name)+'</td><td>关系型数据库</td><td><span class="status">'+esc(record.test||'未测试')+'</span></td><td><a href="'+esc(route('数据连接-编辑配置.html',{connection:record.name,connector:'mysql',edit:'1'}))+'">配置连接</a></td>';const radio=row.querySelector('input');radio.checked=record.name===selected;radio.onchange=()=>{selected=record.name;update();};row.onclick=e=>{if(!e.target.closest('a,input')){radio.checked=true;radio.dispatchEvent(new Event('change'));}};});
 const empty=d.createElement('div');empty.className='workflow-empty';empty.hidden=records.length>0;empty.textContent='当前项目还没有数据连接。先创建连接，再回来选择源表。';body.closest('table').after(empty);
 const add=d.createElement('a');add.className='button';add.textContent='新建数据连接';add.href=route('补充-选择连接源.html',{returnTo:'collection'});toolbar.append(add);
 const hint=id('selected');
 function update(){const record=records.find(r=>r.name===selected),failed=record?.test==='失败';const disabled=!record||failed;next.setAttribute('aria-disabled',String(disabled));next.classList.toggle('disabled',disabled);next.style.pointerEvents='';next.textContent='下一步：选择源表';hint.textContent=failed?'该连接最近测试失败，请在连接配置中修正并重新测试。':record?'已选择：'+record.name+(record.test==='成功'?'':' · 尚未测试，可先到连接配置中测试'):'请选择一个连接后继续';all('.workspace tbody tr').forEach(row=>row.classList.toggle('selected',row.querySelector('input').checked));if(!disabled)next.href=route('08-选择源表.html',{connection:selected});else next.removeAttribute('href');}
 next.onclick=e=>{if(next.getAttribute('aria-disabled')==='true'){e.preventDefault();return;}next.href=route('08-选择源表.html',{connection:selected});};
 function filter(){let count=0;all('.workspace tbody tr').forEach(row=>{row.hidden=!row.cells[1].textContent.toLowerCase().includes(search.value.trim().toLowerCase());if(!row.hidden)count++;});empty.hidden=count>0;empty.textContent=records.length?'没有匹配的连接，请调整搜索条件。':'当前项目还没有数据连接。先新建连接，再选择源表。';}
 search.oninput=filter;toolbar.querySelectorAll('button').forEach(button=>button.onclick=()=>{if(button.textContent==='重置')search.value='';filter();});update();filter();
}
if(/^(08-|09-|10-|11-)/.test(page||'')&&p.get('source')!=='file'){
 const connection=p.get('connection')||'订单业务库';
 // The prototype catalog remains sample metadata, not a live database inspection.
 all('.source-label,.meta-line>span').filter(n=>n.textContent.startsWith('来源连接：')).forEach(n=>n.textContent='来源连接：'+connection);
 all('.resource-header .meta').forEach(n=>n.textContent=n.textContent.replaceAll('销售数据工程',project));
 if(page.startsWith('08-'))notice($('.workspace .form'),'选择源表，再选择需要采集的字段。当前显示示例元数据，不会读取真实数据库。');
 const labels={'08-':'下一步：配置采集规则','09-':'下一步：确认任务与输出'};for(const [prefix,label]of Object.entries(labels))if(page.startsWith(prefix)&&id('next'))id('next').textContent=label;
 if(page.startsWith('10-')){
  notice($('.workspace .form'),'保存后创建任务并保存配置，不会发布或启动采集。');
  id('save-task')?.addEventListener('click',e=>{if(tasks().some(x=>x.name===id('task-name').value.trim()&&x.id!==p.get('selectionId'))){e.preventDefault();e.stopImmediatePropagation();id('flow-error').textContent='当前项目已有同名采集任务，请换一个名称';id('task-name').focus();}},true);
  focusError(id('save-task'),'#task-name:placeholder-shown');
  id('save-task')?.addEventListener('click',()=>{const error=id('flow-error');if(!error?.textContent)return;const field=!id('task-name').value.trim()?id('task-name'):all('[data-output]').find(n=>!n.value.trim())||all('[data-output]')[0];field?.focus();error.scrollIntoView({block:'center'});});
 }
 if(page.startsWith('11-')){
  const ref=p.get('selectionId'),state=ref?read('mingce.ingest.'+ref,null):null;
  if(state&&p.get('existing')!=='1'){const rows=tasks(),record={id:ref,name:state.name||id('task-title').textContent,connection,mode:state.mode,query:p.toString()};store(taskKey,[record,...rows.filter(r=>r.id!==ref)]);}
  if(p.get('existing')!=='1')notice($('.workspace .form'),'任务配置已保存。当前原型尚未提供校验与发布，未发布任务暂不能运行或配置调度。',[['返回采集任务',route('06-采集任务列表.html')],['查看可调度任务',route('22-选择执行任务.html')]]);
 }
}
if(page==='06-采集任务列表.html'){
 const root=$('.content'),body=root?.querySelector('tbody');if(!body)return;
 for(const record of tasks()){const row=body.insertRow(0);row.innerHTML='<td><a href="'+esc('11-任务配置.html?'+record.query)+'">'+esc(record.name)+'</a></td><td>'+esc(({full:'批量',incremental:'批量',continuous:'持续'})[record.mode]||'批量')+'</td><td>'+esc(record.connection)+'</td><td><span class="status wait">未发布</span></td><td>尚未运行</td><td>本次会话</td><td><a href="'+esc('11-任务配置.html?'+record.query)+'">配置</a></td>';}
 const rows=[...body.rows],input=root.querySelector('.toolbar input'),selects=[...root.querySelectorAll('.toolbar select')];
 selects.forEach((select,i)=>{const col=i===0?1:3,values=[...new Set(rows.map(r=>r.cells[col].textContent.trim()))];select.replaceChildren(new Option(i===0?'采集方式：全部':'配置状态：全部',''));values.forEach(v=>select.add(new Option(v,v)));select.disabled=false;});
 function filter(){let count=0;rows.forEach(row=>{row.hidden=!(row.cells[0].textContent.includes(input?.value.trim()||'')&&selects.every((s,i)=>!s.value||row.cells[i===0?1:3].textContent.trim()===s.value));if(!row.hidden)count++;});let empty=root.querySelector('.list-empty');if(!empty){empty=d.createElement('div');empty.className='list-empty no-data';root.querySelector('table').after(empty);}empty.hidden=count>0;empty.textContent=rows.length?'没有匹配的采集任务':'还没有采集任务。点击“新建采集任务”，选择连接与源表。';root.querySelector('.total').textContent=rows.length;root.querySelector('.pager').textContent='共 '+count+' 条';}
 input?.addEventListener('input',filter);selects.forEach(s=>s.onchange=filter);root.querySelectorAll('.toolbar button').forEach(button=>button.onclick=()=>{if(button.textContent==='重置'){input.value='';selects.forEach(s=>s.value='');}filter();});filter();
}
if(page==='22-选择执行任务.html'){
 const next=id('next'),body=$('.workspace tbody');
 // New projects have no published targets; never substitute another project's seed tasks.
 if(p.get('empty')==='1'){body.replaceChildren();id('no-tasks').hidden=false;id('no-tasks').textContent=tasks().length?'当前项目只有未发布任务。任务发布后才能配置调度；当前原型尚未提供发布。':'当前项目还没有已发布且支持调度的任务。';id('target-summary').textContent='尚未选择执行任务';next.removeAttribute('href');next.setAttribute('aria-disabled','true');next.classList.add('disabled');next.onclick=e=>e.preventDefault();notice($('.workspace .form'),'调度只能选择当前项目已发布且支持调度的任务。',[['查看采集任务',route('06-采集任务列表.html')],['查看代码任务',route('16-代码任务列表.html')]]);const input=id('plan-name');input.value='';input.placeholder='任务发布后可创建计划';id('plan-description').value='';all('#task-query,#task-reset,#task-search,#task-type').forEach(n=>n.disabled=true);}
 else{
  // Require an intentional target selection for a new plan rather than silently selecting an example.
  if(!p.has('target')&&!p.has('planId')){all('input[name=target]').forEach(r=>{r.checked=false;r.closest('tr').classList.remove('selected');});id('target-summary').textContent='请选择要执行的任务';const old=next.onclick;next.onclick=e=>{if(!$('input[name=target]:checked')){e.preventDefault();id('plan-error').textContent='请选择一个已发布任务';$('input[name=target]')?.focus();return;}old.call(next,e);};id('plan-name').value='';id('plan-name').placeholder='例如：订单每日采集';id('plan-description').value='';}
  all('input[name=target]').forEach(r=>r.closest('tr').addEventListener('click',e=>{if(!e.target.closest('input')){r.checked=true;r.dispatchEvent(new Event('change'));}id('plan-error').textContent='';}));
 }
 if(next)next.textContent='下一步：配置触发规则';
}
// Focused form errors should be announced; no change to module validation decisions.
all('.field-error,.form-error,.schedule-error').forEach(el=>el.setAttribute('aria-live','polite'));
})();
