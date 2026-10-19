(() => {
'use strict';
const d=document, page=d.body.dataset.page, q=new URLSearchParams(location.search), $=id=>d.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LIST='06-采集任务列表.html', CONFIG='11-任务配置.html', RUNS='采集任务-运行记录.html';
const project=q.get('project')||'销售数据工程';
const tasks=[{id:'ingest-orders',name:'订单持续采集',table:'orders',status:'STOPPED'},{id:'ingest-customers',name:'客户变更采集',table:'customers',status:'RUNNING'},{id:'ingest-archive',name:'订单归档采集',table:'orders',status:'FAILED'},{id:'ingest-refunds',name:'退款记录采集',table:'refunds',status:'NOT_RUN'}];
const labels={RUNNING:'运行中',STOPPING:'停止中',STOPPED:'已停止',FAILED:'失败',PARTIAL_FAILED:'部分失败'};
const phases={CHECK:'启动检查',INITIALIZING:'完整初始化',SYNCING:'同步变更'};
const who={zhang:'张敏',li:'李明',wang:'王琳',chen:'陈杰'};
let selected;try{selected=JSON.parse(sessionStorage.getItem('mingce.ingest.'+q.get('selectionId')));}catch{}
const name=selected?.name||q.get('name')||tasks.find(t=>t.id===q.get('taskId'))?.name||$('task-title')?.textContent||'客户变更采集';
const known=tasks.find(t=>q.has('taskId')?t.id===q.get('taskId'):t.name===name);
const taskId=q.get('taskId')||known?.id||q.get('selectionId')||name;
const storageKey='mingce-run-demo-v1:'+JSON.stringify([q.get('projectId')||project,taskId]);
const tag=status=>'<span class="run-tag '+status+'">'+esc(labels[status]||status)+'</span>';
const format=t=>t?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(t)):'—';
function route(file,extra={}){const p=new URLSearchParams(q);p.delete('runId');p.delete('demo');p.set('project',project);if(file===LIST){['name','taskId','selectionId','table','mode','existing'].forEach(k=>p.delete(k));}else{p.set('name',name);p.set('taskId',taskId);p.set('mode',selected?.mode||q.get('mode')||'continuous');p.set('existing','1');}Object.entries(extra).forEach(([k,v])=>v==null?p.delete(k):p.set(k,v));return file+'?'+p;}
function permission(){let state;try{state=JSON.parse(localStorage.getItem('mingce-permissions-v1:'+(q.get('projectId')||project)));}catch{}const actor=q.get('as')||'zhang';const role=state?.members?.find(m=>m.id===actor)?.role||(!state?({zhang:'owner',li:'admin',wang:'developer',chen:'viewer'})[actor]:null);return {read:!!role,write:!!role&&role!=='viewer'&&!state?.archived&&q.get('archived')!=='1'};}
function currentObjects(){const tables=selected?.selected||[q.get('table')||known?.table||'customers'];return tables.map(t=>({table:'sales.'+t,output:selected?.outputs?.[t]||t+'_raw'}));}
function seed(){if(!known||known.status==='NOT_RUN'||q.get('empty')==='1'||q.get('demo')==='empty'||project!=='销售数据工程')return [];
 const list=[['2026-10-16T08:00:00+08:00',known.status,'MANUAL','SYNCING'],['2026-10-15T08:00:00+08:00','STOPPED','MANUAL','SYNCING'],['2026-10-14T08:00:00+08:00','FAILED','MANUAL','CHECK'],['2026-10-13T08:00:00+08:00','PARTIAL_FAILED','SCHEDULE','INITIALIZING'],['2026-10-12T08:00:00+08:00','STOPPED','SCHEDULE','SYNCING'],['2026-10-11T08:00:00+08:00','FAILED','MANUAL','CHECK']];
 return list.map(([start,status,trigger,phase],i)=>{if(status==='FAILED')phase='CHECK';const objects=currentObjects();if(status==='PARTIAL_FAILED'&&objects.length===1)objects.push({table:'sales.customer_contacts',output:'customer_contacts_raw'});
 return {id:'RUN-'+start.slice(0,10).replaceAll('-','')+'-'+(106-i),status,trigger,actor:trigger==='MANUAL'?'张敏':'客户数据同步',start,end:status==='RUNNING'?null:new Date(Date.parse(start)+(status==='FAILED'?18:status==='PARTIAL_FAILED'?180:7200)*1000).toISOString(),phase,configRevision:'ingestion-r'+(i<2?3:2),objects:objects.map((o,j)=>({...o,state:status==='FAILED'?'未开始':status==='PARTIAL_FAILED'&&j===1?'失败':status==='RUNNING'?'同步中':status==='STOPPED'?'已停止':'初始化完成',version:status==='FAILED'||status==='PARTIAL_FAILED'&&j===1?null:12-i,rows:status==='FAILED'||status==='PARTIAL_FAILED'&&j===1?null:12846-i*80,publishedAt:status==='FAILED'||status==='PARTIAL_FAILED'&&j===1?null:new Date(Date.parse(start)+120000).toISOString()})),reason:status==='FAILED'?'源端账号缺少日志读取权限，启动检查未通过。':status==='PARTIAL_FAILED'?'sales.customer_contacts 的字段结构已变化，本次采集已终止。':'',stopBy:status==='STOPPED'?'张敏':null};});
}
let runs;try{runs=JSON.parse(sessionStorage.getItem(storageKey));}catch{}if(!Array.isArray(runs))runs=seed();
function save(next){try{sessionStorage.setItem(storageKey,JSON.stringify(next));runs=next;return true;}catch{notify('无法保存演示状态，请检查浏览器存储权限后重试。');return false;}}
let toastTimer;function notify(text){let el=$('run-toast');if(!el){el=d.createElement('div');el.id='run-toast';el.className='run-toast';el.setAttribute('role','status');d.body.append(el);}el.textContent=text;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4500);}
const active=()=>runs.find(r=>['RUNNING','STOPPING'].includes(r.status));
const supported=()=>(selected?.mode||q.get('mode')||'continuous')==='continuous'&&q.get('source')!=='file';
function reloadRuns(){try{const saved=JSON.parse(sessionStorage.getItem(storageKey));if(Array.isArray(saved))runs=saved;}catch{}}
function startRun(){
 reloadRuns();
 if(!permission().write||!supported()||active())return null;
 const r={id:'RUN-DEMO-'+Date.now().toString(36).toUpperCase(),status:'RUNNING',trigger:'MANUAL',actor:who[q.get('as')||'zhang']||'当前用户',start:new Date().toISOString(),end:null,phase:'CHECK',demoStarted:true,objects:currentObjects().map(o=>({...o,state:'未开始',version:null,rows:null,publishedAt:null})),reason:''};
 return save([r,...runs])?r:null;
}

function duration(r){let seconds=Math.max(0,Math.floor(((r.end?Date.parse(r.end):Math.max(Date.now(),Date.parse(r.start)))-Date.parse(r.start))/1000));const days=Math.floor(seconds/86400);seconds%=86400;const hours=Math.floor(seconds/3600),mins=Math.floor(seconds%3600/60);return (days?days+' 天 ':'')+(hours?hours+' 小时 ':'')+(mins?mins+' 分 ':(!days&&!hours?seconds+' 秒':''));}
// Wire the list without changing its shared search implementation.
if(page===LIST){
 [...d.querySelectorAll('.content tbody tr')].forEach((row,i)=>{const t=tasks[i];if(!t)return;row.querySelectorAll('a[href^="11-"]').forEach(a=>{const p=new URLSearchParams(q);Object.entries({project,name:t.name,taskId:t.id,table:t.table,mode:'continuous',existing:'1'}).forEach(([k,v])=>p.set(k,v));a.href=CONFIG+'?'+p;});const cell=row.cells[row.cells.length-1];cell.querySelectorAll('span').forEach(n=>{if(n.textContent.trim()==='运行记录')n.remove();});const link=d.createElement('a');link.className='action';link.textContent='运行记录';const p=new URLSearchParams(q);Object.entries({project,name:t.name,taskId:t.id,table:t.table,mode:'continuous',existing:'1'}).forEach(([k,v])=>p.set(k,v));link.href=RUNS+'?'+p;cell.append(link);
 let saved;try{saved=JSON.parse(sessionStorage.getItem('mingce-run-demo-v1:'+JSON.stringify([q.get('projectId')||project,t.id])));}catch{}if(saved?.length){const r=saved[0];row.cells[4].innerHTML=tag(r.status)+'<div class="small">'+esc(format(r.end||r.start).slice(5,16))+'</div>';}
 });return;
}
if(page===CONFIG){
 const tabs=d.querySelector('.detail-tabs');if(tabs)tabs.innerHTML='<span class="active" aria-current="page">任务配置</span><a href="'+esc(route(RUNS))+'">运行记录</a>';
 for(const el of [$('task-title'),$('name-value'),d.querySelector('.location-current')])if(el)el.textContent=name;
 d.querySelector('.lifecycle')?.remove();const badge=$('task-title')?.parentElement.querySelector('.status');if(badge){badge.textContent='配置状态：已保存';badge.dataset.configStatus='READY';badge.className='status blue';}
 const note=d.querySelector('.note-ok');if(note)note.textContent='配置已保存 · 可查看运行记录或启动采集';
 const hint=d.querySelector('.taskhint');if(hint)hint.textContent='';const btn=d.querySelector('button.collect');
 function refreshAction(){
  reloadRuns();advance();if(!btn)return;
  const cap=permission(),live=active();btn.textContent=live?'查看本次运行':'启动采集';
  btn.disabled=live?!cap.read:!cap.write||!supported();
  btn.title=live?(cap.read?'查看当前运行详情':'当前用户无权查看任务'):!supported()?'该采集方式暂未开放':!cap.write?'当前角色或项目状态不允许启动采集':'启动采集演示';
 }
 let navigating=false;
 if(btn)btn.onclick=()=>{
  if(navigating)return;refreshAction();if(btn.disabled)return;
  const live=active();if(live){navigating=true;location.href=route(RUNS,{runId:live.id});return;}
  const r=startRun();if(r){navigating=true;refreshAction();location.href=route(RUNS,{runId:r.id});}
 };
 let timer;function resume(){navigating=false;clearInterval(timer);refreshAction();timer=setInterval(refreshAction,800);}
 resume();window.addEventListener('pageshow',resume);window.addEventListener('focus',refreshAction);window.addEventListener('pagehide',()=>{clearInterval(timer);clearTimeout(toastTimer);});
 return;
}
if(page!==RUNS)return;
$('run-task-name').textContent=name;d.title=name+' · 运行记录';d.querySelectorAll('[data-project-name]').forEach(el=>el.textContent=project);
d.querySelectorAll('[data-route]').forEach(el=>el.href=route({list:LIST,config:CONFIG,runs:RUNS}[el.dataset.route]));
if(!permission().read){d.querySelector('.run-body').innerHTML='<div class="run-empty"><strong>无权查看此任务</strong></div>';$('start-run').disabled=true;return;}
let number=1, applied={keyword:'',status:'',trigger:'',from:'',to:''}, detailId=null, pendingStop=null;
function render(){const cap=permission(),live=active(),supported=(selected?.mode||q.get('mode')||'continuous')==='continuous'&&q.get('source')!=='file';$('start-run').disabled=!!live||!cap.write||!supported;$('start-run').title=!supported?'该采集方式暂未开放':!cap.write?'当前角色或项目状态不允许启动采集':live?'该任务已有运行，不能重复启动':'';
 const current=$('current-run');current.hidden=!live;if(live)current.innerHTML='<div><strong>'+tag(live.status)+'　'+esc(live.id)+' · '+esc(phases[live.phase])+'</strong><p>开始于 '+esc(format(live.start))+'（北京时间） · 已运行 '+esc(duration(live))+'</p></div><div class="current-actions"><button class="text-action" data-detail="'+live.id+'">查看本次运行</button><button class="run-button" data-stop="'+live.id+'" '+(!cap.write||live.status==='STOPPING'?'disabled':'')+'>停止采集</button></div>';
 const filtered=runs.filter(r=>(!applied.keyword||r.id.toLowerCase().includes(applied.keyword.toLowerCase()))&&(!applied.status||r.status===applied.status)&&(!applied.trigger||r.trigger===applied.trigger)&&(!applied.from||format(r.start).slice(0,10)>=applied.from)&&(!applied.to||format(r.start).slice(0,10)<=applied.to));number=Math.max(1,Math.min(number,Math.ceil(filtered.length/5)));
 $('run-rows').innerHTML=filtered.slice((number-1)*5,number*5).map(r=>'<tr><td><button class="text-action" data-detail="'+esc(r.id)+'">'+esc(r.id)+'</button></td><td>'+esc(r.trigger==='MANUAL'?'手动启动':'调度触发')+'<small>'+esc(r.actor)+'</small></td><td>'+esc(format(r.start))+'</td><td>'+esc(format(r.end))+'</td><td>'+esc(duration(r))+'</td><td>'+tag(r.status)+'<small>'+esc(phases[r.phase])+'</small></td><td><button class="text-action" data-detail="'+esc(r.id)+'">详情</button>'+(['RUNNING','STOPPING'].includes(r.status)?'<button class="text-action" data-stop="'+esc(r.id)+'" '+(!cap.write||r.status==='STOPPING'?'disabled title="当前不可停止"':'')+'>停止</button>':'')+'</td></tr>').join('');
 $('run-empty').hidden=filtered.length>0;$('run-empty').innerHTML=runs.length?'<strong>没有符合条件的运行记录</strong><p>请调整筛选条件，或点击重置。</p>':'<strong>暂无运行记录</strong><p>启动采集后，可在这里查看运行过程和结果。</p>';
 $('run-count').textContent='共 '+filtered.length+' 条 · 每页 5 条 · 时间为北京时间';$('run-page').textContent=number+' / '+Math.max(1,Math.ceil(filtered.length/5));$('previous-runs').disabled=number<=1;$('next-runs').disabled=number*5>=filtered.length;
 d.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>openDetail(b.dataset.detail));d.querySelectorAll('[data-stop]').forEach(b=>b.onclick=()=>requestStop(b.dataset.stop));if(detailId&&$('run-detail').open)renderDetail();
}
function kv(label,value){return '<div><dt>'+label+'</dt><dd>'+value+'</dd></div>';}
function renderDetail(){const r=runs.find(r=>r.id===detailId);if(!r)return;$('detail-id').textContent=r.id;
 const phaseIndex=['CHECK','INITIALIZING','SYNCING'].indexOf(r.phase);
 const events=[{time:r.start,text:(r.trigger==='MANUAL'?'手动启动':'调度触发')+'，使用本次启动时的配置。'}];
 if(phaseIndex>0)events.push({time:new Date(Date.parse(r.start)+(r.demoStarted?1800:3000)).toISOString(),text:'启动检查通过，开始完整初始化。'});
 if(phaseIndex>1)events.push({time:new Date(Date.parse(r.start)+(r.demoStarted?6000:120000)).toISOString(),text:'完整初始化完成，开始持续接收变更。'});
 if(r.reason)events.push({time:r.end,text:r.reason});if(r.stopRequestedAt)events.push({time:r.stopRequestedAt,text:'已请求停止，等待采集退出。'});if(r.status==='STOPPED')events.push({time:r.end,text:(r.stopBy||'操作人')+' 停止了本次采集。'});
 $('detail-body').innerHTML='<div>'+tag(r.status)+' <span class="demo-label">示例运行</span></div><dl class="run-kv">'+kv('任务',esc(name))+kv('触发方式',esc((r.trigger==='MANUAL'?'手动启动 · ':'调度触发 · ')+r.actor))+kv('执行身份','项目运行身份')+kv('来源连接','订单业务库')+kv('开始时间',esc(format(r.start)))+kv('结束时间',esc(format(r.end)))+kv('持续时长',esc(duration(r)))+kv('采集方式','持续变更采集')+'</dl><h3>运行阶段</h3><div class="phase-track">'+['CHECK','INITIALIZING','SYNCING'].map((p,i)=>'<span class="'+(i<phaseIndex?'done':i===phaseIndex?'active':'')+'">'+(i<phaseIndex?'✓ ':i+1+' · ')+phases[p]+'</span>').join('')+'</div>'+(r.reason?'<div class="run-alert error"><strong>失败原因</strong><br>'+esc(r.reason)+'<br>请检查来源连接及采集配置后重新启动。</div>':r.status==='STOPPED'?'<div class="run-alert">本次采集已停止，已生成的可用数据版本保留。</div>':'')+'<h3>源表与输出</h3><div class="run-table-wrap"><table class="run-table object-table"><thead><tr><th>源表 / 输出数据集</th><th>采集状态</th><th>本次最新数据版本</th><th>版本行数</th></tr></thead><tbody>'+r.objects.map(o=>'<tr><td>'+esc(o.table)+'<small>'+esc(o.output)+'</small></td><td>'+esc(o.state)+'</td><td>'+(o.version?'版本 '+o.version+'<small>'+esc(format(o.publishedAt))+'</small>':'本次未生成')+'</td><td>'+(o.rows==null?'—':o.rows.toLocaleString())+'</td></tr>').join('')+'</tbody></table></div><p class="run-footnote">本次未生成新版本的输出，仍保留此前已有的可用数据。</p><h3>关键事件</h3><ol class="event-list">'+events.map(e=>'<li><time>'+esc(format(e.time))+'</time><span>'+esc(e.text)+'</span></li>').join('')+'</ol>';
 $('detail-stop').hidden=!['RUNNING','STOPPING'].includes(r.status);$('detail-stop').disabled=!permission().write||r.status==='STOPPING';
}
function openDetail(id){if(!runs.some(r=>r.id===id))return notify('未找到该运行记录。');detailId=id;renderDetail();if(!$('run-detail').open)$('run-detail').showModal();const u=new URL(location.href);u.searchParams.set('runId',id);history.replaceState(null,'',u);}
function clearDetailRoute(){detailId=null;const u=new URL(location.href);u.searchParams.delete('runId');history.replaceState(null,'',u);}
function closeDetail(){clearDetailRoute();$('run-detail').close();}
$('close-detail').onclick=closeDetail;$('detail-close-bottom').onclick=closeDetail;$('run-detail').addEventListener('close',()=>{if(!$('run-detail').open)clearDetailRoute();});
function requestStop(id){const r=runs.find(r=>r.id===id);if(!permission().write||r?.status!=='RUNNING')return notify('当前无法停止本次采集。');pendingStop=id;$('stop-confirm').showModal();}
$('cancel-stop').onclick=()=>$('stop-confirm').close();$('detail-stop').onclick=()=>requestStop(detailId);
$('confirm-stop').onclick=()=>{const r=runs.find(r=>r.id===pendingStop);if(!permission().write||r?.status!=='RUNNING'){ $('stop-confirm').close();return notify('运行状态或操作权限已变化，请刷新后重试。');}const next=structuredClone(runs),record=next.find(r=>r.id===pendingStop);record.status='STOPPING';record.stopRequestedAt=new Date().toISOString();record.stopBy=who[q.get('as')||'zhang']||'当前用户';if(!save(next))return;$('stop-confirm').close();render();notify('已请求停止（演示）');};
// Demo transitions persist their timing, so refresh/navigation cannot strand a run in STOPPING.
function advance(){let changed=false;const next=structuredClone(runs);for(const r of next){if(r.status==='STOPPING'&&Date.now()-Date.parse(r.stopRequestedAt)>1600){r.status='STOPPED';r.end=new Date(Date.parse(r.stopRequestedAt)+1600).toISOString();r.objects.forEach(o=>{if(!['失败','未开始'].includes(o.state))o.state='已停止';});changed=true;}if(r.demoStarted&&r.status==='RUNNING'&&r.phase!=='SYNCING'){const elapsed=Date.now()-Date.parse(r.start),phase=elapsed>6000?'SYNCING':elapsed>1800?'INITIALIZING':'CHECK';if(phase!==r.phase){r.phase=phase;r.objects.forEach(o=>{o.state=phase==='SYNCING'?'同步中':'初始化中';if(phase==='SYNCING'){o.version=1;o.rows=12846;o.publishedAt=new Date(Date.parse(r.start)+6000).toISOString();}});changed=true;}}}if(changed&&save(next)&&page===RUNS)render();}
$('start-run').onclick=()=>{const r=startRun();if(r){number=1;render();openDetail(r.id);notify('已启动采集演示，不会连接真实数据源。');}};
$('run-filters').onsubmit=e=>{e.preventDefault();const from=$('run-from').value,to=$('run-to').value;if(from&&to&&from>to){$('filter-error').textContent='开始日期起点不能晚于终点。';$('filter-error').hidden=false;return;}$('filter-error').hidden=true;applied={keyword:$('run-keyword').value.trim(),status:$('run-status').value,trigger:$('run-trigger').value,from,to};number=1;render();};
$('reset-runs').onclick=()=>{$('run-filters').reset();$('filter-error').hidden=true;applied={};number=1;render();};
function refresh(){advance();render();$('refreshed').textContent='更新于 '+format(Date.now()).slice(11);}
$('refresh-runs').onclick=refresh;$('detail-refresh').onclick=refresh;$('previous-runs').onclick=()=>{number--;render();};$('next-runs').onclick=()=>{number++;render();};
advance();render();if(q.has('runId'))openDetail(q.get('runId'));
let interval;function resumeRuns(){clearInterval(interval);reloadRuns();advance();render();interval=setInterval(advance,800);}
resumeRuns();window.addEventListener('pageshow',resumeRuns);window.addEventListener('pagehide',()=>{clearInterval(interval);clearTimeout(toastTimer);});window.addEventListener('storage',resumeRuns);
})();
