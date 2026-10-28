import {connectionDetail,collectionConfiguration,codeConfiguration,scheduleDetail} from './workspace-details.js';
import {resourceLink,resourceKind,resourceView,detailRoute,detailURL,listURL} from './resource-navigation.js';
import {connectionLink} from './connection-link.js';
import {resourceTable,rememberFilters,applyFilters,resetFilters,mountFilterSelects,disposeFilterSelects,syncFilterSelects,filterSnapshot,restoreFilterSnapshot} from './list-filters.js';
import {codeBindingIssue,codeOutputs,codeOutputNames,inputReference} from './code-bindings.js';
import {databaseLabel} from './database-types.js';
import {datasetBody,jobHistory,runBody,tabs,formatTime,statusBadge,duration} from './resource-details.js';
import {downloadCodeTemplate} from './code-template.js';
import {read,write,key,projectKey,initialProjects,connections,tasks,engine} from './domain/store.js';
import {actor,person,users,cap,canCreate,permissions,permissionKey,roleNames,orgState,orgKey,datasets,codes,flows,readPlans,targets,startIngest,stopIngest,runs,download,assertWrite} from './domain/domain.js';
import {executions,publishTask,submitExecution,tickWorkflow,setPlanEnabled} from './domain/execution-runtime.js';
import {escape as e,icon,badge,button,alert,card,table} from './html.js';
import {Editor} from './editors.js';
import {loadPackage} from './code-packages.js';
import {avatarPath,memberIdentity} from './people.js';
import {overviewStats} from './overview-data.js';
import {mountOverviewCharts,disposeOverviewCharts} from './overview-charts.js';
import {mountDatePickers,disposeDatePickers,syncDatePickers,closeDatePickers} from './date-pickers.js';

const modules=[['overview','项目概览','grid-1x2','工作区'],['connections','数据连接','database','数据接入'],['tasks','采集任务','cloud-download','数据接入'],['datasets','数据集','layers','数据开发'],['flows','转换流程','diagram-3','数据开发'],['code','代码任务','code-slash','数据开发'],['plans','调度计划','calendar2-week','运行管理'],['runs','运行记录','activity','运行管理'],['members','成员与权限','people','项目管理'],['documents','项目说明','file-earmark-text','项目管理']];
const create={connections:['新建数据连接','connection'],tasks:['新建采集任务','task'],datasets:['新建数据集','dataset'],code:['新建代码任务','code'],flows:['新建转换流程','flow'],plans:['新建调度计划','plan'],members:['添加成员','member']};
const runLabels={QUEUED:'排队中',RUNNING:'运行中',SUCCEEDED:'成功',SUCCESS:'成功',FAILED:'失败',PARTIAL_FAILED:'部分失败',STOPPING:'停止中',STOPPED:'已停止',CANCELLED:'已取消'};
const $=s=>document.querySelector(s);
let projects=read(projectKey,initialProjects),view=location.hash.slice(1)||'projects',projectName=new URLSearchParams(location.search).get('project')||'',editor=null,inspection=null;
let lastURL=location.href;
let historyIndex=history.state?.workspaceIndex??0,historyRecovery=null;
history.replaceState({...history.state,workspaceIndex:historyIndex},'',location.href);
let memberTab='members',previewMember='',editorReturn=null,modalClosing=false,pendingEditor=null;
const modalElement=$('#workspace-modal'),modal=bootstrap.Modal.getOrCreateInstance(modalElement);
const current=()=>projects.find(p=>p.name===projectName);
const rights=()=>current()?cap(projectName):{};
const action=(label,command,options={})=>button(label,command,{variant:'link',...options});
const actions=html=>`<div class="d-flex align-items-center gap-2 flex-wrap">${html}</div>`;
const detailLink=resourceLink;
const routeLink=(id,label,project=projectName)=>'<a class="breadcrumb-item" href="'+e(listURL(id,project))+'" data-route="'+e(id)+'" '+(project?'data-project="'+e(project)+'"':'')+'>'+e(label)+'</a>';
function notify(message,tone='success',next=''){
 const host=modalElement.classList.contains('show')?$('#modal-feedback'):$('#workspace-message');
 (host||$('#workspace-message')).innerHTML=alert(message,tone)+next;
 if(tone==='danger'&&host){host.tabIndex=-1;host.focus();host.scrollIntoView({block:'nearest'});}
}
function act(fn){try{fn();}catch(error){notify(error.message,'danger');}}
let leavePrompt=null,closingPrompt=null;
function restoreModalContent(saved){
 const content=modalElement.querySelector('.modal-content');content.replaceChildren(...saved.nodes);content.className=saved.contentClass;
 modalElement.querySelector('.modal-dialog').className=saved.dialogClass;
 if(saved.editorKind)modalElement.dataset.editorKind=saved.editorKind;else delete modalElement.dataset.editorKind;
 saved.focus?.focus({preventScroll:true});const body=content.querySelector('.modal-body');if(body)body.scrollTop=saved.bodyScroll;
}
function restoreLeavePrompt(){
 if(!leavePrompt)return null;
 const saved=leavePrompt;leavePrompt=null;
 // Keep a standalone confirmation intact until its closing animation finishes.
 if(saved.wasOpen===false){closingPrompt=saved;modal.hide();}else restoreModalContent(saved);
 return saved;
}
function confirmInModal(title,message,confirmLabel,proceed){
 if(leavePrompt||closingPrompt)return;
 const content=modalElement.querySelector('.modal-content'),dialog=modalElement.querySelector('.modal-dialog');
 leavePrompt={nodes:[...content.childNodes],dialogClass:dialog.className,contentClass:content.className,editorKind:modalElement.dataset.editorKind,bodyScroll:content.querySelector('.modal-body')?.scrollTop||0,focus:document.activeElement,proceed,wasOpen:modalElement.classList.contains('show')};
 content.replaceChildren();if(!leavePrompt.wasOpen){dialog.className='modal-dialog modal-dialog-centered';content.classList.remove('h-100');delete modalElement.dataset.editorKind;}
 content.innerHTML='<div class="modal-header"><h2 class="modal-title fs-5" id="workspace-modal-title">'+e(title)+'</h2><button type="button" class="btn-close" data-leave-choice="keep" aria-label="关闭确认"></button></div><div class="modal-body"><p class="mb-0">'+e(message)+'</p></div><div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-leave-choice="keep">取消</button><button type="button" class="btn btn-danger" data-leave-choice="discard">'+e(confirmLabel)+'</button></div>';
 modal.show();content.querySelector('.modal-footer [data-leave-choice="keep"]').focus();
}
function allowLeave(proceed){
 if(leavePrompt)return false;
 if(!editor?.dirty)return true;
 closeDatePickers(modalElement);
 const content=modalElement.querySelector('.modal-content'),dialog=modalElement.querySelector('.modal-dialog');
 leavePrompt={nodes:[...content.childNodes],dialogClass:dialog.className,contentClass:content.className,editorKind:modalElement.dataset.editorKind,bodyScroll:content.querySelector('.modal-body').scrollTop,focus:document.activeElement,proceed,discardChanges:true};
 // Preserve the actual form DOM, including file inputs, wizard state and listeners.
 content.replaceChildren();
 content.innerHTML='<div class="modal-header"><h2 class="modal-title fs-5" id="workspace-modal-title">放弃未保存的修改？</h2><button type="button" class="btn-close" data-leave-choice="keep" aria-label="关闭确认，继续编辑"></button></div><div class="modal-body d-flex align-items-center justify-content-center"><p class="mb-0">当前填写内容尚未保存。放弃后，本次修改将丢失。</p></div><div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-leave-choice="keep">继续编辑</button><button type="button" class="btn btn-danger" data-leave-choice="discard">放弃修改</button></div>';
 content.querySelector('.modal-footer [data-leave-choice="keep"]').focus();return false;
}
modalElement.addEventListener('click',event=>{
 const choice=event.target.closest('[data-leave-choice]');if(!choice)return;
 const saved=restoreLeavePrompt();if(choice.dataset.leaveChoice==='discard'&&saved){if(saved.discardChanges&&editor)editor.dirty=false;act(saved.proceed);}
});
modalElement.addEventListener('keydown',event=>{if(event.key==='Escape'&&leavePrompt){event.preventDefault();event.stopImmediatePropagation();restoreLeavePrompt();}},true);
function capturePageContext(){
 const active=document.activeElement,host=$('#workspace-content');
 return {detail:detailContext(),filters:filterSnapshot($('[data-resource-filters]')),scroll:window.scrollY,focus:host.contains(active)&&active.id?{id:active.id,start:active.selectionStart,end:active.selectionEnd}:null};
}
function savePageContext(){history.replaceState({...history.state,workspaceContext:capturePageContext()},'',location.href);}
function restorePageContext(context){
 if(!context)return;
 if(context.detail)restoreDetailControls(context.detail);
 window.scrollTo(0,context.scroll||0);
 if(context.focus){const el=document.getElementById(context.focus.id);el?.focus({preventScroll:true});if(context.focus.start!=null&&el?.setSelectionRange)el.setSelectionRange(context.focus.start,context.focus.end);}
}
function navigatePage(url){
 if(!allowLeave(()=>navigatePage(url)))return;
 savePageContext();const title=$('#workspace-heading h1')?.textContent||'列表';
 editorReturn=null;editor?.dispose();editor=null;modal.hide();
 history.pushState({from:title,workspaceIndex:++historyIndex},'',url);view=location.hash.slice(1)||'projects';projectName=new URLSearchParams(location.search).get('project')||'';lastURL=location.href;
 $('#workspace-message').innerHTML='';render();window.scrollTo(0,0);$('#workspace-heading h1')?.focus({preventScroll:true});
}
function go(next,name=projectName){navigatePage(listURL(next,name));}
modalElement.addEventListener('hide.bs.modal',event=>{if(leavePrompt){event.preventDefault();restoreLeavePrompt();return;}if(!allowLeave(()=>modal.hide()))event.preventDefault();else modalClosing=true;});
modalElement.addEventListener('hidden.bs.modal',()=>{if(closingPrompt){restoreModalContent(closingPrompt);closingPrompt=null;}editor?.dispose();editor=null;editorReturn=null;$('#workspace-modal-body').innerHTML='';delete modalElement.dataset.editorKind;modalElement.querySelector('.modal-content').classList.remove('h-100');modalClosing=false;if(pendingEditor){const next=pendingEditor;pendingEditor=null;showEditor(...next);}});
addEventListener('beforeunload',event=>{if(editor?.dirty){event.preventDefault();event.returnValue='';}else savePageContext();});
function onHistory(){
 if(historyRecovery){const delta=historyRecovery.delta;historyRecovery=null;allowLeave(()=>history.go(delta));return;}
 const destination=location.href,destinationState=history.state;
 const delta=destinationState?.workspaceIndex-historyIndex;
 // Restore the current history entry before asking about unsaved edits, so cancelling
 // never overwrites the destination or breaks the next Back/Forward operation.
 if(editor?.dirty&&Number.isInteger(delta)&&delta!==0){historyRecovery={delta};history.go(-delta);return;}
 if(!allowLeave(()=>{history.replaceState(destinationState,'',destination);onHistory();})){history.replaceState(null,'',lastURL);return;}
 editorReturn=null;editor?.dispose();editor=null;modal.hide();
 view=location.hash.slice(1)||'projects';projectName=new URLSearchParams(location.search).get('project')||'';lastURL=location.href;historyIndex=destinationState?.workspaceIndex??historyIndex;
 $('#workspace-message').innerHTML='';restoreFilterSnapshot(destinationState?.workspaceContext?.filters);render();restorePageContext(destinationState?.workspaceContext);
}
addEventListener('popstate',onHistory);
addEventListener('storage',()=>{const context=capturePageContext();projects=read(projectKey,initialProjects);render();restorePageContext(context);});
const sidebarToggle=$('.sidebar-toggle');
function syncSidebarToggle(){const collapsed=document.body.classList.contains('sidebar-collapsed');sidebarToggle.setAttribute('aria-expanded',String(!collapsed));sidebarToggle.title=collapsed?'展开导航':'收起导航';sidebarToggle.setAttribute('aria-label',sidebarToggle.title);}
new MutationObserver(syncSidebarToggle).observe(document.body,{attributes:true,attributeFilter:['class']});syncSidebarToggle();

function navigation(){
 const p=current(),inProject=!!p&&!['projects','organization'].includes(view),link=(id,label,symbol)=>`<li class="nav-item"><a href="${e(listURL(id))}" data-route="${id}" title="${label}" class="nav-link ${view===id?'active':''}" ${view===id?'aria-current="page"':''}>${icon(symbol)}<span>${label}</span></a></li>`;
 $('#workspace-navigation').innerHTML=inProject?(rights().read?['工作区','数据接入','数据开发','运行管理','项目管理'].map(group=>`<div class="nav-heading"><span>${group}</span></div><ul class="nav-menu">${modules.filter(m=>m[3]===group).map(([id,label,symbol])=>link(id,label,symbol)).join('')}</ul>`).join(''):''):`<div class="nav-heading"><span>工作台</span></div><ul class="nav-menu">${link('projects','全部项目','collection')}${link('organization','组织管理','buildings')}</ul>`;
 $('#project-context').hidden=!inProject;
 $('#platform-context').hidden=inProject;
 $('#workspace-context').textContent=inProject?p.name:'明策 · 数据开发与治理';
 document.querySelectorAll('.user-dropdown img').forEach(img=>{img.src=avatarPath(actor());});
 for(const id of ['header-person','account-person'])$('#'+id).textContent=person(actor());
 $('#account-role').textContent=inProject?(roleNames[rights().role]||'无项目权限'):(users.find(u=>u.id===actor())?.orgRole||'组织成员');
 $('#header-role').textContent=$('#account-role').textContent;
 $('#project-menu').innerHTML=`<li><h6 class="dropdown-header">切换项目</h6></li>${projects.filter(x=>cap(x.name).read).map(x=>`<li><a class="dropdown-item ${x.name===projectName?'active':''}" href="?project=${encodeURIComponent(x.name)}#overview" data-route="overview" data-project="${e(x.name)}" ${x.name===projectName?'aria-current="true"':''}>${e(x.name)}</a></li>`).join('')}<li><hr class="dropdown-divider"></li><li><a class="dropdown-item" href="#projects" data-route="projects">${icon('arrow-left')} 返回工作台</a></li>`;
}

function render(){
 disposeOverviewCharts();
 const filterFocus=disposeFilterSelects($('#workspace-content'));
 disposeDatePickers($('#workspace-content'));
 const previousSearch=$('[data-table-search]'),searchState=previousSearch?{view:previousSearch.dataset.view,value:previousSearch.value,focused:document.activeElement===previousSearch,start:previousSearch.selectionStart,end:previousSearch.selectionEnd}:null;
 navigation();const p=current(),c=rights(),title=view==='projects'?'项目工作台':view==='organization'?'组织管理':modules.find(m=>m[0]===view)?.[1]||'工作区';
 const route=detailRoute();if(route&&p){renderResourceDetail(route.kind,route.id,route.options);mountFilterSelects($('#workspace-content'),filterFocus);mountDatePickers($('#workspace-content'));return;}inspection=null;
 document.title=title+' · 明策';
 $('#workspace-breadcrumb').innerHTML=`${p?routeLink('overview',p.name):routeLink('projects','工作台')}<span class="breadcrumb-item active">${e(title)}</span>`;
 const descriptions={projects:'让数据从接入到产出，在一个工作空间内有序流转。',organization:'管理组织成员和项目创建资格。',overview:'从数据接入开始，连接开发任务与自动化运行。',connections:'管理数据源、访问配置和连接测试。',tasks:'选择源表与字段，定义采集规则和输出。',datasets:'检查数据内容、字段结构、版本与来源。',code:'保存任务配置，下载模板开发，上传代码包后运行。',flows:'组织数据加工任务，追踪输入与输出。',plans:'为已发布任务安排时间或上游更新触发。',runs:'追踪每次执行的状态与数据产出。',members:'按项目角色管理成员和下载权限。',documents:'记录项目背景与业务口径。'};
 $('#workspace-heading').innerHTML=`<div><h1 class="page-title">${e(title)}</h1><p class="text-muted mb-0">${e(descriptions[view]||'')}</p></div>${actions(`${view==='projects'?button('创建项目','new',{kind:'project',icon:'plus-lg',disabled:!canCreate()}):p&&c.read&&create[view]?button(create[view][0],'new',{kind:create[view][1],icon:'plus-lg',disabled:view==='members'?!c.manage:!c.write}):''}`)}`;
 const views={overview:overviewPage,connections:connectionsPage,tasks:()=>jobsPage('tasks'),datasets:datasetsPage,code:()=>jobsPage('code'),flows:()=>jobsPage('flows'),plans:plansPage,runs:()=>runPage(),members:membersPage,documents:documentsPage};
 $('#workspace-content').innerHTML=view==='projects'?projectsPage():view==='organization'?organizationPage():!p?card('选择项目','',alert('请先从项目工作台选择一个项目。')):!c.read?alert('无权访问此项目，请联系项目负责人。','warning'):(views[view]?.()||alert('页面不存在，请选择左侧导航。'));
 if(p&&c.read){
  let guidance='';
  if(!c.write)guidance=alert('当前项目为只读访问：可查看资源和运行记录，配置、发布与运行需联系项目负责人。','secondary');
  else if(view==='tasks'&&!connections(p).length)guidance=alert('创建采集任务前，需要先配置数据连接。')+button('前往数据连接','route',{id:'connections',variant:'outline-primary'});
  else if(['code','flows'].includes(view)&&!datasets(p).length)guidance=alert('开发任务需要输入数据集。先运行采集任务，或导入已有数据。')+button('前往数据集','route',{id:'datasets',variant:'outline-primary'});
  else if(view==='plans'&&!targets(p).length)guidance=alert('暂无可调度任务。请先发布批次采集或完成代码任务的代码包配置。')+button('前往采集任务','route',{id:'tasks',variant:'outline-primary'});
  if(guidance)$('#workspace-content').insertAdjacentHTML('afterbegin',`<div class="mb-4">${guidance}</div>`);
 }
 mountFilterSelects($('#workspace-content'),filterFocus);
 mountDatePickers($('#workspace-content'));
 if(view==='overview'&&p&&c.read)mountOverviewCharts(overviewStats(projectRuns(p)));
 const search=$('[data-table-search]');if(search){search.dataset.view=view;if(searchState?.view===view){search.value=searchState.value;search.dispatchEvent(new Event('input',{bubbles:true}));if(searchState.focused){search.focus();search.setSelectionRange(searchState.start,searchState.end);}}}
}
function stat(label,value,symbol,note){return `<div class="card widget-stat"><div class="widget-stat-header"><div><div class="widget-stat-value">${e(value)}</div><div class="widget-stat-label">${e(label)}</div></div><div class="widget-stat-icon primary">${icon(symbol)}</div></div><div class="widget-stat-change neutral">${e(note)}</div></div>`;}
function projectsPage(){
 const rows=projects.filter(p=>cap(p.name).read).map(p=>({...p,organization:p.organization||'数据研发部',role:roleNames[cap(p.name).role],status:permissions(p.name).archived?'已归档':'进行中'}));
 return card('我的项目','选择项目，进入数据工作空间',resourceTable('projects','',[
  {title:'项目名称',render:p=>`<div class="d-flex align-items-center gap-3"><span class="widget-stat-icon primary flex-shrink-0">${icon('folder2-open')}</span><div><a class="btn btn-link p-0 text-start" href="#overview" data-route="overview" data-project="${e(p.name)}">${e(p.name)}</a><small class="d-block text-muted">${e(p.description||'数据开发项目')}</small></div></div>`},
  {key:'organization',title:'所属组织'},
  {title:'我的角色',render:p=>badge(p.role,'light')},
  {title:'资源数量',render:p=>datasets(p).length+' 个数据集'},
  {title:'项目状态',render:p=>badge(p.status,p.status==='已归档'?'secondary':'success')},
  {title:'操作',render:p=>actions(button('进入工作区','enter-project',{id:p.name,variant:'link'}))}
 ],rows,{empty:'还没有可访问的项目，点击右上角创建项目。'}));
}
function projectRuns(p){return [...executions(p),...tasks(p).filter(t=>t.mode==='continuous').flatMap(t=>runs(p.name,t.id).map(r=>({...r,taskId:t.id,name:t.name,type:'continuous'})))].sort((a,b)=>new Date(b.start||0)-new Date(a.start||0));}
function overviewPage(){
 const p=current(),rows=projectRuns(p),stats=overviewStats(rows),active=rows.filter(r=>['QUEUED','RUNNING','STOPPING'].includes(r.status)).length;
 const empty='<div class="empty-state"><div class="empty-state-icon">'+icon('bar-chart')+'</div><p class="empty-state-text">近 7 天暂无运行记录</p><p class="text-muted small">任务运行后，这里会显示实际统计。</p></div>';
 const legend='<div class="chart-legend mt-3">'+stats.groups.map(g=>'<div class="chart-legend-item"><span class="chart-legend-color" style="background-color: var('+g.color+');"></span><span class="legend-label">'+g.label+'</span><span class="legend-value">'+g.count+'</span></div>').join('')+'</div>';
 let guidance='';
 if(!rows.length){
  const next=!connections(p).length?['先接入业务数据，创建连接并配置采集。','新建数据连接','new',{kind:'connection',disabled:!rights().write}]:!datasets(p).length?['连接已就绪，配置并运行采集任务以生成数据集。','前往采集任务','route',{id:'tasks'}]:['已有数据集，可绑定输入数据并创建代码任务。','前往代码任务','route',{id:'code'}];
  guidance='<div class="alert alert-info d-flex align-items-center justify-content-between gap-3" role="status"><span>'+next[0]+'</span>'+button(next[1],next[2],{...next[3],variant:'outline-primary'})+'</div>';
 }
 return '<div class="dashboard-grid dashboard-grid-4">'+stat('数据集',datasets(p).length,'layers','当前项目数据资产')+stat('运行中任务',active,'activity','包含排队与停止中的执行')+stat('近 7 天失败运行',stats.groups.find(g=>g.key==='failed').count,'exclamation-triangle','包含部分失败')+stat('已启用计划',readPlans(p).filter(r=>r.enabled).length,'calendar2-check','定时与上游更新触发')+'</div>'+guidance+
 '<div class="row g-4 mb-4"><div class="col-12 col-xl-8"><div class="card h-100"><div class="card-header d-flex justify-content-between align-items-center"><h5 class="card-title mb-0">运行趋势</h5><span class="text-muted small">最近 7 天 · 北京时间</span></div><div class="card-body"><p class="text-muted small">按提交日期统计运行次数，状态随执行结果更新。</p>'+(stats.total?'<div id="projectProgressChart" style="height: 320px;" role="img" aria-label="最近七天运行次数，按成功、失败、运行中等状态分组"></div>':empty)+'</div></div></div><div class="col-12 col-xl-4"><div class="card h-100"><div class="card-header"><h5 class="card-title mb-0">运行状态分布</h5></div><div class="card-body"><p class="text-muted small">最近 7 天提交的运行 · 共 '+stats.total+' 次</p>'+(stats.total?'<div id="taskDistributionChart" role="img" aria-label="最近七天运行状态占比"></div>'+legend:empty)+'</div></div></div></div>'+runPage(true);
}
function connectionsPage(){return card('数据连接','查看连接 → 创建采集任务 → 发布运行 → 检查输出数据',filteredTable([{key:'name',title:'连接名称',render:r=>`<div class="d-flex align-items-center gap-3"><span class="widget-stat-icon primary flex-shrink-0">${icon('database')}</span>${detailLink(r.name,'connection',r.id)}</div>`},{title:'数据库类型',render:r=>e(databaseLabel(r))},{key:'database',title:'数据库'},{key:'host',title:'连接地址'},{title:'最近测试',render:r=>badge(r.test,r.test.includes('成功')?'success':'secondary')},{title:'操作',render:r=>actions(action('编辑','edit',{kind:'connection',id:r.id,disabled:!rights().write})+action('测试连接','test-connection',{id:r.id,disabled:!rights().write})+action('创建采集任务','from-connection',{id:r.id,disabled:!rights().write}))}],connections(current()),{empty:'暂无连接，请先新建数据连接。'}));}
const jobType=kind=>kind==='tasks'?'batch':kind==='code'?'code':'flow';
const jobRows=kind=>kind==='tasks'?tasks(current()):kind==='code'?codes(current()):flows(current());
function jobsPage(kind){if(kind==='code')return codePage();if(kind==='tasks')return tasksPage();const p=current(),c=rights();return card(modules.find(m=>m[0]===kind)[1],'保存配置 → 校验发布 → 运行产出 → 配置调度',table([{title:'任务名称',render:r=>detailLink(r.name,kind,r.id)},{title:kind==='tasks'?'采集方式':'输入数据集',render:r=>e(kind==='tasks'?({full:'全量读取',incremental:'递增字段读取',continuous:'持续变更采集'}[r.mode]):(r.inputs||[]).map(id=>datasets(p).find(d=>d.id===id)?.name||id).join('、')||'未绑定')},{title:'输出',render:r=>e(kind==='tasks'?Object.values(r.outputs||{}).join('、'):r.output||'未配置')},{title:'发布状态',render:r=>badge(r.published?'已发布':'草稿',r.published?'success':'warning')},{title:'操作',render:r=>actions((kind==='code'?action('下载代码包','download-code',{id:r.id,disabled:!c.download||!r.packageId}):'')+action('配置','edit',{kind:kind==='tasks'?'task':kind==='flows'?'flow':'code',id:r.id,disabled:!c.write})+action('校验发布','publish',{kind,id:r.id,disabled:!c.write||r.published})+action(r.mode==='continuous'?'启动采集':'运行','run',{kind,id:r.id,disabled:!c.write||!r.published})+(r.mode==='continuous'?action('停止','stop',{id:r.id,disabled:!c.write||!runs(p.name,r.id).some(x=>x.status==='RUNNING')}):''))}],jobRows(kind),{empty:'暂无任务，点击右上角创建。'}));}
function codePage(){
 const p=current(),rows=codes(p).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))||b.id.localeCompare(a.id));
 return card('代码任务','打开任务查看配置、开发与代码包、运行记录', filteredTable([{title:'任务名称',render:r=>detailLink(r.name,'code',r.id)},{title:'语言',render:()=> 'Python'},{title:'配置状态',render:r=>badge(r.configStatus==='READY'?'已就绪':'草稿',r.configStatus==='READY'?'success':'warning')},{key:'updatedBy',title:'修改人'},{title:'修改时间（北京时间）',render:r=>e(formatTime(r.updatedAt))},{title:'操作',render:r=>action('打开','inspect',{kind:'code',id:r.id})}],rows,{empty:'没有符合条件的代码任务。'}));
}
function tasksPage(){
 const p=current(),c=rights();return card('采集任务','配置与每次运行分开查看；持续采集使用启动时的配置',filteredTable([
 {title:'任务名称',render:r=>detailLink(r.name,'tasks',r.id)},
 {title:'采集方式',render:r=>e({full:'全量读取',incremental:'递增字段读取',continuous:'持续变更采集'}[r.mode])},
 {title:'来源连接',render:r=>{const source=connections(p).find(c=>c.name===r.connection);return source?connectionLink(source.name,source.id):e(r.connection||'连接不可用');}},
 {title:'配置状态',render:r=>badge(r.mode==='continuous'&&r.published?'已保存':r.published?'已发布':'草稿',r.published?'success':'warning')},
 {title:'最近运行',render:r=>{const last=projectRuns(p).find(run=>run.taskId===r.id);return last?statusBadge(last.status):'尚未运行';}},
 {title:'操作',render:r=>actions(action('配置','edit',{kind:'task',id:r.id,disabled:!c.write})+action('运行记录','job-history',{kind:'tasks',id:r.id}))}
 ],tasks(p),{empty:'暂无采集任务。'}));
}
function datasetsPage(){return card('数据资产','点击数据集名称查看预览、字段、版本和来源',filteredTable([{title:'数据集',render:r=>'<div class="d-flex align-items-center gap-3"><span class="widget-stat-icon primary flex-shrink-0">'+icon('table')+'</span>'+detailLink(r.name,'dataset',r.id)+'</div>'},{title:'数据分组',render:r=>r.group==='processed'?'加工数据':'原始数据'},{key:'method',title:'来源方式'},{title:'来源',render:r=>{const p=current(),producer=[...tasks(p).map(t=>({...t,kind:'tasks'})),...codes(p).map(t=>({...t,kind:'code'})),...flows(p).map(t=>({...t,kind:'flows'}))].find(t=>t.id===r.producer);return producer?detailLink(producer.name,producer.kind,producer.id):e(r.source);}},{title:'数据版本',render:r=>r.versionNumber!=null?'v'+r.versionNumber:'—'},{title:'状态',render:r=>badge(r.state||'状态待确认',r.state==='可用'?'success':'warning')}],datasets(current()),{empty:'暂无数据集，运行采集任务或导入 CSV 数据。'}));}
function planTarget(p,id){const available=targets(p).find(t=>t.id===id),resource=available||[...tasks(p).map(t=>({...t,type:'batch'})),...codes(p).map(t=>({...t,type:'code'})),...flows(p).map(t=>({...t,type:'flow'}))].find(t=>t.id===id);return resource?{...resource,ready:!!available}:null;}
function plansPage(){const p=current();return card('调度计划','新计划默认停用；启用只等待未来触发，不补跑历史记录',filteredTable([{title:'计划名称',render:r=>detailLink(r.name,'plan',r.id)},{title:'执行任务',render:r=>{const target=planTarget(p,r.task);return target?detailLink(target.name,target.type==='batch'?'tasks':target.type==='flow'?'flows':'code',target.id):'任务不可用';}},{title:'触发规则',render:r=>e(r.mode==='event'?'上游更新 · '+(r.combo==='all'?'全部更新':'任一更新'):'定时触发 · '+r.rule.zone)},{title:'状态',render:r=>badge(r.enabled?'已启用':'停用',r.enabled?'success':'secondary')},{title:'下一次触发',render:r=>e(!r.enabled?'计划未启用':r.mode==='event'?'等待上游新版本':r.nextAt?engine.format(r.nextAt,r.rule.zone):'无后续触发')},{title:'操作',render:r=>actions(action('配置','edit',{kind:'plan',id:r.id,disabled:!rights().write})+action(r.enabled?'停用':'启用','toggle-plan',{id:r.id,disabled:!rights().write})+action('触发记录','inspect',{kind:'plan',id:r.id,extra:'data-detail-tab="history"'}))}],readPlans(p),{empty:'暂无计划，请先发布任务，再创建调度。'}));}
function runPage(compact=false){
 const p=current(),rows=projectRuns(p);
 return card(compact?'最近运行':'运行记录','点击任务查看配置，点击输出查看数据与版本；执行为本地演示',(compact?table:filteredTable)([
  {title:'运行编号',render:r=>detailLink(r.id,'run',r.id,{taskId:r.taskId})},
  {title:'任务名称',render:r=>detailLink(r.name,r.type==='batch'||r.type==='continuous'?'tasks':r.type==='flow'?'flows':'code',r.taskId)},
  {title:'任务类型',render:r=>({batch:'批次采集',code:'代码任务',flow:'转换流程',continuous:'持续采集'})[r.type]},
  {title:'状态',render:r=>badge(runLabels[r.status]||r.status,['SUCCESS','SUCCEEDED'].includes(r.status)?'success':r.status==='FAILED'?'danger':'secondary')},
  {title:'提交时间',render:r=>e(r.start?new Date(r.start).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):'—')},
  {title:'输出 / 原因',render:r=>r.reason?e(r.reason):r.outputs?.length?r.outputs.map(x=>{const d=datasets(p).find(d=>d.id===x.id||d.name===x.name);return d?detailLink(x.name+' · v'+x.version,'dataset',d.id,{version:x.version}):e(x.name);}).join('、'):'—'}
 ],compact?rows.slice(0,5):rows,{search:!compact,empty:'尚无运行记录。配置就绪后运行任务，查看输出数据集的生成。'}));
}
function canEditMember(member){const c=rights();return !!member&&c.manage&&member.role!=='owner'&&member.id!==actor()&&!(c.role==='admin'&&member.role==='admin');}
const accessColumns=[['read','查看与预览'],['write','配置与运行'],['manage','管理成员'],['download','下载数据']];
const accessBadge=allowed=>badge(allowed?'允许':'不允许',allowed?'success':'secondary');
function permissionPreview(){
 const id=users.some(u=>u.id===previewMember)?previewMember:actor(),c=cap(projectName,id);
 return `${memberIdentity(id)}<p class="mt-3">项目角色：${e(roleNames[c.role]||'非项目成员')}</p>${table([{key:'label',title:'操作'},{title:'实际权限',render:r=>accessBadge(c[r.key])},{key:'note',title:'范围说明'}],[{key:'read',label:'查看资源和数据预览',note:'连接、任务、数据集、运行记录'},{key:'write',label:'配置、发布和运行',note:'只读成员不可操作；归档项目不可修改'},{key:'manage',label:'管理项目成员',note:!c.manage?'当前角色或项目状态不允许管理成员':c.role==='admin'?'可管理开发者和只读成员，不可调整自己或同级管理员':'负责人可管理其他成员；不可移除自己'},{key:'download',label:'下载数据',note:'负责人默认允许，其他角色单独授权'}],{search:false,id:'permission-preview-table'})}`;
}
function membersPage(){
 const state=permissions(projectName),tabs=[['members','项目成员'],['preview','成员权限预览'],['roles','角色权限说明'],['changes','权限变更记录']];
 const members=table([{title:'成员',render:r=>memberIdentity(r.id)},{title:'角色',render:r=>e(roleNames[r.role])},...accessColumns.map(([key,title])=>({title,render:r=>accessBadge(cap(projectName,r.id)[key])})),{title:'操作',render:r=>actions(action('查看权限','preview-member',{id:r.id})+action('调整权限','edit',{kind:'member',id:r.id,disabled:!canEditMember(r)})+action('移除','remove-member',{id:r.id,disabled:!canEditMember(r)}))}],state.members,{search:false,id:'members-table'});
 const preview=alert('选择成员查看实际权限，不会切换当前登录身份。')+`<div class="mb-4"><label class="form-label" for="permission-member">预览成员</label><select class="form-select" data-choices data-choices-sort="false" id="permission-member">${users.map(u=>`<option value="${e(u.id)}" ${u.id===(previewMember||actor())?'selected':''}>${e(u.name)}${state.members.some(m=>m.id===u.id)?'':'（非项目成员）'}</option>`).join('')}</select></div><div id="permission-preview">${permissionPreview()}</div>`;
 const roles=table([{key:'label',title:'操作权限'},...Object.entries(roleNames).map(([role,title])=>({title,render:r=>r.key==='download'?(role==='owner'?'默认允许':'需单独授权'):accessBadge(r.roles.includes(role))}))],[{key:'read',label:'查看资源与预览',roles:['owner','admin','developer','viewer']},{key:'write',label:'配置、发布和运行',roles:['owner','admin','developer']},{key:'manage',label:'成员管理',roles:['owner','admin']},{key:'download',label:'数据下载',roles:[]}],{search:false,id:'role-matrix'})+alert('此表说明角色的一般能力。归档状态、独立下载授权和成员管理限制，请以“成员权限预览”为准。');
 const changes=table([{title:'时间',render:r=>e(new Date(r.at).toLocaleString('zh-CN'))},{title:'操作人',render:r=>e(r.actor?person(r.actor):r.by||'—')},{title:'成员',render:r=>e(r.member?person(r.member):'—')},{key:'action',title:'变更操作'}],state.events||[],{search:false,id:'permission-history',empty:'暂无权限变更记录。'});
 const panels={members,preview,roles,changes};
 return card('项目成员与权限',`共 ${state.members.length} 位成员 · 下载权限独立授权`,`<ul class="nav nav-tabs mb-4" role="tablist">${tabs.map(([id,label])=>`<li class="nav-item" role="presentation"><button class="nav-link ${memberTab===id?'active':''}" id="access-tab-${id}" data-member-tab="${id}" data-bs-toggle="tab" data-bs-target="#access-pane-${id}" type="button" role="tab" aria-controls="access-pane-${id}" aria-selected="${memberTab===id}">${label}</button></li>`).join('')}</ul><div class="tab-content">${tabs.map(([id])=>`<div class="tab-pane fade ${memberTab===id?'show active':''}" id="access-pane-${id}" role="tabpanel" aria-labelledby="access-tab-${id}">${panels[id]}</div>`).join('')}</div>`);
}
document.addEventListener('shown.bs.tab',event=>{
 if(event.target.dataset.detailTab&&event.target.closest('#resource-detail-body')&&inspection){
  inspection.options.tab=event.target.dataset.detailTab;const url=new URL(location.href);url.searchParams.set('tab',inspection.options.tab);history.replaceState(history.state,'',url);lastURL=location.href;
 }
 if(event.target.dataset.memberTab)memberTab=event.target.dataset.memberTab;
});
function organizationPage(){const state=orgState(),admin=users.find(u=>u.id===actor())?.orgRole==='组织管理员';return card('组织成员','组织身份决定项目创建资格，项目内权限由项目角色决定。',alert('组织管理员不会自动获得所有项目的数据权限。项目负责人在项目成员中分配访问角色。')+table([{key:'name',title:'姓名',render:r=>memberIdentity(r.id)},{key:'orgRole',title:'组织身份'},{title:'创建项目',render:r=>badge(r.orgRole==='组织管理员'||state.creators.includes(r.id)?'允许':'不允许',r.orgRole==='组织管理员'||state.creators.includes(r.id)?'success':'secondary')},{title:'操作',render:r=>action(state.creators.includes(r.id)?'取消创建权限':'允许创建项目','toggle-creator',{id:r.id,disabled:!admin||r.orgRole==='组织管理员'})}],users));}
function documentsPage(){return card('项目说明','当前项目的背景和使用说明',`<h3>${e(projectName)}</h3><p>${e(current().description||'在此项目内统一管理数据接入、开发任务与自动调度。')}</p>${alert('连接测试与任务执行为浏览器本地演示；不访问真实数据库，不执行代码。浏览器关闭后不执行后台调度。')}`);}

function findRecord(kind,id){const p=current();return (kind==='run'?projectRuns(p):kind==='connection'?connections(p):kind==='task'||kind==='tasks'?tasks(p):kind==='code'?codes(p):kind==='flow'||kind==='flows'?flows(p):kind==='dataset'?datasets(p):kind==='plan'?readPlans(p):kind==='member'?permissions(p.name).members:[]).find(x=>x.id===id);}
function detailContext(){
 const host=$('#resource-detail-body');if(!inspection||!host)return null;
 return {...inspection,options:{...inspection.options},title:$('#workspace-heading h1').textContent,scroll:window.scrollY,filters:[...host.querySelectorAll('input[id],select[id],input[data-table-search]')].map(el=>({id:el.id,search:el.dataset.tableSearch,value:el.value}))};
}
function restoreDetailControls(context){
 const host=$('#resource-detail-body');if(!host||context.kind!==inspection?.kind||context.id!==inspection?.id)return;
 for(const saved of context.filters||[]){const control=saved.id?document.getElementById(saved.id):host.querySelector('[data-table-search="'+saved.search+'"]');if(control&&host.contains(control)){control.value=saved.value;if(control.dataset.tableSearch)control.dispatchEvent(new Event('input',{bubbles:true}));}}
 syncFilterSelects(host);syncDatePickers(host);if(host.querySelector('#run-filters'))filterRunHistory();
}
function restoreDetail(context){render();restoreDetailControls(context);window.scrollTo(0,context.scroll||0);}
function showEditor(kind,record){
 if(modalClosing){pendingEditor=[kind,record];return;}
 if(kind==='project'?!canCreate():!current()||!(kind==='member'?rights().manage:rights().write))throw Error('当前角色无权执行此操作');
 const titles={project:'创建项目',connection:'数据连接配置',task:'采集任务配置',dataset:'新建数据集',code:'代码任务配置',flow:'转换流程配置',plan:'调度计划配置',member:'成员权限'};
 if(editor&&!allowLeave(()=>showEditor(kind,record)))return;
 const context=detailContext();editorReturn=context?{context,afterSave:context.id===record?.id&&resourceKind(kind)===context.kind}:null;
 editor?.dispose();editor=null;$('#workspace-modal-title').textContent=(record?.id?'编辑 · ':'')+titles[kind];
 modalElement.dataset.editorKind=kind;
 modalElement.querySelector('.modal-dialog').className='modal-dialog modal-dialog-scrollable '+(['task','code','flow','plan','dataset'].includes(kind)?'modal-xl':'modal-lg');
 modalElement.querySelector('.modal-content').classList.add('h-100');
 const destinations={project:'projects',connection:'connections',task:'tasks',dataset:'datasets',code:'code',flow:'flows',plan:'plans',member:'members'};
 editor=new Editor($('#workspace-modal-body'),{kind,record,project:current(),projects,done:message=>{
  editor.dirty=false;projects=read(projectKey,initialProjects);
  const savedName=editor.f.name,savedKind=resourceKind(kind),savedRows=current()?(kind==='connection'?connections(current()):kind==='task'?tasks(current()):kind==='code'?codes(current()):kind==='plan'?readPlans(current()):kind==='dataset'?datasets(current()):[]):[],savedRecord=savedRows.find(row=>record?.id?row.id===record.id:row.name===savedName.trim()),parent=editorReturn;
  editorReturn=null;editor.dispose();editor=null;modal.hide();
  if(parent?.afterSave){restoreDetail(parent.context);notify(message);return;}
  if(parent&&savedRecord){openDetail(savedKind,savedRecord.id);notify(message);return;}
  render();
  const next=destinations[kind],follow=button('查看'+({project:'项目',connection:'连接',task:'采集任务',dataset:'数据集',code:'代码任务',flow:'转换流程',plan:'调度计划',member:'成员权限'})[kind],'route',{id:next,variant:'outline-primary'});
  $('#workspace-message').innerHTML=alert(message)+'<div class="mb-3 d-flex gap-2">'+(savedRecord?button('查看详情','inspect',{kind:savedKind,id:savedRecord.id,variant:'primary'}):'')+follow+'</div>';
 }});$('#workspace-modal-body').scrollTop=0;modal.show();
}
function renderResourceDetail(kind,id,options={}){
 const p=current(),record=rights().read?(kind==='run'?projectRuns(p).find(r=>r.id===id&&(!options.taskId||r.taskId===options.taskId)):findRecord(kind,id)):null;
 const moduleTitle=modules.find(m=>m[0]===resourceView(kind))?.[1]||'资源',back=button(history.state?.from?'返回 · '+history.state.from:'返回'+moduleTitle,'back-detail',{variant:'outline-secondary',icon:'arrow-left'});
 document.title=(record?.name||'资源详情')+' · 明策';
 $('#workspace-breadcrumb').innerHTML=routeLink('overview',p.name)+routeLink(resourceView(kind),moduleTitle)+'<span class="breadcrumb-item active">'+e(record?.name||'资源详情')+'</span>';
 $('#workspace-heading').innerHTML='<div><h1 class="page-title" tabindex="-1">'+e(record?.name||'资源详情')+'</h1><p class="text-muted mb-0">'+e(kind==='connection'&&record?databaseLabel(record)+' · '+record.database:moduleTitle+'详情')+'</p></div><div class="d-flex gap-2 flex-wrap" id="resource-detail-actions">'+back+'</div>';
 $('#workspace-content').innerHTML=record?'<section class="card"><div class="card-body" id="resource-detail-body"></div></section>':alert(rights().read?'资源不存在或已移除。':'无权查看此资源，请联系项目负责人。','warning');
 if(!record){inspection=null;return;}
 inspection={kind,id,options};const host=$('#resource-detail-body');
 if(kind==='dataset'){
  const producer=[...tasks(p).map(t=>({...t,kind:'tasks'})),...flows(p).map(t=>({...t,kind:'flows'})),...codes(p).map(t=>({...t,kind:'code'}))].find(t=>t.id===record.producer);
  const downstream=[...flows(p).map(t=>({...t,kind:'flows'})),...codes(p).map(t=>({...t,kind:'code'}))].filter(t=>t.inputs?.includes(id));
  const connection=producer?.connection?connections(p).find(c=>c.name===producer.connection):undefined;
  host.innerHTML=datasetBody(record,{producer,downstream,connection,allDatasets:datasets(p),version:options.version});
 }else if(kind==='connection')host.innerHTML=connectionDetail({...record,canWrite:rights().write},{tasks:tasks(p).filter(t=>t.connection===record.name)});
 else if(kind==='plan'){const target=planTarget(p,record.task);host.innerHTML=scheduleDetail(record,{target,allDatasets:datasets(p),runs:projectRuns(p),engine});}
 else if(kind==='run'){const task=findRecord(record.type==='continuous'||record.type==='batch'?'tasks':record.type==='flow'?'flows':'code',record.taskId);host.innerHTML=runBody(record,{task,plan:readPlans(p).find(plan=>plan.id===record.planId),outputs:datasets(p),canWrite:rights().write});}
 else {
  const source=connections(p).find(c=>c.name===record.connection),history=record.mode==='continuous'?runs(p.name,id):executions(p).filter(r=>r.taskId===id);
  const configuration=`<dl class="row"><dt class="col-3">${record.mode==='continuous'?'配置状态':'发布状态'}</dt><dd class="col-9">${badge(record.mode==='continuous'&&record.published?'已保存':record.published?'已发布':'草稿',record.published?'success':'warning')} <span class="text-muted small">${record.mode==='continuous'?'保存后可启动采集；每次运行保留启动时的配置。':record.published?'可以运行；修改后需重新发布。':'先检查配置，再校验发布。'}</span></dd><dt class="col-3">输入资源</dt><dd class="col-9">${record.connection?(source?detailLink(source.name,'connection',source.id):e(record.connection)):(record.inputs||[]).map(id=>{const d=datasets(p).find(d=>d.id===id);return d?detailLink(d.name,'dataset',id):e(id);}).join('、')}</dd><dt class="col-3">输出名称</dt><dd class="col-9">${e(record.output||Object.values(record.outputs||{}).join('、')||'未配置')}</dd>${record.fileName?`<dt class="col-3">代码包</dt><dd class="col-9">${e(record.fileName)}</dd>`:''}</dl>`;
  const historyBody=jobHistory(history.map(run=>({...run,taskId:id,name:record.name,type:record.mode==='continuous'?'continuous':kind==='code'?'code':kind==='tasks'||kind==='task'?'batch':'flow'})));
  const bindingProblem=kind==='code'?codeBindingIssue(record,datasets(p),codes(p)):'';
  const packageBody=(bindingProblem?alert(bindingProblem+'；请编辑配置后再下载模板。','warning'):'')+'<h3 class="h6">代码与开发</h3><dl class="row"><dt class="col-3">当前代码包</dt><dd class="col-9">'+e(record.fileName||'尚未上传')+'</dd><dt class="col-3">运行入口</dt><dd class="col-9">main.py（模板约定）</dd><dt class="col-3">开发方式</dt><dd class="col-9">下载模板，在本地开发并打包为 ZIP，再上传保存。</dd></dl><div class="d-flex flex-wrap gap-2 mb-4">'+button('下载代码模板','download-template',{id,variant:'outline-primary',disabled:!rights().write||!!bindingProblem})+button(record.fileName?'替换代码包':'上传代码包','edit-package',{kind:'code',id,variant:'primary',disabled:!rights().write})+button('下载代码包','download-code',{id,variant:'outline-primary',disabled:!rights().download||!record.packageId})+'</div>'+(!record.packageId?alert(record.fileName?'此任务仅有代码包文件名，尚无原文件可供下载。请重新上传 ZIP。':'尚未上传代码包。上传并保存后任务就绪，保存配置不会自动运行。','secondary'):alert('代码包已保存。替换代码包与执行任务是两项独立操作。','secondary'));

  const configBody=kind==='code'?codeConfiguration(record,{allDatasets:datasets(p)}):['task','tasks'].includes(kind)?collectionConfiguration(record,{source,allDatasets:datasets(p)}):configuration;
  host.innerHTML=kind==='flows'||kind==='flow'?configuration+'<h3 class="h6">运行历史</h3>'+table([{title:'提交时间',render:r=>e(formatTime(r.start))},{title:'状态',render:r=>badge(runLabels[r.status]||r.status,r.status==='FAILED'?'danger':'secondary')},{key:'reason',title:'说明'}],history,{search:false,id:'job-history',empty:'暂无运行记录。发布后点击上方运行按钮。'}):tabs([['config','任务配置',configBody],...(kind==='code'?[['package','开发与代码包',packageBody]]:[]),['history','运行记录',historyBody]],'job');

 }
 const canonical=kind==='tasks'?'task':kind==='flows'?'flow':kind;
 if(kind==='plan')host.insertAdjacentHTML('afterbegin',alert(record.mode==='event'?'输入数据集产生新版本时触发；不是按固定时间运行，也不直接监听外部数据库。':'按设定时间运行，使用当时可用的数据，不自动等待本轮上游更新。'));
 const isJob=['task','flow','code'].includes(canonical),jobKind=canonical==='task'?'tasks':canonical==='flow'?'flows':'code';
 const busy=isJob&&(record.mode==='continuous'?runs(p.name,id):executions(p).filter(r=>r.taskId===id)).some(r=>['QUEUED','RUNNING','STOPPING'].includes(r.status));
 const runnable=canonical==='code'?record.configStatus==='READY'&&!!record.fileName&&!codeBindingIssue(record,datasets(p),codes(p)):!!record.published;
 const activeRun=isJob?projectRuns(p).find(r=>r.taskId===id&&['QUEUED','RUNNING','STOPPING'].includes(r.status)):null;
 const runAction=activeRun?button('查看本次运行','inspect',{kind:'run',id:activeRun.id,variant:'primary',extra:'data-task="'+e(id)+'"'}):button(record.mode==='continuous'?'启动采集':'运行','run',{kind:jobKind,id,disabled:!rights().write||!runnable||busy});
 const toolbar=kind==='run'?'':kind==='dataset'?button('下载 CSV','download',{id,variant:'outline-primary',disabled:!rights().download||!Array.isArray(record.rows)||!record.schema?.length||!(record.versionNumber!=null||record.state==='可用'),extra:options.version!=null?'data-version="'+e(options.version)+'"':''}):
  button('编辑配置','edit',{kind:canonical,id,variant:'outline-primary',disabled:!rights().write})+
  (isJob?(canonical==='code'||record.mode==='continuous'?'':button('校验发布','publish',{kind:jobKind,id,variant:'outline-primary',disabled:!rights().write||record.published}))+runAction+(record.mode==='continuous'?'':button('创建调度','from-task',{id,kind:jobKind,variant:'outline-primary',disabled:!rights().write||!runnable})):kind==='connection'?button('创建采集任务','from-connection',{id,disabled:!rights().write}):kind==='plan'?button(record.enabled?'停用':'启用','toggle-plan',{id,disabled:!rights().write||!record.enabled&&!planTarget(p,record.task)?.ready,extra:!record.enabled&&!planTarget(p,record.task)?.ready?'title="请先完成目标任务配置"':''}):'');
 const outputs=isJob?datasets(p).filter(d=>d.producer===id||!d.producer&&(Object.values(record.outputs||{}).includes(d.name)||(canonical==='code'?codeOutputNames(record).includes(d.name):d.name===record.output))):[];
 $('#resource-detail-actions').insertAdjacentHTML('beforeend',toolbar);
 if(canonical==='flow')host.insertAdjacentHTML('beforeend',`<h4 class="h6 mt-4">输出数据集</h4>${outputs.length?outputs.map(d=>detailLink(d.name,'dataset',d.id)).join(' · '):alert('运行成功后，输出数据集会显示在这里。')}`);
 if(options.tab){const prefix=kind==='dataset'?'':kind==='plan'?'plan-':kind==='connection'?'connection-':'job-';const tab=host.querySelector('#'+prefix+'tab-'+options.tab);if(tab)bootstrap.Tab.getOrCreateInstance(tab).show();}
}
function openDetail(kind,id,options={}){
 kind=resourceKind(kind);if(!current()||!rights().read||!findRecord(kind,id))throw Error('无权查看或资源不存在');
 const url=detailURL(kind,id,options);
 if(url===location.pathname+location.search+location.hash){const context=capturePageContext();render();restorePageContext(context);return;}
 navigatePage(url);
}
const inspect=openDetail;

document.addEventListener('click',event=>{
 const link=event.target.closest('[data-route]');if(link){if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();go(link.dataset.route,link.dataset.project||projectName);return;}
 const target=event.target.closest('[data-action]');if(!target||target.disabled)return;if(target.matches('a')){if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();}const {action:command,kind,id}=target.dataset;
 act(()=>{
  if(command==='reset-run-filters'){const form=$('#run-filters');form.reset();form.querySelectorAll('select').forEach(select=>{select.value='';});syncFilterSelects(form);syncDatePickers(form);const search=$('[data-table-search="job-history"]');if(search)search.value='';filterRunHistory();}
  if(command==='route')go(id);
  if(command==='enter-project')go('overview',id);
  if(command==='new')showEditor(kind);
  if(command==='download-template'){const task=id&&findRecord('code',id);if(!task)throw Error('请先选择具体代码任务');downloadCodeTemplate(current(),task);}
  if(command==='download-code'){
   if(!rights().download)throw Error('当前角色无下载权限');
   const project=projectName,record=findRecord('code',id);if(!record?.packageId)throw Error('请先上传并保存代码包');
   target.disabled=true;
   loadPackage(record.packageId,project).then(file=>{
    if(projectName!==project||!cap(project).download)return;
    const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=record.fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }).catch(error=>{if(projectName===project)notify(error.message,'danger');}).finally(()=>{target.disabled=false;});
  }
  if(command==='edit')showEditor(kind,findRecord(kind,id));
  if(command==='edit-package'){showEditor('code',findRecord('code',id));$('#workspace-modal-body [data-upload-field]')?.scrollIntoView({block:'center'});}
  if(command==='preview-member'){previewMember=id;$('#permission-member').value=id;syncFilterSelects($('#workspace-content'));$('#permission-preview').innerHTML=permissionPreview();bootstrap.Tab.getOrCreateInstance($('#access-tab-preview')).show();}
  if(command==='inspect')openDetail(kind,id,{taskId:target.dataset.task,tab:target.dataset.detailTab,version:target.dataset.version});
  if(command==='back-detail'){const back=()=>history.state?.from?history.back():go(resourceView(inspection?.kind)||view);if(allowLeave(back))back();}
  if(command==='job-history')openDetail(kind,id,{tab:'history'});
  if(command==='dataset-version')openDetail('dataset',id,{version:target.dataset.version});
  if(command==='from-connection')showEditor('task',{connection:findRecord('connection',id).name});
  if(command==='from-dataset')showEditor(kind,{inputs:[id]});
  if(command==='from-task')showEditor('plan',{task:id});
  if(command==='test-connection'){assertWrite(projectName);const context=detailContext();write(key(projectName,'connections'),connections(current()).map(r=>r.id===id?{...r,test:'成功（演示）'}:r));render();if(context)restoreDetail(context);notify('连接测试成功（演示），未访问真实数据库');}
  if(command==='publish'){const context=detailContext();publishTask(current(),jobType(kind),id);render();if(context)restoreDetail(context);notify('任务已校验并发布，现在可以运行。');}
  if(command==='run'){const r=findRecord(kind,id),run=r.mode==='continuous'?startIngest(current(),r):submitExecution(current(),jobType(kind),id);render();if(kind==='flows'){if(inspection)inspect(inspection.kind,inspection.id);notify('已提交本地演示运行。');}else{openDetail('run',run.id,{taskId:r.id});notify('已提交本地演示运行。');}}
  if(command==='stop-run'){
   const run=projectRuns(current()).find(r=>r.id===id&&r.taskId===inspection?.options?.taskId)||projectRuns(current()).find(r=>r.id===id);
   if(!run||run.type!=='continuous'||run.status!=='RUNNING')throw Error('当前运行不可停止');
   confirmInModal('停止本次采集？','停止后不再接收本次采集的变更。已生成的数据版本保留，其他运行不受影响。','确认停止',()=>{const task=findRecord('task',run.taskId);stopIngest(current(),task,run.id);inspect('run',run.id,{taskId:run.taskId});notify('已请求停止，等待本次采集退出。');});
  }
  if(command==='stop'){const run=runs(projectName,id).find(r=>r.status==='RUNNING');if(run)inspect('run',run.id,{taskId:id});}
  if(command==='toggle-plan'){const plan=findRecord('plan',id),context=detailContext();setPlanEnabled(current(),id,!plan.enabled);render();if(context)restoreDetail(context);notify(plan.enabled?'计划已停用':'计划已启用，等待未来触发');}
  if(command==='download'){
   if(!rights().download)throw Error('当前角色无下载权限');const r=findRecord('dataset',id),version=target.dataset.version;
   const snapshot=version!=null?(r.versions||[]).find(v=>String(v.version)===version):null;
   const data=snapshot?.data??(version==null||String(r.versionNumber)===version?r.rows:undefined),schema=snapshot?.schema||r.schema;
   if(!Array.isArray(data)||!schema?.length)throw Error('当前版本没有可下载的预览数据');
   const cell=(v,isText)=>v==null?'':'"'+(isText?String(v).replace(/^[=+@\-\t\r]/,m=>"'"+m):String(v)).replaceAll('"','""')+'"';
   download(r.name+(version!=null?'-v'+version:'')+'.csv','\uFEFF'+[schema.map(f=>cell(f.name,true)).join(','),...data.map(row=>schema.map((field,i)=>cell(Array.isArray(row)?row[i]:row[field.name],field.type==='STRING')).join(','))].join('\r\n'),'text/csv;charset=utf-8');
  }
  if(command==='remove-member'){
   const r=findRecord('member',id);if(!canEditMember(r))throw Error('无权移除此成员');const project=projectName;
   confirmInModal('移除成员？','移除后，该成员将无法访问此项目。','确认移除',()=>{
    if(projectName!==project||!canEditMember(findRecord('member',id)))throw Error('成员权限已变化，请刷新后重试');
    const state=permissions(project);localStorage.setItem(permissionKey(project),JSON.stringify({...state,revision:state.revision+1,members:state.members.filter(m=>m.id!==id),events:[{at:new Date().toISOString(),actor:actor(),action:'移除成员',member:id},...state.events]}));render();notify('成员已移除');
   });
  }
  if(command==='toggle-creator'){if(users.find(u=>u.id===actor())?.orgRole!=='组织管理员'||users.find(u=>u.id===id)?.orgRole==='组织管理员')throw Error('无权修改此成员的创建权限');const state=orgState();localStorage.setItem(orgKey,JSON.stringify({...state,revision:state.revision+1,creators:state.creators.includes(id)?state.creators.filter(x=>x!==id):[...state.creators,id]}));render();notify('项目创建权限已更新');}
 });
});
document.addEventListener('change',event=>{if(event.target.id==='permission-member'){previewMember=event.target.value;$('#permission-preview').innerHTML=permissionPreview();}if(event.target.closest('#run-filters'))filterRunHistory();if(event.target.closest('[data-resource-filters]'))rememberFilters(event.target.form);});
document.addEventListener('input',event=>{if(event.target.closest('[data-resource-filters]'))rememberFilters(event.target.form);const id=event.target.dataset.tableSearch;if(!id)return;if(id==='job-history'){filterRunHistory();return;}const query=event.target.value.toLocaleLowerCase();let count=0;document.querySelectorAll('#'+id+' tbody tr').forEach(row=>{row.hidden=!row.textContent.toLocaleLowerCase().includes(query);if(!row.hidden)count++;});document.querySelector(`[data-table-count="${id}"]`).textContent=`共 ${count} 条记录`;document.querySelector(`[data-table-empty="${id}"]`).hidden=!!count;});
function filterRunHistory(){
 const form=$('#run-filters');if(!form)return;
 const from=$('#run-from').value,to=$('#run-to').value,query=$('[data-table-search="job-history"]').value.toLocaleLowerCase(),status=$('#run-status').value,trigger=$('#run-trigger').value;
 $('#run-filter-error').innerHTML=from&&to&&from>to?alert('开始日期不能晚于结束日期。','danger'):'';if(from&&to&&from>to)return;
 let count=0;document.querySelectorAll('#job-history tbody tr').forEach(row=>{const time=row.querySelector('time')?.dateTime,date=time?new Date(Date.parse(time)+8*3600000).toISOString().slice(0,10):'';row.hidden=!!(query&&!row.textContent.toLocaleLowerCase().includes(query)||status&&row.cells[4].textContent!==status||trigger&&row.cells[1].textContent!==trigger||from&&date<from||to&&date>to);if(!row.hidden)count++;});
 $('[data-table-count="job-history"]').textContent='共 '+count+' 条记录';$('[data-table-empty="job-history"]').hidden=!!count;
}
document.addEventListener('submit',event=>{if(event.target.matches('[data-resource-filters]')){event.preventDefault();if(applyFilters(event.target))render();return;}if(event.target.id==='run-filters'){event.preventDefault();filterRunHistory();}});
setInterval(()=>{const elapsed=$('[data-run-duration]');if(elapsed){const start=/^\d+$/.test(elapsed.dataset.start)?Number(elapsed.dataset.start):elapsed.dataset.start,end=/^\d+$/.test(elapsed.dataset.end)?Number(elapsed.dataset.end):elapsed.dataset.end;elapsed.textContent=duration(start,end);}const p=current();if(!p||!rights().read)return;act(()=>{
 const before=JSON.stringify([executions(p),readPlans(p),tasks(p).filter(t=>t.mode==='continuous').map(t=>runs(p.name,t.id))]);tickWorkflow(p);
 const after=JSON.stringify([executions(p),readPlans(p),tasks(p).filter(t=>t.mode==='continuous').map(t=>runs(p.name,t.id))]);
 // Keep form DOM and search text intact while the runtime advances.
 if(before!==after&&!editor&&!leavePrompt){const context=capturePageContext();render();restorePageContext(context);}
});},500);
restoreFilterSnapshot(history.state?.workspaceContext?.filters);render();restorePageContext(history.state?.workspaceContext);


function filteredTable(columns,rows,options={}){return resourceTable(view,projectName,columns,rows,options);}
document.addEventListener('reset',event=>{if(event.target.matches('[data-resource-filters]')){event.preventDefault();resetFilters(event.target);render();}});
