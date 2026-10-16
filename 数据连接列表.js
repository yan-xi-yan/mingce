(() => {
  'use strict';
  const root = document.querySelector('.content');
  if (!root || document.body.dataset.page !== '04-数据连接列表.html') return;
  const tbody = root.querySelector('tbody');
  const params = new URLSearchParams(globalThis.__mingceQuery ?? location.search);
  const labels = {NOT_TESTED:'未测试', QUEUED:'排队中', RUNNING:'测试中', SUCCEEDED:'成功', FAILED:'失败', TIMED_OUT:'超时'};
  const rows = () => [...tbody.rows];
  const configUrl = name => {
    const query = new URLSearchParams({connection:name, connector:'mysql'});
    for (const key of ['project','projectId','empty','as']) if (params.has(key)) query.set(key, params.get(key));
    return '数据连接-编辑配置.html?' + query + '#config';
  };
  // Restore non-sensitive list metadata between prototype pages. Never store credentials.
  const indexKey='mingce.ui.connections.v1.'+(params.get('project')||'销售数据工程');
  let savedRows=[];try{const value=JSON.parse(sessionStorage.getItem(indexKey)||'[]');if(Array.isArray(value))savedRows=value.filter(x=>typeof x.name==='string');}catch{}
  for(const item of savedRows){
    if(rows().some(r=>r.cells[0].textContent.trim()===item.name))continue;
    const row=tbody.insertRow();for(let i=0;i<7;i++)row.insertCell();
    const nameLink=document.createElement('a');nameLink.className='name';nameLink.textContent=item.name;nameLink.href=configUrl(item.name);row.cells[0].append(nameLink);
    row.cells[1].textContent='关系型数据库';row.cells[2].textContent='MySQL';
    const badge=document.createElement('span');badge.className='status';badge.textContent=Object.values(labels).includes(item.test)?item.test:'未测试';row.cells[3].append(badge);
    row.cells[4].textContent='张敏';row.cells[5].textContent='本次会话';
    const config=document.createElement('a');config.className='action';config.textContent='配置';config.href=configUrl(item.name);row.cells[6].append(config);
  }
  // Restore the saved demonstration row before collecting filter options.
  if (params.has('savedConnection')) {
    const saved = new URLSearchParams(params.get('savedConnection'));
    const name = saved.get('connection');
    if (name && saved.get('connector') === 'mysql') {
      let row = rows().find(r => r.cells[0].textContent.trim() === (saved.get('originalName') || name));
      if (!row) {
        row = tbody.insertRow(0);
        for (let i=0;i<7;i++) row.insertCell();
        const nameLink = document.createElement('a'); nameLink.className='name'; row.cells[0].append(nameLink);
        const config = document.createElement('a'); config.className='action'; config.textContent='配置'; row.cells[6].append(config);
      }
      row.querySelector('a.name').textContent = name;
      row.querySelectorAll('a').forEach(a => a.href=configUrl(name));
      row.cells[1].textContent='关系型数据库'; row.cells[2].textContent='MySQL';
      const test = document.createElement('span');
      test.textContent=Object.values(labels).includes(saved.get('testState')) ? saved.get('testState') : '未测试';
      test.className='status '+(test.textContent==='成功'?'':test.textContent==='失败'?'fail':'gray');
      row.cells[3].replaceChildren(test); row.cells[4].textContent='张敏'; row.cells[5].textContent='刚刚';
      const feedback=document.createElement('div'); feedback.className='unified-feedback'; feedback.setAttribute('role','status');
      feedback.textContent='数据连接“'+name+'”已保存（演示）'; root.prepend(feedback);
    }
  }
  function rememberRows(){try{sessionStorage.setItem(indexKey,JSON.stringify(rows().map(r=>({name:r.cells[0].textContent.trim(),test:r.cells[3].querySelector('.status')?.textContent.trim()||'未测试'}))));}catch{}}
  rememberRows();
  new MutationObserver(rememberRows).observe(tbody,{subtree:true,childList:true,characterData:true});
  rows().forEach(row => {
    row.dataset.category='RELATIONAL_DATABASE'; row.dataset.connectorType='MYSQL';
    row.dataset.testStatus=Object.keys(labels).find(code => labels[code]===row.cells[3].querySelector('.status')?.textContent.trim()) || 'UNAVAILABLE';
  });
  const keyword = root.querySelector('#connection-keyword');
  const fields = [
    ['connection-category','category',{RELATIONAL_DATABASE:'关系型数据库'}],
    ['connection-connector','connectorType',{MYSQL:'MySQL'}],
    ['connection-test','testStatus',labels]
  ].map(([id,key,names]) => {
    const select=document.getElementById(id);
    const values=new Set(rows().map(r=>r.dataset[key]));
    Object.entries(names).sort(([a],[b])=>a.localeCompare(b)).filter(([code])=>values.has(code)).forEach(([code,name])=>select.add(new Option(name,code)));
    return {select,key};
  });
  // Options come from all visible demonstration records, independently of keyword/filter results.
  root.querySelector('.total').textContent=rows().length;
  document.querySelectorAll('.tree .category').forEach(item => {
    if(item.textContent.includes('数据连接')) item.querySelector('.count').textContent=rows().length;
  });
  root.querySelectorAll('.list-empty').forEach(el=>el.remove());
  const empty=document.createElement('div'); empty.className='list-empty no-data'; empty.setAttribute('role','status'); root.querySelector('table').after(empty);
  function apply() {
    const query=keyword.value.trim().toLocaleLowerCase();
    let count=0;
    rows().forEach(row=>{
      row.hidden=!(row.cells[0].textContent.toLocaleLowerCase().includes(query) && fields.every(({select,key})=>!select.value||row.dataset[key]===select.value));
      if(!row.hidden) count++;
    });
    empty.textContent=rows().length?'没有匹配的数据连接':'当前项目暂无数据连接'; empty.hidden=count>0;
    root.querySelector('.pager').textContent='共 '+count+' 条 · 每页 20 条';
  }
  document.getElementById('connection-search').onclick=apply;
  document.getElementById('connection-reset').onclick=()=>{keyword.value='';fields.forEach(({select})=>select.value='');apply();};
  keyword.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();}});
  // Local prototype adapter only: no server connection or database probe is performed.
  const actor=params.get('as')||'zhang';
  const roleNames={owner:'负责人',admin:'管理员',developer:'开发者',viewer:'只读成员'};
  const people={zhang:'张敏',li:'李明',wang:'王琳',chen:'陈杰'};
  const projectName=params.get('project')||'销售数据工程';
  const permissionKey='mingce-permissions-v1:'+(params.get('projectId')||projectName);
  function permission() {
    let members=projectName==='销售数据工程'?[{id:'zhang',role:'owner'},{id:'li',role:'admin'},{id:'wang',role:'developer'},{id:'chen',role:'viewer'}]:projectName==='供应链分析'?[{id:'li',role:'owner'},{id:'zhang',role:'developer'}]:[{id:'zhang',role:'owner'}];
    let archived=params.get('archived')==='1';
    try {const state=JSON.parse(localStorage.getItem(permissionKey));if(state?.version===1&&Array.isArray(state.members)){members=state.members;archived=archived||state.archived;}}catch{}
    const role=members.find(m=>m.id===actor)?.role;
    return {role,archived,allowed:!archived&&['owner','admin','developer'].includes(role),reason:archived?'项目已归档':role==='viewer'?'当前角色无测试连接权限':'当前用户无测试连接权限'};
  }
  const feedback=document.createElement('div');feedback.className='unified-feedback';feedback.setAttribute('role','status');feedback.hidden=true;root.querySelector('.toolbar').after(feedback);
  const tell=message=>{feedback.textContent=message;feedback.hidden=false;};
  const timers=new Set();let active=true;
  const later=(fn,ms)=>{const timer=setTimeout(()=>{timers.delete(timer);if(active)fn();},ms);timers.add(timer);};
  window.addEventListener('pagehide',()=>{active=false;timers.forEach(clearTimeout);});
  const busy=row=>row.dataset.submitting==='true'||['QUEUED','RUNNING'].includes(row.dataset.testStatus);
  function updatePermissions(){
    const p=permission();
    const identity=document.querySelector('.project-identity strong');if(identity)identity.textContent=roleNames[p.role]||'非项目成员';
    const user=document.querySelector('.top .user');if(user)user.textContent=people[actor]||'访客';
    if(p.archived)document.querySelector('.project-title .status').textContent='已归档';
    rows().forEach(row=>{const button=row.querySelector('.connection-test');button.disabled=!p.allowed||busy(row);button.textContent=busy(row)?(row.dataset.testStatus==='RUNNING'?'测试中…':'提交中…'):'测试连接';button.title=!p.allowed?p.reason:busy(row)?'本次测试尚未结束':'测试已保存配置（演示）';});
    root.querySelectorAll('.section-title a.primary').forEach(a=>{a.setAttribute('aria-disabled',String(!p.allowed));a.classList.toggle('unavailable',!p.allowed);a.tabIndex=p.allowed?0:-1;a.title=p.allowed?'':p.archived?'项目已归档':'当前角色无新建数据连接权限';a.onclick=e=>{if(!permission().allowed)e.preventDefault();};});
  }
  function showStatus(row,code){
    row.dataset.testStatus=code;
    const badge=document.createElement('span');badge.className='status '+(code==='SUCCEEDED'?'':code==='FAILED'||code==='TIMED_OUT'?'fail':code==='RUNNING'||code==='QUEUED'?'blue':'gray');badge.textContent=labels[code];
    const stamp=document.createElement('div');stamp.className='small';stamp.textContent='刚刚 · 演示';row.cells[3].replaceChildren(badge,stamp);updatePermissions();
  }
  function refreshFilters(){
    const select=document.getElementById('connection-test'),chosen=select.value;while(select.options.length>1)select.remove(1);
    const present=new Set(rows().map(row=>row.dataset.testStatus));
    // Keep an applied condition visible even when it currently has no matching records.
    if(chosen)present.add(chosen);
    Object.entries(labels).filter(([code])=>present.has(code)).forEach(([code,label])=>select.add(new Option(label,code)));select.value=chosen;
  }
  function runTest(row){
    if(!permission().allowed){updatePermissions();return tell(permission().reason);}
    if(busy(row))return;
    const request={mode:'SAVED',connectionId:row.dataset.connectionId,revision:row.dataset.revision};
    row.dataset.submitting='true';updatePermissions();
    const result=params.get('testResult')||'SUCCEEDED';
    if(result==='CONFIG_CONFLICT'){
      later(()=>{row.dataset.submitting='false';row.dataset.revision='demo-revision-refreshed';updatePermissions();tell('连接配置已变化，请刷新列表后重新测试（演示）；本次未发起测试。');},250);return;
    }
    showStatus(row,'QUEUED');tell('正在测试已保存配置（演示，不连接真实数据库）');
    later(()=>showStatus(row,'RUNNING'),300);
    later(()=>{
      row.dataset.submitting='false';
      if(request.revision!==row.dataset.revision){updatePermissions();return tell('连接配置已变化，请刷新列表查看最新结果（演示）。');}
      const finalStatus=['SUCCEEDED','FAILED','TIMED_OUT'].includes(result)?result:'FAILED';
      showStatus(row,finalStatus);refreshFilters();apply();
      tell(finalStatus==='SUCCEEDED'?'连接测试成功（演示）':finalStatus==='TIMED_OUT'?'连接测试超时（演示），可重新测试。':'连接测试失败（演示），请检查配置后重新测试。');
    },1400);
  }
  rows().forEach((row,index)=>{
    row.dataset.connectionId='10000000-0000-4000-8000-'+String(index+4).padStart(12,'0');row.dataset.revision='demo-revision-1';
    let button=row.querySelector('.connection-test');if(!button){button=document.createElement('button');button.type='button';button.className='action connection-test';row.cells[6].append(button);}
    button.onclick=()=>runTest(row);
  });
  window.addEventListener('storage',e=>{if(e.key===permissionKey)updatePermissions();});
  updatePermissions();
  apply();
})();
