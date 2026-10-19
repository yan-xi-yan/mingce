(()=>{
'use strict';
const d=document,body=d.body,page=body.dataset.page||decodeURIComponent(location.pathname.split('/').pop()),params=new URLSearchParams(globalThis.__mingceQuery??location.search),$=s=>d.querySelector(s),all=s=>[...d.querySelectorAll(s)];
const category=body.dataset.category,lists={'数据连接':'04-数据连接列表.html','采集任务':'06-采集任务列表.html','数据集':'补充-数据集列表.html','转换流程':'15-转换流程列表.html','代码任务':'16-代码任务列表.html','调度计划':'21-调度计划列表.html','说明文档':'补充-说明文档列表.html'};
const persistedKeys=['project','empty','created','datasetName','method','savedConnection','name','output','inputRefs','outputRef','outputId','outputMode','taskId'];
const nativeReplace=history.replaceState.bind(history);history.replaceState=(a,b,u)=>{if(typeof u==='string'){const dest=new URL(u,'file:///prototype/');persistedKeys.forEach(k=>{if(params.has(k)&&!dest.searchParams.has(k))dest.searchParams.set(k,params.get(k));});u=decodeURIComponent(dest.pathname.split('/').pop())+dest.search+dest.hash;}return nativeReplace(a,b,u);};
const project=params.get('project')||'销售数据工程',ctx=['project','empty'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const route=(file,extra={})=>{const [part,hash='']=file.split('#'),[base,search='']=part.split('?'),p=new URLSearchParams(search);if(!/^0[12]-/.test(base)&&!p.has('project'))ctx.forEach(k=>{if(params.has(k))p.set(k,params.get(k));});Object.entries(extra).forEach(([k,v])=>v==null?p.delete(k):p.set(k,v));return base+(p.size?'?'+p:'')+(hash?'#'+hash:'');};
const go=(file,extra)=>location.href=route(file,extra);
let timer;function notify(text){let el=$('#unified-toast');if(!el){el=d.createElement('div');el.id='unified-toast';el.className='unified-toast';el.setAttribute('role','status');body.append(el);}el.textContent=text;el.hidden=false;clearTimeout(timer);timer=setTimeout(()=>el.hidden=true,4000);}
function button(label,fn){const b=d.createElement('button');b.className='button';b.type='button';b.textContent=label;b.onclick=fn;return b;}
function disable(el){if(!el)return;el.removeAttribute('href');el.removeAttribute('onclick');el.onclick=null;el.setAttribute('aria-disabled','true');el.title='该页面尚未设计';el.classList.add('unavailable');if(el.tagName==='BUTTON')el.disabled=true;}
function bindLink(el,href){if(!el)return;const a=d.createElement('a');a.className=el.className;a.textContent=el.textContent;a.href=route(href);el.replaceWith(a);return a;}
function feedback(parent,text){let n=parent.querySelector('.unified-feedback');if(!n){n=d.createElement('div');n.className='unified-feedback';n.setAttribute('role','status');parent.prepend(n);}n.textContent=text;return n;}
all('[data-project-name]').forEach(n=>n.textContent=project);
if(body.dataset.category){
 d.title=d.title.replaceAll('销售数据工程',project);
 if(project==='供应链分析')all('.project-identity strong').forEach(n=>n.textContent='开发者');
}

const title=$('h1');if(title&&$('.location-current')&&$('.unified-detail'))$('.location-current').textContent=title.textContent.trim();
// Keep location context across existing page transitions, including in the overview iframe.
d.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;if(a.getAttribute('aria-disabled')==='true'){e.preventDefault();return;}const href=a.getAttribute('href');if(!href||href.startsWith('#')||/^(https?:|blob:|data:)/.test(href))return;const dest=href.split(/[?#]/)[0];if(!dest.endsWith('.html'))return;let extra={};if(/^(18-|19-|20-|补充-04-)/.test(dest)&&category==='代码任务')for(const k of ['name','output','inputRefs','outputRef','outputId','outputMode','taskId'])if(params.has(k))extra[k]=params.get(k);a.setAttribute('href',route(href,extra));});
const sendRoute=()=>{if(window.parent!==window)window.parent.postMessage({type:'mingce-page',file:page,search:location.search,hash:location.hash},'*');};
window.addEventListener('hashchange',sendRoute);history.replaceState(null,'',page+location.search+location.hash);sendRoute();
// A new project's resource lists start empty until a creation flow completes.
if(params.get('empty')==='1'&&body.dataset.list==='1'){all('.content tbody').forEach(t=>t.replaceChildren());if($('.content .pager')){const pager=$('.content .pager');if(pager.querySelector('span'))pager.querySelector('span').textContent='共 0 条';else pager.textContent='共 0 条';}if($('.content .total'))$('.content .total').textContent='0';all('.tree .category').forEach(item=>{let count=item.querySelector('.count');if(!count){count=d.createElement('span');count.className='count';item.append(count);}count.textContent='0';});const content=$('.content');if(content&&!content.querySelector('.empty')){const existing=content.querySelector('#empty-results,#empty-list');if(existing){existing.textContent='当前项目暂无'+category;existing.hidden=false;}else{const empty=d.createElement('div');empty.className='list-empty no-data';empty.textContent='当前项目暂无'+category;content.querySelector('table')?.after(empty);}} }
// First release exposes only MySQL connections.
if(page==='04-数据连接列表.html'&&params.get('empty')!=='1'){
 all('.content tbody tr').filter(r=>r.textContent.includes('对象存储')).forEach(r=>r.remove());
 const count=all('.content tbody tr').length;if($('.content .total'))$('.content .total').textContent=count;
 const pager=$('.content .pager');if(pager){const n=pager.querySelector('span');if(n)n.textContent='共 '+count+' 条';else pager.textContent='共 '+count+' 条';}
}
if(params.get('empty')!=='1')all('.tree .category').filter(n=>n.textContent.includes('数据连接')).forEach(n=>{if(n.querySelector('.count'))n.querySelector('.count').textContent='1';});
if(page==='07-选择连接.html'){
 all('input[name=source][value=file]').forEach(n=>n.closest('tr').remove());
 all('option').filter(n=>n.textContent==='对象存储').forEach(n=>n.remove());
}
// Project center / project creation.
if(/^0[12]-/.test(page)){
 const main=$('main'),rows=all('main tbody tr');all('main .heading button').forEach(b=>b.onclick=()=>go('02-创建项目.html'));
 rows.forEach((r,i)=>{const cells=[...r.cells||r.querySelectorAll('td')];const links=r.querySelectorAll('.link');if(i<2){const dest=i===0?'04-数据连接列表.html?project='+encodeURIComponent('销售数据工程'):'03-新项目空状态.html?project='+encodeURIComponent('供应链分析')+'&empty=1';bindLink(links[0],dest);const a=d.createElement('a');a.href=dest;a.textContent=cells[0].textContent;cells[0].replaceChildren(a);}else disable(links[0]);if(links[1]){const b=button(links[1].textContent,()=>{b.textContent=b.textContent==='收藏'?'取消收藏':'收藏';r.dataset.favorite=String(b.textContent==='取消收藏');});b.className='link';r.dataset.favorite=String(links[1].textContent==='取消收藏');links[1].replaceWith(b);}});
 const f=main.querySelector('.filter');if(f){const old=f.querySelector('.search'),search=d.createElement('input');search.className='unified-input';search.placeholder='搜索项目名称';search.setAttribute('aria-label','搜索项目名称');old?.replaceWith(search);const specs=[['所属组织',1],['我的角色',3],['项目状态',4]];f.querySelectorAll('div.select').forEach((old,i)=>{const [label,col]=specs[i],s=d.createElement('select');s.className='unified-filter';s.setAttribute('aria-label',label);s.innerHTML='<option value="">'+label+'：全部</option>'+[...new Set(rows.map(r=>r.children[col].textContent))].map(v=>'<option>'+esc(v)+'</option>').join('');s.dataset.col=col;old.replaceWith(s);});let scope='全部项目';const filter=()=>{rows.forEach(r=>r.hidden=!(r.children[0].textContent.includes(search.value.trim())&&[...f.querySelectorAll('select')].every(s=>!s.value||r.children[+s.dataset.col].textContent===s.value)&&(scope!=='我的收藏'||r.dataset.favorite==='true')&&(scope!=='共享给我'||r.children[3].textContent!=='负责人')));};f.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.textContent==='重置'){search.value='';f.querySelectorAll('select').forEach(s=>s.value='');}filter();});search.onkeydown=e=>{if(e.key==='Enter')filter();};all('aside .nav').forEach(n=>{n.setAttribute('role','button');n.tabIndex=0;n.onclick=()=>{scope=n.textContent;all('aside .nav').forEach(x=>x.classList.toggle('active',x===n));filter();};n.onkeydown=e=>{if(e.key==='Enter')n.click();};});}
 if(page.startsWith('02-')){const fields=all('.modal-body .field');fields.forEach((field,i)=>{const val=field.querySelector('.input');if(!val)return;if(i===1||i===2){const input=d.createElement(i===2?'textarea':'input');input.id=i===1?'new-project-name':'new-project-description';input.className='unified-input';input.style.width='100%';input.value=i===1?'销售协作工程':val.textContent;input.maxLength=i===1?50:500;input.setAttribute('aria-label',i===1?'项目名称':'项目说明');val.replaceWith(input);}});all('.modal-foot button').forEach(b=>b.onclick=()=>{if(b.textContent==='取消')return go('01-项目列表.html');const name=$('#new-project-name').value.trim();if(name.length<2||name.length>50)return notify('项目名称需为 2～50 个字符');if(rows.some(r=>r.children[0].textContent===name))return notify('项目名称已存在');go('03-新项目空状态.html',{project:name,empty:'1'});});}
}
// Static list controls become working local filters; no backend request is made.
if(body.dataset.list==='1'&&!['16-代码任务列表.html','04-数据连接列表.html','补充-数据集列表.html','21-调度计划列表.html','12-已有资源列表.html'].includes(page)){
 const table=$('.content table'),toolbar=$('.content .toolbar');if(table&&toolbar){const rows=[...table.querySelectorAll('tbody tr')],heads=[...table.querySelectorAll('th')].map(x=>x.textContent.trim());const old=toolbar.querySelector('div.input'),input=d.createElement('input');input.className='unified-input';input.placeholder='搜索'+category+'名称';input.setAttribute('aria-label',input.placeholder);old?.replaceWith(input);const filters=[];toolbar.querySelectorAll('div.select').forEach(old=>{const label=old.textContent.split('：')[0].trim(),aliases={'最近测试':'最近测试','配置状态':'配置状态','检查结果':'最近检查','发布状态':'配置状态'};let col=heads.indexOf(aliases[label]||label);const s=d.createElement('select');s.className='unified-filter';s.setAttribute('aria-label',label);s.innerHTML='<option value="">'+label+'：全部</option>';if(col>=0){const values=[...new Set(rows.map(r=>r.children[col].querySelector('.status')?.textContent||r.children[col].textContent.trim()))];values.forEach(v=>{const o=d.createElement('option');o.value=v;o.textContent=v;s.append(o);});}else s.disabled=true;old.replaceWith(s);filters.push({s,col});});const apply=()=>{let count=0;const rows=[...table.querySelectorAll('tbody tr')];rows.forEach(r=>{r.hidden=!(r.children[0].textContent.includes(input.value.trim())&&filters.every(({s,col})=>!s.value||(r.children[col].querySelector('.status')?.textContent||r.children[col].textContent.trim())===s.value));if(!r.hidden)count++;});let empty=table.parentNode.querySelector('.list-empty');if(!empty){empty=d.createElement('div');empty.className='list-empty no-data';empty.textContent=params.get('empty')==='1'?'当前项目暂无'+category:'没有匹配的资源';table.after(empty);}empty.hidden=count>0;const p=$('.content .pager');if(p)p.textContent='共 '+count+' 条';};toolbar.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.textContent==='重置'){input.value='';filters.forEach(({s})=>s.value='');}apply();});input.onkeydown=e=>{if(e.key==='Enter')apply();};}
}
// Connection select/configure: cancellation returns to the list; saving has a destination.
if(['05-新建数据连接-数据库.html','补充-选择连接源.html','补充-数据连接配置.html','数据连接-编辑配置.html'].includes(page)){
 const kind=params.get('connector');if(kind&&typeof selected!=='undefined'&&sources.some(s=>s.id===kind)){selected=kind;populate();stage=2;render();update();}
 if(params.get('connection')&&$('#name'))$('#name').value=params.get('connection');
 const editing=params.get('edit')==='1';
 if(editing){
  const originalUpdate=update;
  update=function(){stage=2;originalUpdate();d.title='数据连接配置 · 明策·数据治理平台';if(title)title.textContent='数据连接配置';$('.location-current').textContent='数据连接配置';if($('.resource-header .breadcrumb'))$('.resource-header .breadcrumb').textContent='项目资源 / 数据连接 / 配置';if($('.workspace .steps'))$('.workspace .steps').hidden=true;['change','previous','next'].forEach(id=>{$('#'+id).hidden=true;$('#'+id).onclick=null;});$('#selectPage').hidden=true;$('#configPage').hidden=false;$('#save').textContent='保存修改';$('#selection').textContent=dirty?'有未保存的修改':'当前配置已保存';};
  const password=$('#password');if(password){password.value='';password.required=false;password.placeholder='已设置，留空保留';password.setAttribute('autocomplete','new-password');}
  if(params.get('connection')==='订单业务库'){$('#description').value='订单业务数据访问';$('#testStatus').textContent='最近测试成功 · 10-14 10:18';$('#testStatus').className='status ok';}
  update();
 }
 const unsupported=kind&&kind!=='mysql';
 if(unsupported){selected=null;stage=1;render();update();feedback($('.workspace'),'首期仅支持 MySQL，请返回列表新建 MySQL 连接。');['next','save','test'].forEach(id=>{$('#'+id).disabled=true;$('#'+id).onclick=null;});$('#catalog').querySelectorAll('button').forEach(b=>{b.disabled=true;b.onclick=null;});}
 const prevSave=$('#save').onclick;$('#save').onclick=()=>{prevSave();if(typeof saved!=='undefined'&&saved){const name=$('#name').value.trim(),p=new URLSearchParams({connection:name,connector:selected});if(editing)p.set('originalName',params.get('connection'));p.set('testState',tested?'成功':$('#testStatus').classList.contains('ok')?'成功':'未测试');go('04-数据连接列表.html',{savedConnection:p.toString(),created:'connection',empty:params.get('empty')});}};
 $('#cancel').onclick=()=>{if(typeof dirty!=='undefined'&&dirty&&!confirm('放弃尚未保存的内容？'))return;go('04-数据连接列表.html');};
}
// Restore connection choice when stepping backwards from the file branch.
if(page==='07-选择连接.html'){
 const kind=params.get('source')==='file'?'file':'db',radio=$('input[name=source][value="'+kind+'"]');if(radio){radio.checked=true;radio.onchange?.();}
 all('a').filter(a=>/补充-02-/.test(a.getAttribute('href')||'')).forEach(a=>a.href=route(a.getAttribute('href'),{source:'file'}));
}
if(page==='补充-02-选择文件范围.html'||page==='补充-03-文件采集规则.html'){
 all('a[href]').forEach(a=>{const h=a.getAttribute('href');if(/^(07-|补充-0[23]-|10-)/.test(h))a.href=route(h,{source:'file'});});
 all('button').filter(b=>/检查匹配范围|重新预览/.test(b.textContent)).forEach(b=>b.onclick=()=>notify('已刷新示例文件范围与预览'));
}
if(page==='10-确认任务与输出.html'&&params.get('source')==='file'){
 const a=$('#save-draft'),old=a?.onclick;if(a)a.onclick=function(e){if(!$('#task-name').value.trim()||!$('#output-name').value.trim()){e.preventDefault();notify('请填写任务名称和输出数据集名称');return;}old?.call(this,e);this.href=route(this.getAttribute('href'));};
}
if(page==='11-任务配置.html'){
 all('button').filter(b=>b.textContent.includes('编辑配置')).forEach(b=>b.onclick=()=>go(params.get('source')==='file'?'补充-02-选择文件范围.html':'08-选择源表.html',Object.fromEntries(params)));
 const h=$('#task-title');if(h&&$('.location-current'))$('.location-current').textContent=h.textContent;
 if(params.get('existing')==='1'&&h){const badge=h.parentNode.querySelector('.status');if(badge&&params.get('name')!=='退款记录采集'){badge.textContent='已发布';badge.className='status blue';}}
}
// Dataset creation enters the existing list, preserving the new name and origin.
if(page==='13-新建数据集-文件上传.html'||page==='14-新建数据集-表格录入.html'){
 const finish=$('#finish-dataset');if(finish)finish.onclick=()=>{const name=$('#dataset-new-name').value.trim();if(!name)return notify('请填写资源名称');if(['订单明细','退款明细','库存快照','渠道字典'].includes(name))return notify('数据集名称已存在');go('补充-数据集列表.html',{group:'raw',created:'dataset',datasetName:name,method:page.startsWith('13')?'文件导入':'手工录入',empty:params.get('empty')});};
 all('.smallbtn').forEach(b=>{b.onclick=()=>{const tables=all('.preview table');if(b.textContent.includes('添加行')){const r=d.createElement('tr');r.innerHTML='<td contenteditable="true">填写门店编码</td><td contenteditable="true">填写分组名称</td><td><button type="button" class="action">删除行</button></td>';r.querySelector('button').onclick=()=>r.remove();tables.at(-1).querySelector('tbody').append(r);}else notify('本次仅展示已有字段，字段编辑界面尚未设计');};});
}
if(['补充-数据集列表.html','12-已有资源列表.html'].includes(page)){
 if(params.get('empty')==='1'&&typeof datasets!=='undefined'){datasets.splice(0,datasets.length);if(typeof activate==='function')activate(params.get('group')==='processed'?'processed':'raw');else if(typeof render==='function')render();}
 if(params.has('datasetName')&&typeof datasets!=='undefined'){const name=params.get('datasetName');if(!datasets.some(x=>x.name===name))datasets.push({id:'created-dataset',name,group:params.get('group')==='processed'?'processed':'raw',description:'',method:params.get('method')||'文件导入',source:params.get('method')==='手工录入'?'表格录入':'上传文件',kind:'导入文件',input:'本次创建',state:'可用',owner:'张敏',updated:'刚刚'});if(typeof activate==='function')activate(params.get('group')==='processed'?'processed':'raw');else if(typeof render==='function')render();feedback($('.content'),'数据集“'+name+'”已创建（演示）');}
}
// Code task name and bindings are carried through preparation / template / upload.
if(page==='17-创建并绑定数据.html'){
 const create=all('.actions a').find(a=>a.textContent==='创建代码任务');if(create)create.onclick=e=>{const name=$('input[aria-label="代码任务名称"]').value.trim(),out=$('input[aria-label="输出名称"]').value.trim(),refs=all('input').filter(x=>/引用名称/.test(x.getAttribute('aria-label')||'')).map(x=>x.value.trim());if(!name||!out||refs.some(x=>!/^[_A-Za-z][_A-Za-z0-9]*$/.test(x))||new Set(refs).size!==refs.length){e.preventDefault();return notify('请填写任务和输出名称，引用名称应合法且互不重复');}create.href=route('18-开发准备.html',{name,output:out,inputRefs:refs.slice(0,-1).join(','),outputRef:refs.at(-1)});};
}
if(/^(18-|19-|20-|补充-04-)/.test(page)&&params.get('name')){
 const h=$('h1');if(h){const text=[...h.childNodes].find(n=>n.nodeType===3);if(text)text.textContent=params.get('name');}if($('.location-current'))$('.location-current').textContent=params.get('name');
 all('td').forEach(td=>{if(td.textContent.trim()==='每日销售汇总'&&params.get('output'))td.textContent=params.get('output');});all('code').forEach(c=>{if(c.textContent==='daily_sales'&&params.get('outputRef'))c.textContent=params.get('outputRef');});
}

// Draft state pages keep existing destinations; unsupported conflict resolution and publication stay disabled.
if(page.startsWith('草稿-')){
 all('.textbtn,a,button').filter(n=>n.textContent.trim()==='‹ 返回我的草稿').forEach(n=>bindLink(n,'草稿-列表.html'));
 all('.textbtn').filter(n=>n.textContent.trim()==='放弃草稿').forEach(n=>bindLink(n,'草稿-放弃确认.html'));
 all('button').forEach(b=>{const label=b.textContent.trim();if(['校验','发布','处理冲突'].includes(label))disable(b);if(['重新加载','刷新','重置筛选'].includes(label))b.onclick=()=>go('草稿-列表.html');if(label==='前往项目资源')b.onclick=()=>go('04-数据连接列表.html');if(label==='确认放弃')b.onclick=()=>go('草稿-列表.html',{discarded:'inventory'});if(['继续编辑','稍后处理','清除临时内容','恢复到编辑区'].includes(label)&&b.closest('.modal'))b.onclick=()=>{b.closest('.modal').remove();all('.veil,.overlay,.backdrop').forEach(n=>n.remove());notify(label==='恢复到编辑区'?'已恢复示例编辑内容':'已返回草稿编辑区');};if(label==='重试保存'||label==='保存草稿')b.onclick=()=>notify('示例草稿已保存');});
 if(page==='草稿-列表.html'&&params.get('discarded')==='inventory'){const row=$('tbody tr');row?.remove();feedback($('main'),'草稿已放弃（演示）');}
}

// For code version and runtime tabs without an existing page, show unavailable state.
all('.tabs span,.tabs a:not([href])').forEach(el=>{if(/^(代码版本|运行记录|检查记录)$/.test(el.textContent.trim()))disable(el);});
// Materialize project context for normal clicks, open-in-new-tab and copied links.
all('a[href]').forEach(a=>{const href=a.getAttribute('href');if(href&&!/^(https?:|blob:|data:|#)/.test(href)&&href.split(/[?#]/)[0].endsWith('.html'))a.setAttribute('href',route(href));});
// Undefined links are never made clickable just to complete a visual prototype.
all('a[href="#"],a[href="javascript:void(0)"]').forEach(disable);
if(window.parent!==window){const old=history.replaceState.bind(history);history.replaceState=(...args)=>{old(...args);sendRoute();};}

// Unreleased navigation has no click, keyboard or URL destination.
all('.project-navigation a,.project-navigation button').filter(n=>n.textContent.trim()==='成员与权限').forEach(n=>{const a=d.createElement('a');a.textContent='成员与权限';a.href=route('项目成员与权限.html');n.replaceWith(a);});
const closedLabels=new Set(['我的草稿','最近访问','我的收藏','共享给我']);
all('a,button,.nav').forEach(n=>{if(closedLabels.has(n.textContent.trim())||/^(草稿-)/.test(n.getAttribute('href')||'')){disable(n);n.onkeydown=null;n.tabIndex=-1;n.title='暂未开放';}});
})();
