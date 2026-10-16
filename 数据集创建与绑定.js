/* Local prototype state. No server writes, collection or code execution. */
(()=>{
'use strict';
const d=document,page=d.body.dataset.page,p=new URLSearchParams(globalThis.__mingceQuery??location.search),project=p.get('project')||'销售数据工程';
const $=s=>d.querySelector(s),all=s=>[...d.querySelectorAll(s)],id=s=>d.getElementById(s);
const key='mingce.datasets.v2.'+project;
function read(){try{const v=JSON.parse(sessionStorage.getItem(key)||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
function save(rows){try{sessionStorage.setItem(key,JSON.stringify(rows));return true;}catch{message('无法保存当前演示数据，请检查浏览器会话存储。');return false;}}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function route(file,extra={}){const [part,hash]=file.split('#'),[name,q]=part.split('?'),s=new URLSearchParams(q);for(const k of ['project','empty'])if(p.has(k))s.set(k,p.get(k));Object.entries(extra).forEach(([k,v])=>{if(v!=null)s.set(k,v);});return name+(s.size?'?'+s:'')+(hash?'#'+hash:'');}
function message(text){let n=id('creation-feedback');if(!n){n=d.createElement('div');n.id='creation-feedback';n.className='notice';n.setAttribute('role','status');($('.form')||$('main')||d.body).prepend(n);}n.textContent=text;}
function uid(prefix){return prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
const reserved=p.get('empty')==='1'?[]:['订单明细','退款明细','库存快照','渠道字典','客户维度','清洗后订单','标准客户表','销售日报'];
const unique=name=>!reserved.includes(name)&&!read().some(x=>x.name===name);
function setTitle(text){if($('h1'))$('h1').textContent=text;if($('.location-current'))$('.location-current').textContent=text;d.title=text+' · 明策·数据治理平台';}
function targetLinks(group){all('a[href]').forEach(a=>{if((a.getAttribute('href')||'').startsWith('补充-数据集列表.html'))a.href=route('补充-数据集列表.html',{group});});}
const manual=page==='14-新建数据集-表格录入.html',upload=page==='13-新建数据集-文件上传.html';
if(manual||upload){
 const group=manual&&p.get('group')==='processed'?'processed':'raw';
 setTitle((group==='processed'?'新建加工数据集':'新建原始数据集')+' · '+(manual?'手动创建':'文件导入'));targetLinks(group);
 if($('.resource-meta'))$('.resource-meta').insertAdjacentHTML('beforeend','<div><dt>数据分类</dt><dd>'+(group==='processed'?'加工数据':'原始数据')+'</dd></div>');
 if(manual){
  let fields=[{name:'store_code',type:'STRING'},{name:'group_name',type:'STRING'}],rows=[['S001','华东直营'],['S002','华东加盟']];
  const schema=all('.preview table')[0],data=all('.preview table')[1],buttons=all('.smallbtn');
  const render=()=>{
   schema.querySelector('thead').innerHTML='<tr><th>字段名</th><th>字段类型</th><th>操作</th></tr>';
   schema.querySelector('tbody').innerHTML=fields.map((f,i)=>'<tr><td><input class="unified-input" aria-label="字段名 '+(i+1)+'" data-field-name="'+i+'" value="'+esc(f.name)+'"></td><td><select class="unified-filter" aria-label="字段类型 '+(i+1)+'" data-field-type="'+i+'">'+MingceTypes.options.map(t=>'<option value="'+t+'" '+(t===f.type?'selected':'')+'>'+MingceTypes.label(t)+'</option>').join('')+'</select></td><td><button class="button" data-delete-field="'+i+'">删除字段</button></td></tr>').join('');
   data.querySelector('thead').innerHTML='<tr>'+fields.map(f=>'<th>'+esc(f.name||'未命名字段')+'</th>').join('')+'<th>操作</th></tr>';
   data.querySelector('tbody').innerHTML=rows.map((row,i)=>'<tr>'+fields.map((f,j)=>'<td><input class="unified-input" style="width:100%" aria-label="第 '+(i+1)+' 行 '+esc(f.name)+'" data-row="'+i+'" data-col="'+j+'" value="'+esc(row[j])+'"></td>').join('')+'<td><button class="button" data-delete-row="'+i+'">删除行</button></td></tr>').join('');
   all('[data-field-name]').forEach(n=>n.oninput=()=>{fields[+n.dataset.fieldName].name=n.value;data.querySelectorAll('thead th')[+n.dataset.fieldName].textContent=n.value;});
   all('[data-field-type]').forEach(n=>n.onchange=()=>fields[+n.dataset.fieldType].type=n.value);
   all('[data-row]').forEach(n=>n.oninput=()=>rows[+n.dataset.row][+n.dataset.col]=n.value);
   all('[data-delete-field]').forEach(n=>n.onclick=()=>{const i=+n.dataset.deleteField;if(rows.some(r=>r[i])&&!confirm('删除字段及已录入的该列数据？'))return;fields.splice(i,1);rows.forEach(r=>r.splice(i,1));render();});
   all('[data-delete-row]').forEach(n=>n.onclick=()=>{rows.splice(+n.dataset.deleteRow,1);render();});
   const notice=all('.form .notice').find(n=>n.id!=='creation-feedback');if(notice)notice.textContent=rows.length+' 行 · '+fields.length+' 个字段';
  };
  buttons.find(b=>b.textContent.includes('添加字段')).onclick=()=>{fields.push({name:'field_'+(fields.length+1),type:'STRING'});rows.forEach(r=>r.push(''));render();};
  buttons.find(b=>b.textContent.includes('添加行')).onclick=()=>{rows.push(fields.map(()=>''));render();};
  const clear=d.createElement('button');clear.className='button smallbtn';clear.id='clear-manual-rows';clear.textContent='清空数据行';clear.onclick=()=>{if(rows.some(r=>r.some(Boolean))&&!confirm('清空录入数据，保留字段结构？'))return;rows=[];render();};buttons.at(-1).after(clear);
  id('finish-dataset').textContent='创建数据集';
  const steps=$('.steps');if(steps)steps.innerHTML='<strong>1 定义字段与录入</strong><i>→</i><span>2 创建数据集</span>';
  render();
  id('finish-dataset').onclick=()=>{
   const name=id('dataset-new-name').value.trim();if(!name||name.length>100)return message('请填写 1～100 字的数据集名称');if(!unique(name))return message('当前项目存在同名数据集');
   if(!fields.length||fields.some(f=>!/^[_A-Za-z][_A-Za-z0-9]{0,63}$/.test(f.name)))return message('至少一个字段，字段名需以字母或下划线开头，限 64 位字母、数字或下划线');
   if(new Set(fields.map(f=>f.name)).size!==fields.length)return message('字段名不能重复');
   const actual=rows.filter(r=>r.some(v=>v!==''));
   for(const [i,row] of actual.entries())for(const [j,f] of fields.entries()){
    const value=row[j];if(value==='')continue;let ok=true;
    if(f.type==='BIGINT')ok=/^-?\d+$/.test(value)&&BigInt(value)>=-9223372036854775808n&&BigInt(value)<=9223372036854775807n;
    if(f.type==='DECIMAL(18,2)')ok=/^-?\d{1,16}(\.\d{1,2})?$/.test(value);
    if(f.type==='BOOLEAN')ok=['true','false'].includes(value);
    if(f.type==='DATE')ok=/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
    if(f.type==='DATETIME'){const v=value.replace(' ','T');ok=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'Z'))&&new Date(v+'Z').toISOString().slice(0,19)===v;}
    if(!ok)return message('第 '+(i+1)+' 行 '+f.name+' 不符合 '+MingceTypes.label(f.type));
   }
   const record={id:uid('manual-'),name,group,method:'手动创建',source:'表格录入',kind:'录入记录',input:actual.length+' 行 · '+fields.length+' 个字段',state:actual.length?'可用':'待产出',owner:'张敏',updated:'刚刚',description:'',schema:fields,rows:actual,hasData:actual.length>0,producer:null,writable:true};
   if(save([...read(),record]))location.href=p.get('returnTo')==='code'?route('17-创建并绑定数据.html',{bindOutput:record.id,returnFromManual:'1'}):route('补充-数据集列表.html',{group});
  };
 }
 if(upload){
  all('.preview tbody tr').forEach(row=>{const cell=row.children[1];cell.innerHTML='<select class="unified-filter" aria-label="'+esc(row.children[0].textContent)+' 类型">'+MingceTypes.options.map(t=>'<option value="'+t+'">'+MingceTypes.label(t)+'</option>').join('')+'</select>';});
 }
}
if(page==='补充-数据集列表.html'){
 // Merge this session's manually created targets; do not add duplicates on refresh.
 read().forEach(record=>{const i=datasets.findIndex(x=>x.id===record.id);if(i<0)datasets.push(record);else datasets[i]=record;});
 const oldRender=render;render=function(){oldRender();const count=datasets.length;$('.content .total').textContent=count;all('.category.active .count').forEach(n=>n.textContent=count);id('create-dataset').textContent='＋ 新建数据集';all('#dataset-rows tr').forEach(row=>{const record=datasets.find(x=>x.id===row.dataset.id);if(record?.state==='待产出')row.children[3].querySelector('.status').classList.add('wait');});};
 if(!all('#status-filter option').some(o=>o.value==='待产出')){const o=d.createElement('option');o.value=o.textContent='待产出';id('status-filter').append(o);}
 activate(group);
 id('create-dataset').onclick=()=>{
  id('create-title').textContent=group==='raw'?'新建原始数据集':'新建加工数据集';
  const options=group==='raw'?[['文件导入','13-新建数据集-文件上传.html?group=raw'],['手动创建（表格录入）','14-新建数据集-表格录入.html?group=raw'],['创建采集任务','07-选择连接.html']]:[['手动创建（表格录入）','14-新建数据集-表格录入.html?group=processed'],['创建代码任务','17-创建并绑定数据.html'],['转换流程（暂未开放）',null]];
  id('create-options').replaceChildren();options.forEach(([label,file])=>{const a=d.createElement(file?'a':'button');a.className='creation-option';a.textContent=label;if(file)a.href=route(file);else{a.disabled=true;a.setAttribute('aria-disabled','true');}id('create-options').append(a);});id('create-dialog').showModal();
 };

}
if(page==='17-创建并绑定数据.html'){
 const table=all('.form table.list').at(-1),nameInput=$('input[aria-label="输出名称"]'),rule=table.querySelector('tbody tr').children[2];
 const controls=d.createElement('div');controls.className='toolbar';controls.style.marginBottom='16px';controls.innerHTML='<label>输出方式 <select id="output-mode" class="unified-filter"><option value="new">新建加工数据集</option><option value="existing">绑定已有加工数据集</option></select></label>';
 table.before(controls);
 const picker=d.createElement('div');picker.id='output-existing-panel';picker.hidden=true;picker.innerHTML='<label class="label" for="existing-output">已有加工数据集</label><select id="existing-output" class="unified-filter" style="min-width:300px"></select><a id="create-manual-output" class="button" style="margin-left:12px">手动创建数据集</a><p id="output-empty" class="hint"></p><label id="replace-warning" hidden><input type="checkbox" id="replace-confirm"> 我已知悉：绑定不立即写入，之后成功运行将替换当前数据，历史版本保留</label>';
 table.before(picker);id('create-manual-output').href=route('14-新建数据集-表格录入.html',{group:'processed',returnTo:'code'});
 id('create-manual-output').onclick=e=>{try{sessionStorage.setItem(key+'.codeDraft',JSON.stringify(all('.form input[aria-label]').map(n=>[n.getAttribute('aria-label'),n.value])));}catch{e.preventDefault();message('无法保存创建上下文，请先复制当前输入');}};
 if(p.get('returnFromManual')==='1'){try{JSON.parse(sessionStorage.getItem(key+'.codeDraft')||'[]').forEach(([label,value])=>{const n=all('.form input[aria-label]').find(n=>n.getAttribute('aria-label')===label);if(n)n.value=value;});}catch{}}
 let newOutputName=nameInput.value;
 const inputIds=['orders','customers'];
 function eligible(r){return r.group==='processed'&&r.writable===true&&!r.producer&&!inputIds.includes(r.id);}
 function refresh(){const records=read().filter(eligible),selected=id('existing-output').value;id('existing-output').innerHTML='<option value="">请选择已有加工数据集</option>'+records.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.name)+' · '+(r.hasData?'已有数据':'待产出')+'</option>').join('');id('existing-output').value=selected;id('output-empty').textContent=records.length?'仅列出有写入权且未被生产任务占用的加工数据集':'暂无可绑定的加工数据集，可先手动创建';}
 function update(){const existing=id('output-mode').value==='existing',r=read().find(x=>x.id===id('existing-output').value);picker.hidden=!existing;nameInput.readOnly=existing;if(existing)nameInput.value=r?.name||'';else nameInput.value=nameInput.value||'每日销售汇总';id('replace-warning').hidden=!(existing&&r?.hasData);id('replace-confirm').checked=false;let structure=id('target-schema');if(!structure){structure=d.createElement('div');structure.id='target-schema';structure.className='panel';picker.append(structure);}structure.hidden=!(existing&&r);if(r)structure.textContent='目标结构：'+(r.schema||[]).map(f=>f.name+' · '+MingceTypes.label(f.type)).join('；');rule.textContent=existing?'绑定现有对象；成功运行后更新数据':'新建加工数据集；首次成功后可用';}
 id('output-mode').onchange=()=>{if(id('output-mode').value==='existing')newOutputName=nameInput.value;else nameInput.value=newOutputName;refresh();update();};id('existing-output').onchange=update;
 const create=all('.actions a').find(a=>a.textContent==='创建代码任务');
 create.onclick=e=>{
  e.preventDefault();const name=$('input[aria-label="代码任务名称"]').value.trim(),out=nameInput.value.trim(),refs=all('input').filter(x=>/引用名称/.test(x.getAttribute('aria-label')||'')).map(x=>x.value.trim());
  if(!name||name.length>100||!out||out.length>100||refs.some(x=>!/^[_A-Za-z][_A-Za-z0-9]{0,63}$/.test(x))||new Set(refs).size!==refs.length)return message('请填写任务与输出名称，引用名称限 64 位且合法、不重复');
  const rows=read(),mode=id('output-mode').value;let record=rows.find(r=>r.id===id('existing-output').value);
  if(mode==='existing'){if(!record||!eligible(record))return message('请选择仍可绑定的加工数据集');if(record.hasData&&!id('replace-confirm').checked)return message('请确认后续运行替换数据的规则');}
  else{if(!unique(out))return message('数据集名称已存在，请改名或选择绑定已有加工数据集');record={id:uid('output-'),name:out,group:'processed',hasData:false,state:'待产出',writable:true,owner:'张敏',description:'',schema:[],rows:[]};rows.push(record);}
  const taskId=uid('code-');record.producer=taskId;record.producerName=name;record.method=record.kind='代码任务';record.source=name;record.input='订单明细、客户信息';record.updated='刚刚';
  if(!save(rows))return;
  const dest=route('18-开发准备.html',{name,output:record.name,inputRefs:refs.slice(0,-1).join(','),outputRef:refs.at(-1),outputId:record.id,outputMode:mode,taskId});create.href=dest;location.href=dest;
 };
 refresh();if(p.get('bindOutput')){id('output-mode').value='existing';id('existing-output').value=p.get('bindOutput');}update();
}
if(/^(18-|19-|20-|补充-04-)/.test(page)&&p.get('outputId')){
 all('a[href]').forEach(a=>{if(/^(18-|19-|20-|补充-04-)/.test(a.getAttribute('href')))a.href=route(a.getAttribute('href'),Object.fromEntries(['name','output','inputRefs','outputRef','outputId','outputMode','taskId'].filter(k=>p.has(k)).map(k=>[k,p.get(k)])));});
 const row=read().find(x=>x.id===p.get('outputId'));if(row){all('td').forEach(cell=>{if(cell.textContent.trim()==='每日销售汇总'||cell.textContent.trim()===p.get('output'))cell.textContent=row.name;});const host=$('.form');if(host){const n=d.createElement('div');n.className='notice';n.textContent='输出目标：'+row.name+' · '+(p.get('outputMode')==='existing'?'绑定已有加工数据集':'新建加工数据集')+' · 保存配置不写入数据';host.prepend(n);}}
}
if(globalThis.MingceTypes){MingceTypes.decorate(d);if(typeof MutationObserver!=='undefined'){let busy=false;new MutationObserver(()=>{if(busy)return;busy=true;MingceTypes.decorate(d);busy=false;}).observe(d.body,{childList:true,subtree:true});}}
})();
