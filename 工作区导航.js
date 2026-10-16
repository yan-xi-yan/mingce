/* Console navigation; existing resource and authorization modules retain their handlers. */
(() => {
'use strict';
const d=document,b=d.body,q=new URLSearchParams(globalThis.__mingceQuery??location.search);
const page=b.dataset.page||decodeURIComponent(location.pathname.split('/').pop());
const center=/^0[12]-/.test(page),overview=page==='项目概览.html',management=Boolean(b.dataset.permissionView);
if(!center&&!b.dataset.category&&!overview&&!management)return;
const name=q.get('project')||'销售数据工程';
const actorName=d.getElementById('current-user')?.textContent.trim()||'张敏';
let changed=false;
const editable=!center&&!overview&&!management&&b.dataset.list!=='1'&&!/^(07-|11-|25-|26-)/.test(page);
const isEditControl=target=>target.matches('input,select,textarea,[contenteditable]')&&!target.closest('.toolbar,.filter')&&!target.matches('[type="search"],#only-selected')&&!/search|keyword|filter/.test(target.id);
if(editable)d.addEventListener('input',e=>{if(e.isTrusted&&isEditControl(e.target))changed=true;});
if(editable)d.addEventListener('change',e=>{if(e.isTrusted&&isEditControl(e.target))changed=true;});
const canLeave=()=>!changed||confirm('当前页面有未保存的修改，离开后这些修改将丢失。是否继续？');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function read(key,fallback){try{return JSON.parse(sessionStorage.getItem(key))??fallback;}catch{return fallback;}}
function save(key,value){try{sessionStorage.setItem(key,JSON.stringify(value));}catch{}}
const projects=[{name:'销售数据工程',empty:false},{name:'供应链分析',empty:true}];
try{const stored=JSON.parse(localStorage.getItem('mingce-project-index-v1')||'[]');if(Array.isArray(stored))for(const p of stored)if(typeof p.name==='string'&&!projects.some(x=>x.name===p.name))projects.push({name:p.name,empty:true});}catch{}
if(!projects.some(p=>p.name===name))projects.push({name,empty:q.get('empty')==='1'});
const path=(file,context=true)=>{const u=new URL(file,location.href);if(context){u.searchParams.set('project',name);for(const k of ['empty','as','projectId'])if(q.has(k)&&!u.searchParams.has(k))u.searchParams.set(k,q.get(k));}return decodeURIComponent(u.pathname.split('/').pop())+u.search+u.hash;};
const switchProject=(file,value)=>{if(!canLeave()){const select=d.querySelector('[aria-label="切换项目"]');if(select)select.value=name;return;}const p=projects.find(x=>x.name===value),u=new URL(file,location.href);u.searchParams.set('project',value);if(p?.empty)u.searchParams.set('empty','1');if(q.has('as'))u.searchParams.set('as',q.get('as'));location.href=decodeURIComponent(u.pathname.split('/').pop())+u.search;};
const icons={grid:'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z',folder:'M3 7V5h6l2 2h10v13H3z',database:'M20 6c0 2-16 2-16 0s16-2 16 0v12c0 3-16 3-16 0V6M4 12c0 3 16 3 16 0',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',table:'M3 4h18v16H3zM3 9h18M9 9v11',flow:'M4 3h6v6H4zM14 15h6v6h-6zM7 9v9h7',code:'m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',clock:'M12 8v5l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',file:'M5 3h9l5 5v13H5zM14 3v6h5M8 13h8m-8 4h6',shield:'m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5zM9 11l2 2 4-5',users:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-3c0-6 14-6 14 0v3m1-16c5 0 5 7 0 7m2 3c3 1 3 4 3 6',menu:'M4 6h16M4 12h16M4 18h16',search:'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',chevron:'m9 5 7 7-7 7'};
const icon=key=>`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[key]||icons.folder}"/></svg>`;
const modules=[
 {group:'数据接入',label:'数据连接',file:'04-数据连接列表.html',create:'补充-选择连接源.html',verb:'新建连接',icon:'database',description:'管理数据库连接与访问配置'},
 {group:'数据接入',label:'采集任务',file:'06-采集任务列表.html',create:'07-选择连接.html',verb:'新建采集任务',icon:'download',description:'从数据源采集数据，输出到数据集'},
 {group:'数据开发',label:'数据集',file:'补充-数据集列表.html',create:'13-新建数据集-文件上传.html',verb:'导入文件',icon:'table',description:'查看原始数据、加工结果、字段与血缘'},
 {group:'数据开发',label:'转换流程',file:'15-转换流程列表.html',icon:'flow',description:'管理数据加工流程'},
 {group:'数据开发',label:'代码任务',file:'16-代码任务列表.html',create:'17-创建并绑定数据.html',verb:'新建代码任务',icon:'code',description:'绑定输入输出数据，配置与发布代码'},
 {group:'运行管理',label:'调度计划',file:'21-调度计划列表.html',create:'22-选择执行任务.html',verb:'新建调度计划',icon:'clock',description:'设置任务触发规则与启停计划'},
 {group:'项目资料',label:'说明文档',file:'补充-说明文档列表.html',icon:'file',description:'查看项目说明与数据口径'}
];
const activeModule=modules.find(m=>m.label===b.dataset.category);
b.classList.add('mc-app');if(center)b.classList.add('mc-center');if(management)b.classList.add('mc-access');
let collapsed=read('mingce-console-nav-collapsed',false)===true;b.classList.toggle('mc-collapsed',collapsed);
const main=d.querySelector('main');if(!main)return;main.classList.add('mc-main');
const top=d.querySelector('.top')||d.createElement('header');if(!top.parentNode)b.prepend(top);top.classList.add('mc-top');
const projectOptions=projects.map(p=>`<option ${p.name===name?'selected':''}>${esc(p.name)}</option>`).join('');
top.innerHTML=`<div class="mc-top-left"><button type="button" class="mc-icon-button mc-menu-toggle" aria-label="${collapsed?'展开导航':'收起导航'}" aria-expanded="${!collapsed}">${icon('menu')}</button><a href="01-项目列表.html" class="mc-brand"><span class="mc-logomark">M</span>明策</a><a class="mc-console-home ${center?'is-active':''}" href="01-项目列表.html">工作台</a>${!center&&!management?`<span class="mc-header-divider"></span><label class="mc-project-select">项目<select aria-label="切换项目">${projectOptions}</select></label>`:''}</div><div class="mc-top-right"><a href="${path('组织与角色.html',!center)}" class="mc-access-entry ${management?'is-active':''}">${icon('shield')}访问管理</a><span class="mc-header-divider"></span><details class="mc-account"><summary><span class="mc-avatar">张</span><span id="current-user">张敏</span><span class="mc-down">⌄</span></summary><div class="mc-dropdown"><div class="mc-dropdown-label">华东数据中心 / 数据研发部</div><a id="org-entry" href="${path('组织与角色.html',!center)}">组织成员与权限</a><a href="${path('项目成员与权限.html',!center)}">项目授权</a><span class="mc-dropdown-note">当前为本地交互演示</span></div></details></div>`;
top.querySelector('#current-user').textContent=actorName;
top.querySelector('.mc-avatar').textContent=actorName.slice(0,1);
top.querySelector('.mc-project-select select')?.addEventListener('change',e=>switchProject('项目概览.html',e.target.value));
top.querySelector('.mc-menu-toggle').onclick=()=>{collapsed=!collapsed;b.classList.toggle('mc-collapsed',collapsed);save('mingce-console-nav-collapsed',collapsed);const button=top.querySelector('.mc-menu-toggle');button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',collapsed?'展开导航':'收起导航');};
const navLink=(label,file,key,active,context=true)=>`<a href="${path(file,context)}" title="${label}" ${active?'aria-current="page"':''}>${icon(key)}<span>${label}</span></a>`;
const rail=d.createElement('nav');rail.className='mc-rail';rail.setAttribute('aria-label',management?'访问管理导航':center?'平台导航':'项目工作区导航');
rail.innerHTML=management?`<div class="mc-rail-heading">访问管理</div>${navLink('组织成员','组织与角色.html','users',b.dataset.permissionView==='organization')}${navLink('项目授权','项目成员与权限.html','shield',b.dataset.permissionView==='members')}${navLink('权限效果预览','权限效果预览.html','file',b.dataset.permissionView==='preview')}<div class="mc-rail-bottom">${navLink('返回工作台','01-项目列表.html','grid',false,false)}</div>`:center?`<div class="mc-rail-heading">工作台</div>${navLink('项目管理','01-项目列表.html','folder',true,false)}<div class="mc-rail-separator"></div>${navLink('访问管理','组织与角色.html','shield',false,false)}`:`<div class="mc-rail-heading">项目工作区</div>${navLink('项目总览','项目概览.html','grid',overview)}${modules.map((m,i)=>`${i===0||m.group!==modules[i-1].group?`<div class="mc-nav-label">${m.group}</div>`:''}${navLink(m.label,m.file,m.icon,!overview&&activeModule===m)}`).join('')}<div class="mc-rail-bottom">${navLink('所有项目','01-项目列表.html','folder',false,false)}</div>`;
b.prepend(rail);
d.querySelectorAll('body > aside,body > .sidebar,.project-header,.workspace > .tree').forEach(n=>n.hidden=true);
d.querySelectorAll('.breadcrumbs a[data-project-name]').forEach(a=>a.href=path('项目概览.html'));
if(management){
 const titles={organization:['组织成员','管理组织成员与项目创建权限。'],members:['项目授权','按项目管理成员与角色，授权范围沿用现有规则。'],preview:['权限效果预览','检查不同角色访问项目资源时的表现。']};
 const [title,description]=titles[b.dataset.permissionView];
 const heading=d.createElement('section');heading.className='mc-access-heading';heading.innerHTML=`<div class="mc-access-breadcrumb">访问管理 / ${title}</div><h1>${title}</h1><p>${description}</p>${b.dataset.permissionView!=='organization'?`<label class="mc-scope-select">授权项目<select aria-label="授权项目">${projectOptions}</select></label>`:''}`;main.prepend(heading);
 heading.querySelector('select')?.addEventListener('change',e=>switchProject(page,e.target.value));
 // Existing permission module re-renders #page-shell; leave its state nodes intact.
}
if(center){
 main.querySelectorAll('tbody tr').forEach(row=>{const title=row.cells[0]?.textContent.trim();row.querySelectorAll('a').forEach(a=>{const u=new URL('项目概览.html',location.href);u.searchParams.set('project',title);if(title==='供应链分析'||row.dataset.localProject)u.searchParams.set('empty','1');a.href=decodeURIComponent(u.pathname.split('/').pop())+u.search;});});
 main.querySelector('h1')?.replaceChildren('项目管理');
 main.querySelectorAll('.unavailable').forEach(n=>n.hidden=true);
 const heading=main.querySelector('.heading');if(heading){const p=d.createElement('p');p.className='mc-page-description';p.textContent='选择项目进入工作区，或创建新项目。';heading.querySelector('h1')?.after(p);}
 const search=main.querySelector('input[placeholder="搜索项目名称"]');search?.addEventListener('input',()=>search.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'})));
 const table=main.querySelector('table');if(table){const empty=d.createElement('p');empty.className='mc-search-empty';empty.textContent='没有匹配的项目，请调整筛选条件。';empty.hidden=true;table.after(empty);const update=()=>{const count=[...table.querySelectorAll('tbody tr')].filter(r=>!r.hidden).length;empty.hidden=count!==0;const pager=main.querySelector('.pager');if(pager)pager.textContent=`共 ${count} 个项目`;};new MutationObserver(update).observe(table,{subtree:true,attributes:true,attributeFilter:['hidden']});update();}
}
if(page==='02-创建项目.html'){
 const modal=d.querySelector('.modal');modal?.setAttribute('role','dialog');modal?.setAttribute('aria-modal','true');modal?.setAttribute('aria-label','创建项目');
 const input=d.getElementById('new-project-name');if(input){input.value='';input.placeholder='请输入项目名称';input.focus();}
 const description=d.getElementById('new-project-description');if(description){description.value='';description.placeholder='简要说明项目用途（选填）';}
 d.addEventListener('keydown',e=>{if(e.key==='Escape')location.href='01-项目列表.html';});
 modal?.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const fields=[...modal.querySelectorAll('input,textarea,button,select,a[href]')].filter(n=>!n.disabled&&n.offsetParent!==null);const first=fields[0],last=fields.at(-1);if(e.shiftKey&&d.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&d.activeElement===last){e.preventDefault();first?.focus();}});
}
if(!center&&!management){
 b.classList.add('mc-workspace');
 const content=main.querySelector('.content'),heading=content?.querySelector('.section-title');
 if(heading&&activeModule){const p=d.createElement('p');p.className='mc-page-description';p.textContent=activeModule.description;heading.after(p);}
 const row=main.querySelector('.location-row');if(row&&b.dataset.list==='1')row.hidden=true;
}
// Work tabs remember routes, not form state. Each project has an independent tab set.
const tabKey='mingce-console-tabs-v2:'+name,visitKey='mingce-console-recent-v2:'+name;
const home={key:'overview',label:'项目总览',href:path('项目概览.html')};
const validEntry=x=>x&&typeof x.key==='string'&&typeof x.label==='string'&&typeof x.href==='string'&&x.href.split(/[?#]/)[0].endsWith('.html')&&!/^草稿-/.test(x.href)&&!/草稿/.test(x.label)&&!/[\\/:]/.test(x.href.split(/[?#]/)[0]);
let tabs=read(tabKey,[]);tabs=Array.isArray(tabs)?tabs.filter(validEntry):[];
let recent=read(visitKey,[]);recent=Array.isArray(recent)?recent.filter(validEntry):[];
if(!center&&!management){
 const isList=b.dataset.list==='1';
 const current=overview?home:{key:isList?'list:'+activeModule?.label:'detail:'+(activeModule?.label||'resource')+':'+(q.get('taskId')||q.get('connection')||q.get('name')||'editing'),label:isList?activeModule?.label||d.title:d.querySelector('h1')?.textContent.trim()||d.title,href:page+location.search+location.hash};
 if(!tabs.some(t=>t.key===home.key))tabs.unshift(home);
 const existing=tabs.findIndex(t=>t.key===current.key);if(existing>=0)tabs[existing]=current;else tabs.push(current);save(tabKey,tabs);
 if(!overview){recent=[{...current,at:Date.now()},...recent.filter(t=>t.key!==current.key)].slice(0,12);save(visitKey,recent);}
 const tabbar=d.createElement('div');tabbar.className='mc-worktabs';tabbar.setAttribute('aria-label','已打开的工作页面');top.after(tabbar);
 let dragging=null;
 const renderTabs=()=>{
  tabbar.innerHTML=`<nav class="mc-tab-scroll" aria-label="工作标签">${tabs.map(t=>`<div class="mc-worktab ${t.key===current.key?'is-active':''}" draggable="true" data-key="${esc(t.key)}"><a href="${esc(t.href)}" ${t.key===current.key?'aria-current="page"':''} title="${esc(t.label)}；按 Alt + 左右方向键调整顺序">${esc(t.label)}</a>${t.key!=='overview'?`<button type="button" aria-label="关闭${esc(t.label)}" title="关闭标签">×</button>`:''}</div>`).join('')}</nav><details class="mc-tab-menu"><summary aria-label="工作标签菜单" title="标签菜单">⌄</summary><div class="mc-dropdown"><button type="button" data-action="close-others">关闭其他标签</button><button type="button" data-action="reset">按名称排序</button><span class="mc-dropdown-note">拖动标签可调整顺序<br>键盘：Alt + ← / →</span></div></details>`;
  tabbar.querySelectorAll('.mc-worktab').forEach(el=>{
   const key=el.dataset.key;
   el.querySelector('button')?.addEventListener('click',()=>{if(key===current.key&&!canLeave())return;const at=tabs.findIndex(t=>t.key===key);tabs=tabs.filter(t=>t.key!==key);save(tabKey,tabs);if(key===current.key)location.href=(tabs[Math.max(0,at-1)]||home).href;else renderTabs();});
   el.addEventListener('dragstart',e=>{dragging=key;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',key);});
   el.addEventListener('dragover',e=>{if(dragging){e.preventDefault();e.dataTransfer.dropEffect='move';}});
   el.addEventListener('drop',e=>{e.preventDefault();const from=tabs.findIndex(t=>t.key===dragging),to=tabs.findIndex(t=>t.key===key);if(from<0||to<0)return;tabs.splice(to,0,tabs.splice(from,1)[0]);save(tabKey,tabs);dragging=null;renderTabs();});
   el.addEventListener('dragend',()=>dragging=null);
   el.querySelector('a').addEventListener('keydown',e=>{if(!e.altKey||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const from=tabs.findIndex(t=>t.key===key),to=from+(e.key==='ArrowLeft'?-1:1);if(to<0||to>=tabs.length)return;tabs.splice(to,0,tabs.splice(from,1)[0]);save(tabKey,tabs);renderTabs();[...tabbar.querySelectorAll('.mc-worktab')].find(t=>t.dataset.key===key)?.querySelector('a').focus();});
  });
  tabbar.querySelector('[data-action="close-others"]').onclick=()=>{tabs=current.key==='overview'?[home]:[home,current];save(tabKey,tabs);renderTabs();};
  tabbar.querySelector('[data-action="reset"]').onclick=()=>{tabs.sort((a,b)=>a.key==='overview'?-1:b.key==='overview'?1:a.label.localeCompare(b.label,'zh-CN'));save(tabKey,tabs);renderTabs();};
  tabbar.querySelector('.is-active')?.scrollIntoView({block:'nearest',inline:'nearest'});
 };
 renderTabs();
}
if(overview){
 const empty=q.get('empty')==='1';d.title=name+' · 项目总览 · 明策';
 main.innerHTML=`<div class="mc-project-heading"><div><h1>${esc(name)}</h1><p>${empty?'可以连接数据库，也可以直接导入文件。':'管理项目数据与开发任务。'}</p></div><details class="mc-create-menu"><summary class="button primary">新建资源<span>⌄</span></summary><div class="mc-dropdown">${modules.filter(m=>m.create).map(m=>`<a href="${path(m.create)}">${icon(m.icon)}${m.verb}</a>`).join('')}<a href="${path('14-新建数据集-表格录入.html')}">${icon('table')}表格录入</a></div></details></div><div class="mc-overview-layout"><section class="mc-surface mc-directory"><div class="mc-surface-title"><h2>项目资源</h2><span>按类型查看</span></div><div class="mc-directory-toolbar"><label class="mc-search">${icon('search')}<input type="search" aria-label="搜索资源类型" placeholder="搜索资源类型"></label><span>共 ${modules.length} 类资源</span></div><div class="mc-table-scroll"><table><thead><tr><th>资源类型</th><th>说明</th><th>操作</th></tr></thead><tbody>${modules.map(m=>`<tr data-resource="${m.label}"><td><a class="mc-resource-name" href="${path(m.file)}">${icon(m.icon)}${m.label}</a></td><td>${m.description}</td><td><a href="${path(m.file)}">查看</a>${m.create?`<a href="${path(m.create)}">${m.verb}</a>`:''}</td></tr>`).join('')}</tbody></table></div><div class="mc-search-empty" hidden>没有匹配的资源类型</div></section><aside class="mc-overview-side"><section class="mc-surface"><div class="mc-surface-title"><h2>最近访问</h2>${recent.length?'<button type="button" class="mc-text-button" id="mc-clear-recent">清空</button>':''}</div><div id="mc-recent-list">${recent.length?recent.slice(0,6).map(t=>`<a class="mc-recent-item" href="${esc(t.href)}">${icon('file')}<span>${esc(t.label)}</span>${icon('chevron')}</a>`).join(''):'<div class="mc-recent-empty">暂无访问记录<span>打开的工作页面会显示在这里</span></div>'}</div></section><section class="mc-surface mc-start-panel"><div class="mc-surface-title"><h2>数据接入</h2></div><p>从数据库持续采集，或导入本地文件。</p><a href="${path('补充-选择连接源.html')}">${icon('database')}连接数据库<span>→</span></a><a href="${path('13-新建数据集-文件上传.html')}">${icon('download')}导入文件<span>→</span></a><details class="mc-help"><summary>连接、任务、数据集有什么区别？</summary><p>连接保存数据源的访问配置；采集任务定义读取范围和规则；数据集用于查看采集或加工的结果。调度计划负责触发已发布的任务。</p></details></section></aside></div>`;
 const input=main.querySelector('input[type=search]');input.oninput=()=>{let count=0;main.querySelectorAll('[data-resource]').forEach(row=>{row.hidden=!row.textContent.includes(input.value.trim());if(!row.hidden)count++;});main.querySelector('.mc-directory .mc-search-empty').hidden=count>0;main.querySelector('.mc-directory-toolbar>span').textContent=`共 ${count} 类资源`;};
 main.querySelector('#mc-clear-recent')?.addEventListener('click',e=>{save(visitKey,[]);main.querySelector('#mc-recent-list').innerHTML='<div class="mc-recent-empty">暂无访问记录<span>打开的工作页面会显示在这里</span></div>';e.target.remove();});
}
d.addEventListener('click',e=>d.querySelectorAll('.mc-top details[open],.mc-create-menu[open],.mc-tab-menu[open]').forEach(el=>{if(!el.contains(e.target))el.open=false;}));
d.addEventListener('click',e=>{const a=e.target.closest('.mc-rail a,.mc-worktabs a,.mc-top a');if(a&&!canLeave()){e.preventDefault();e.stopImmediatePropagation();}},true);
d.addEventListener('keydown',e=>{if(e.key==='Escape')d.querySelectorAll('.mc-top details[open],.mc-create-menu[open],.mc-tab-menu[open]').forEach(el=>{el.open=false;el.querySelector('summary')?.focus();});});
})();
