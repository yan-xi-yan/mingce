/* Local prototype only: task metadata and run feedback mirror the API contract. */
(()=>{'use strict';
const d=document,q=new URLSearchParams(globalThis.__mingceQuery??location.search),page=d.body.dataset.page,project=q.get('project')||'销售数据工程',actor=q.get('as')||'zhang',key='mingce.code-tasks.v1.'+project,$=s=>d.querySelector(s),all=s=>[...d.querySelectorAll(s)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seeds=()=>project==='销售数据工程'&&q.get('empty')!=='1'?[{id:'code-channel-daily',name:'渠道指标计算',description:'按日期和渠道汇总订单',configStatus:'READY',revision:1,updatedBy:'张敏',updatedAt:'2026-10-19T10:00:00+08:00',fileName:'channel-metrics.zip',run:null},{id:'code-quality-check',name:'数据质量规则',description:'检查订单数据质量',configStatus:'DRAFT',revision:1,updatedBy:'张敏',updatedAt:'2026-10-18T10:00:00+08:00',run:null}]:[];
let data;try{data=JSON.parse(sessionStorage.getItem(key)||'null')||seeds();}catch{data=seeds();}
let role=({zhang:'owner',li:'admin',wang:'developer',chen:'viewer'})[actor];try{const a=JSON.parse(localStorage.getItem('mingce-permissions-v1:'+(q.get('projectId')||project))||'null');if(a)role=a.members?.find(m=>m.id===actor)?.role;}catch{}
const editable=['owner','admin','developer'].includes(role)&&q.get('archived')!=='1';
function route(file,extras={}){const p=new URLSearchParams(q);p.set('project',project);Object.entries(extras).forEach(([k,v])=>v==null?p.delete(k):p.set(k,v));return file+'?'+p;}
function persist(){try{sessionStorage.setItem(key,JSON.stringify(data));return true;}catch{alert('本地保存失败，请检查浏览器存储空间后重试。');return false;}}
function disable(a,reason){a.removeAttribute('href');a.onclick=null;a.removeAttribute('onclick');a.setAttribute('aria-disabled','true');a.title=reason;a.classList.add('disabled');if(a.tagName==='BUTTON')a.disabled=true;}
if(!role){$('main').innerHTML='<section class="resource-header"><h1>无权查看代码任务</h1></section>';return;}
if(page==='16-代码任务列表.html'){
 const search=$('#code-search'),status=$('#code-status');search.value=q.get('keyword')||'';status.value=q.get('configStatus')||'';
 function render(){const rows=data.filter(t=>t.name.toLowerCase().includes(search.value.trim().toLowerCase())&&(!status.value||t.configStatus===status.value)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||b.id.localeCompare(a.id));
 $('#code-rows').innerHTML=rows.map(t=>{const link=route(t.configStatus==='READY'?'20-代码配置详情.html':'18-开发准备.html',{taskId:t.id,name:t.name,keyword:search.value.trim()||null,configStatus:status.value||null});return '<tr><td><a class="name" href="'+esc(link)+'">'+esc(t.name)+'</a></td><td>Python</td><td><span class="status '+(t.configStatus==='DRAFT'?'wait':'')+'">'+(t.configStatus==='READY'?'已就绪':'未就绪')+'</span></td><td>'+esc(t.updatedBy)+'</td><td>'+esc(new Date(t.updatedAt).toLocaleString('zh-CN',{hour12:false}))+'</td><td><a href="'+esc(link)+'">打开</a></td></tr>';}).join('');
 $('#code-total').textContent=data.length;$('#code-empty').hidden=!!rows.length;$('#code-pager').textContent='共 '+rows.length+' 条 · 每页 20 条 · 1 / 1';
 }
 $('#code-query').onclick=render;$('#code-reset').onclick=()=>{search.value='';status.value='';render();};search.onkeydown=e=>{if(e.key==='Enter')render();};render();if(!editable)disable($('#new-code-task'),'当前角色不可新建代码任务');return;
}
const taskId=q.get('taskId')||(page==='20-代码配置详情.html'?'code-channel-daily':'code-draft-demo');let task=data.find(t=>t.id===taskId);
if(!task){task={id:taskId,name:q.get('name')||'渠道指标计算',description:'',configStatus:page==='20-代码配置详情.html'?'READY':'DRAFT',revision:1,updatedBy:'张敏',updatedAt:new Date().toISOString(),fileName:'channel-metrics.zip',run:null};data.push(task);if(editable)persist();}
q.set('taskId',taskId);q.set('name',task.name);
function links(){all('a[href]').forEach(a=>{const file=a.getAttribute('href').split(/[?#]/)[0];if(/^(16-|18-|19-|20-|补充-04-)/.test(file))a.href=route(file,{taskId:file.startsWith('16-')?null:taskId,name:file.startsWith('16-')?null:task.name});});}
function heading(){const h=$('h1');if(h)h.innerHTML=esc(task.name)+' <span class="status '+(task.configStatus==='DRAFT'?'wait':'')+'">'+(task.configStatus==='READY'?'已就绪':'未就绪')+'</span>';if($('.location-current'))$('.location-current').textContent=task.name;d.title=task.name+' · 代码任务';links();}
heading();
all('.row-actions a,.btnrow a').filter(a=>/上传|替换|下载开发模板/.test(a.textContent)).forEach(a=>{if(!editable)disable(a,'当前角色不可修改代码包或下载开发模板');});
if(page==='补充-04-上传代码包.html'){
 const save=$('.modalactions .primary'),note=$('input[aria-label="上传说明"]');const back=task.configStatus==='READY'?'20-代码配置详情.html':'18-开发准备.html';all('.modalactions a:not(.primary),.modalhead a').forEach(a=>a.href=route(back));
 if(!editable)disable(save,'当前角色不可保存代码包');else save.onclick=e=>{e.preventDefault();const next={...task,configStatus:'READY',fileName:'channel-metrics.zip',uploadDescription:note?.value||'',revision:task.revision+1,updatedAt:new Date().toISOString(),updatedBy:({zhang:'张敏',li:'李明',wang:'王琳'})[actor]};data=data.map(t=>t.id===task.id?next:t);if(persist())location.href=route('20-代码配置详情.html');};return;
}
if(!['18-开发准备.html','20-代码配置详情.html'].includes(page))return;
const name=$('#code-name'),description=$('#code-description'),save=$('#save-code-config'),note=$('#code-save-state'),runButton=$('button.run');name.value=task.name;description.value=task.description;name.disabled=description.disabled=!editable;
function dirty(){return name.value.trim()!==task.name||description.value!==task.description;}
function busy(){return ['QUEUED','RUNNING'].includes(task.run?.status);}
function controls(){save.disabled=!editable||!dirty();note.textContent=!editable?'当前为只读':dirty()?'有未保存的修改':'配置已保存';runButton.disabled=!editable||task.configStatus!=='READY'||busy()||dirty();runButton.title=!editable?'当前角色不可运行任务':dirty()?'请先保存任务信息':task.configStatus!=='READY'?'请先上传并保存代码包':busy()?'任务正在排队或运行':'';}
name.addEventListener('input',controls);description.addEventListener('input',controls);
save.onclick=()=>{if(!editable||!dirty())return;const n=name.value.trim();if(!n||n.length>100||/[\x00-\x1f\x7f]/.test(n)){note.textContent='请填写 1～100 字的有效任务名称';name.focus();return;}if(data.some(t=>t.id!==taskId&&t.name===n)){note.textContent='同项目中已存在此代码任务名称';return;}if(description.value.length>500){note.textContent='用途说明不能超过 500 字';return;}
 const prior=task;const next={...task,name:n,description:description.value,revision:task.revision+1,updatedAt:new Date().toISOString(),updatedBy:({zhang:'张敏',li:'李明',wang:'王琳'})[actor]};data=data.map(t=>t.id===taskId?next:t);if(!persist()){data=data.map(t=>t.id===taskId?prior:t);return;}task=next;name.value=n;q.set('name',n);heading();controls();note.textContent='配置已保存（本地演示）';};
function showRun(){const r=task.run;$('#code-run-status').textContent=({QUEUED:'排队中',RUNNING:'运行中',SUCCEEDED:'运行成功',FAILED:'运行失败',UNAVAILABLE:'暂不可查询'})[r?.status]||'尚未运行';$('#code-run-message').textContent=!r?'运行后在此查看本次结果。':r.status==='FAILED'?r.failureReason:r.status==='SUCCEEDED'?'本次演示已完成。':r.status==='QUEUED'?'已受理，等待执行。':r.status==='RUNNING'?'正在处理输入数据。':'请稍后刷新。';controls();}
function tick(){if(!busy())return;const elapsed=Date.now()-task.run.startedAt,next=elapsed<900?'QUEUED':elapsed<2700?'RUNNING':task.run.demoFailure?'FAILED':'SUCCEEDED';if(next!==task.run.status){task.run.status=next;task.run.failureReason=next==='FAILED'?'演示失败：输出字段与目标结构不一致。':null;persist();showRun();}}
runButton.onclick=()=>{if(runButton.disabled)return;task.run={id:'demo-run-'+Date.now(),status:'QUEUED',startedAt:Date.now(),demoFailure:q.get('runDemo')==='failed',failureReason:null};if(persist())showRun();};
showRun();tick();const timer=setInterval(tick,250);addEventListener('pagehide',()=>clearInterval(timer));addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue='';}});
})();
