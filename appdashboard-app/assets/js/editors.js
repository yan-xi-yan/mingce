import {validateCodeBindings,codeBindingIssue,codeOutputs,inputReference} from './code-bindings.js';
import {SourcePicker} from './source-picker.js';
import {databaseTypes,databaseType} from './database-types.js';
import {downloadCodeTemplate} from './code-template.js';
import {read,write,key,projectKey,connections,tasks,uid,engine,catalog,modeNames} from './domain/store.js';
import {actor,users,cap,permissions,permissionKey,canCreate,assertWrite,datasets,saveDataset,codes,saveCode,flows,readPlans,targets,dataTypes} from './domain/domain.js';
import {armPlan} from './domain/execution-runtime.js';
import {csv,value as typedValue} from './domain/import-rules.js';
import {escape as e,icon,badge,button,alert,field,input,select,textarea,checkbox,table} from './html.js';
import {memberIdentity} from './people.js';
import {storePackage} from './code-packages.js';
import {fileUpload,selectedFile,bindFileUploads} from './file-upload.js';
import {mountFilterSelects,disposeFilterSelects} from './filter-selects.js';
import {mountDatePickers,disposeDatePickers} from './date-pickers.js';

// A native HTML form controller; there is no virtual DOM or UI framework.
export class Editor {
 constructor(host,{kind,record,project,projects,done}){
  this.host=host;this.kind=kind;this.record=record?.id?record:undefined;this.project=project;this.projects=projects;this.done=done;this.dirty=false;this.step=0;this.tested=false;this.busy=false;this.error='';this.imported=null;this.disposed=false;this.fileRequest=0;
  const r=record||{},p=project||{name:'',empty:true};
  this.f=structuredClone({name:r.name||'',description:r.description||'',host:r.host||'',connectorType:databaseType(r),port:r.port||databaseTypes[databaseType(r)]?.port||'3306',database:r.database||'',user:r.user||'',password:'',connection:r.connection||connections(p)[0]?.name||'',tables:r.tables||[],fields:r.fields||{},outputs:r.outputs||{},mode:r.mode||'full',incrementalField:r.incrementalField||'',inputs:r.inputs||[],output:r.output||'',outputMode:r.outputMode||'new',outputId:r.outputId||'',replaceAcknowledged:r.replaceAcknowledged||false,fileName:r.fileName||'',packageId:r.packageId||'',task:r.task||'',planMode:r.mode||'time',watch:r.watch||[],combo:r.combo||'any',member:r.id||'',role:r.role||'developer',download:r.download||false,datasetMode:'manual',group:'raw',csvHeader:'header',schema:'id:BIGINT\nname:STRING',rows:'1,示例',rule:r.rule||engine.defaults('08:00')});
  if(kind==='plan')for(const name of ['start','end','once'])this.f.rule[name]=(this.f.rule[name]||'').replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):\d{2}$/, '$1');
  this.f.outputBindings=kind==='code'?(codeOutputs(r).length?structuredClone(codeOutputs(r)):[{name:'',mode:'new',datasetId:'',reference:'output_1',replaceAcknowledged:false}]):[];
  this.f.inputReferences=structuredClone(r.inputReferences||{});this.f.inputs.forEach((id,i)=>{this.f.inputReferences[id]??='input_'+(i+1);});
  this.newCodeOutput=this.f.outputMode==='new'?this.f.output:'';
  this.f.packageSize=r.packageSize;this.codeBindingSignature=this.bindingSignature();
  this.uploadBusy=false;this.uploadError='';this.uploadNote='';this.fileSize=r.packageSize;this.unbindUploads=bindFileUploads(host);
  this.inputHandler=event=>this.onInput(event);this.changeHandler=event=>this.onChange(event);this.clickHandler=event=>this.onClick(event);this.submitHandler=event=>{event.preventDefault();this.check(()=>{this.sync();if(this.kind==='task'&&this.step<3){this.taskValid(this.step);this.moveStep(this.step+1);}else this.save();});};
  this.footer=document.querySelector('#workspace-modal-footer');this.footer.addEventListener('click',this.clickHandler);
  host.addEventListener('input',this.inputHandler);host.addEventListener('change',this.changeHandler);host.addEventListener('click',this.clickHandler);host.addEventListener('submit',this.submitHandler);this.render();
 }
 dispose(){disposeDatePickers(this.host);disposeFilterSelects(this.host);this.sourcePicker?.dispose();this.unbindUploads?.();this.disposed=true;clearTimeout(this.timer);this.footer.removeEventListener('click',this.clickHandler);this.footer.hidden=true;this.footer.innerHTML='';this.host.removeEventListener('input',this.inputHandler);this.host.removeEventListener('change',this.changeHandler);this.host.removeEventListener('click',this.clickHandler);this.host.removeEventListener('submit',this.submitHandler);}
 check(fn){try{fn();this.error='';this.showError();}catch(error){this.error=error.message;this.showError();}}
 showError(){const host=this.host.querySelector('#form-error');if(host){host.innerHTML=this.error?alert(this.error,'danger'):'';if(this.error){host.focus();host.scrollIntoView({block:'nearest'});}}}
 sync(){
  const form=this.host.querySelector('form');if(!form)return;const data=new FormData(form);
  for(const element of form.elements){if(element.name?.startsWith('import.')){const [,part,index]=element.name.split('.');if(this.imported)this.imported.schema[Number(index)][part]=element.value;continue;}if(!element.name||['checkbox','file','submit','button'].includes(element.type)||element.type==='radio'&&!element.checked)continue;const name=element.name;
   if(name.startsWith('codeout.')){const [,index,property]=name.split('.');this.f.outputBindings[+index][property]=element.value;}
   else if(name.startsWith('coderef.'))this.f.inputReferences[name.slice(8)]=element.value;
   else if(name.startsWith('rule.'))this.f.rule[name.slice(5)]=element.dataset.picker==='datetime'?element.value.trim().replace(' ','T'):element.value;
   else if(name==='scheduleTime')continue;
   else if(name.startsWith('output:'))this.f.outputs[name.slice(7)]=element.value;
   else this.f[name]=element.value;
  }
  if(this.kind==='code'){if(form.querySelector('[name="inputs"]'))this.f.inputs=data.getAll('inputs');for(const [i,o]of this.f.outputBindings.entries()){o.replaceAcknowledged=data.has('codeack.'+i);}this.f.output=this.f.outputBindings[0]?.name||'';}
  if(form.querySelector('[name="replaceAcknowledged"]:not(:disabled)'))this.f.replaceAcknowledged=data.has('replaceAcknowledged');
  for(const group of ['inputs','tables','watch'])if(form.querySelector(`[name="${group}"]:not(:disabled)`))this.f[group]=data.getAll(group);
  for(const t of this.f.tables)if(form.querySelector(`[name="fields:${t}"]`))this.f.fields[t]=data.getAll('fields:'+t);
  for(const group of ['weekdays','months'])if(form.querySelector(`[name="rule.${group}"]`))this.f.rule[group]=data.getAll('rule.'+group).map(Number);
  if(form.querySelector('[name="download"]'))this.f.download=data.has('download');
  if(form.querySelector('[name="scheduleTime"]'))this.f.rule.times=data.getAll('scheduleTime').join(',');
 }
 onInput(event){if(['connectorType','outputMode'].includes(event.target.name))return;if(['file','checkbox','radio'].includes(event.target.type)||!event.target.name)return;this.dirty=true;this.sync();if(['host','port','database','user','password'].includes(event.target.name)){this.tested=false;const test=this.host.querySelector('[data-form-action="test"]');if(test)test.textContent='测试连接（演示）';}if(this.kind==='code')this.updateCodeControls();if(this.kind==='plan')this.updatePreview();}
 onChange(event){
  const target=event.target;if(!target.name)return;this.dirty=true;
  if(target.type==='file'){this.readFile(target);return;}
  const oldTables=[...this.f.tables],oldType=this.f.connectorType;this.sync();
  if(target.name==='connectorType'){if(!this.f.port||this.f.port===databaseTypes[oldType]?.port)this.f.port=databaseTypes[this.f.connectorType]?.port||'';this.tested=false;this.render();return;}
  if(this.kind==='code'){
   if(target.name.startsWith('codeout.')){const [,index,property]=target.name.split('.'),o=this.f.outputBindings[+index];if(property==='mode'){o.name='';o.datasetId='';o.replaceAcknowledged=false;}if(property==='datasetId'){o.name=datasets(this.project).find(data=>data.id===o.datasetId)?.name||'';o.replaceAcknowledged=false;}if(['mode','datasetId'].includes(property)){this.render();return;}}
   if(target.name==='inputs'){const used=new Set([...Object.values(this.f.inputReferences),...this.f.outputBindings.map(o=>o.reference)]);for(const id of this.f.inputs)if(!Object.hasOwn(this.f.inputReferences,id)){let n=1;while(used.has('input_'+n))n++;this.f.inputReferences[id]='input_'+n;used.add('input_'+n);}this.render();return;}this.updateCodeControls();
  }
  if(target.name==='tables'){for(const table of this.f.tables)if(!oldTables.includes(table)){this.f.fields[table]=[...catalog[table]];this.f.outputs[table]=table+'_raw';}}
  if(this.kind==='task'&&target.name==='mode')this.sourcePicker?.ensureRequired();
  if(target.name==='task'){this.f.watch=[];if(targets(this.project).find(t=>t.id===this.f.task)?.type==='batch')this.f.planMode='time';}
  if(target.name==='rule.kind'&&['second','minute','hour'].includes(this.f.rule.kind)&&!this.f.rule.start)this.f.rule.start=engine.format(Date.now()+60000,this.f.rule.zone).slice(0,16).replace(' ','T');
  if(target.name==='csvHeader'&&this.csvRaw!=null){this.parseCSV();return;}
  if(target.name==='datasetMode'&&this.uploadBusy){this.fileRequest++;this.uploadBusy=false;}
  const structural=['tables','mode','datasetMode','task','planMode','rule.kind','rule.monthMode','rule.dayInterval','member'];
  if(structural.includes(target.name))this.render();else if(this.kind==='plan')this.updatePreview();
 }
 async readFile(target){
  const file=target.files[0];if(!file)return;const request=++this.fileRequest;
  if(target.name==='csvFile'){this.imported=null;this.csvRaw=null;this.f.fileName='';this.fileSize=undefined;}
  this.uploadError='';this.uploadNote='';this.uploadBusy=true;this.loadingCode=target.name==='codeFile';if(target.name==='csvFile')this.render();else this.updateUpload();this.footer.querySelector('[type="submit"]').disabled=true;
  try{
   if(target.files.length!==1)throw Error('每次只能选择一个文件，请重新选择。');
   if(target.name==='codeFile'){
    if(!/\.zip$/i.test(file.name)||file.size===0||file.size>50*1024*1024)throw Error('请选择非空且不超过 50 MB 的 ZIP 文件');
    const packageId=await storePackage(file,this.project.name);if(this.disposed||request!==this.fileRequest)return;this.f.packageId=packageId;this.f.fileName=file.name;this.fileSize=file.size;this.f.packageSize=file.size;
   }else{
    if(!/\.csv$/i.test(file.name)||file.size>10*1024*1024)throw Error('请选择不超过 10 MiB 的 CSV 文件');
    const raw=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());if(this.disposed||request!==this.fileRequest)return;if(raw.includes('\0'))throw Error('文件包含空字节，不是有效 CSV 文本');
    this.csvRaw=raw.replace(/^\uFEFF/,'');this.f.fileName=file.name;this.fileSize=file.size;if(!this.parseCSV())return;
   }
   this.error='';this.showError();
  }catch(error){if(this.disposed||request!==this.fileRequest)return;this.error=target.name==='csvFile'&&error instanceof TypeError?'文件不是有效 UTF-8 编码':error.message;this.uploadError=this.error;this.showError();}
  finally{if(!this.disposed&&request===this.fileRequest){this.loadingCode=false;this.uploadBusy=false;this.updateUpload();this.footer.querySelector('[type="submit"]').disabled=false;}}
 }
 updateUpload(){
  const list=this.host.querySelector('#file-status'),feedback=this.host.querySelector('#upload-feedback');if(!list||!feedback)return;
  const code=this.kind==='code',name=code?'codeFile':'csvFile';
  const status=code?(this.f.packageId?(this.record?.packageId===this.f.packageId?'已保存的代码包':'已选择，保存配置后生效'):'仅记录文件名，请重新选择文件'):this.imported?'已解析 '+this.imported.rows.length+' 行 · '+this.imported.schema.length+' 个字段':'解析未完成';
  list.innerHTML=selectedFile({name,fileName:this.f.fileName,size:this.fileSize,status});
  this.host.querySelector('[data-upload-zone]')?.setAttribute('aria-busy',String(this.uploadBusy));
  feedback.innerHTML=this.uploadBusy?'<div class="d-flex align-items-center gap-2 text-muted small mt-2"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span>'+ (code?'正在读取代码包…':'正在读取并解析 CSV…')+'</div>':this.uploadError?'<p class="text-danger small mt-2 mb-0" role="alert">'+e(this.uploadError)+(code&&this.f.fileName?' 原代码包尚未替换。':'')+'</p>':this.uploadNote?alert(this.uploadNote,'warning'):'';
 }
 parseCSV(){
  this.imported=null;try{
   const records=csv(this.csvRaw),first=records[0],header=this.f.csvHeader==='header';
   if(first.length>200)throw Error('最多支持 200 个字段');
   const rows=header?records.slice(1):records;
   if(rows.some(row=>row.length!==first.length))throw Error('数据列数与字段结构不一致');
   this.imported={schema:first.map((name,i)=>({name:header?name.trim():'field_'+(i+1),type:'STRING'})),rows};
   this.error='';this.uploadError='';this.render();return true;
  }catch(error){this.error=error.message;this.uploadError=error.message;this.render();return false;}
 }
 importPreview(){const data=this.imported;if(!data)return '';
  return table([{title:'字段名称',render:(f)=>input('字段名称 '+(data.schema.indexOf(f)+1),'import.name.'+data.schema.indexOf(f),f.name,{extra:'maxlength="100"'})},{title:'字段类型',render:(f)=>select('字段类型 '+(data.schema.indexOf(f)+1),'import.type.'+data.schema.indexOf(f),f.type,dataTypes.map(value=>({value,label:value})))},{title:'首条数据',render:f=>e(data.rows[0]?.[data.schema.indexOf(f)]??'—')}],data.schema,{search:false,id:'import-fields'})+alert('已解析 '+data.rows.length+' 行、'+data.schema.length+' 个字段；请确认字段名称和类型。')+table(data.schema.map((f,i)=>({title:f.name||'未命名字段',render:row=>e(row[i])})),data.rows.slice(0,20),{search:false,id:'import-preview',empty:'当前文件仅包含字段结构，没有数据行。'});
 }
 onClick(event){const target=event.target.closest('[data-form-action]');if(!target)return;const command=target.dataset.formAction;
  if(command==='add-time'||command==='remove-time'){this.sync();const times=this.f.rule.times.split(',');if(command==='add-time')times.push('');else times.splice(+target.dataset.index,1);this.f.rule.times=times.join(',');this.dirty=true;this.render();if(command==='add-time'){const added=[...this.host.querySelectorAll('[name="scheduleTime"]')].at(-1);added?.scrollIntoView({block:'nearest'});added?.focus({preventScroll:true});}}
  if(command==='remove-file'){this.sync();this.fileRequest++;this.uploadBusy=false;this.loadingCode=false;this.uploadError='';this.uploadNote='';this.error='';this.fileSize=undefined;this.f.fileName='';if(target.dataset.fileName==='codeFile'){this.f.packageId='';this.f.packageSize=undefined;}else{this.imported=null;this.csvRaw=null;}this.dirty=true;this.render();this.host.querySelector('[data-upload-zone]')?.focus({preventScroll:true});}
  if(command==='add-code-output'){this.sync();const used=new Set([...Object.values(this.f.inputReferences),...this.f.outputBindings.map(o=>o.reference)]);let n=1;while(used.has('output_'+n))n++;this.f.outputBindings.push({name:'',mode:'new',datasetId:'',reference:'output_'+n,replaceAcknowledged:false});this.dirty=true;this.render();}
  if(command==='remove-code-output'){this.sync();this.f.outputBindings.splice(+target.dataset.index,1);this.dirty=true;this.render();}
  if(command==='download-template')this.check(()=>{this.sync();downloadCodeTemplate(this.project,{...this.f,id:this.record?.id});});
  if(command==='back'){this.sync();this.moveStep(this.step-1);}
  if(command==='test')this.check(()=>{this.sync();this.connectionValid();this.busy=true;this.render();this.timer=setTimeout(()=>{if(this.disposed)return;this.busy=false;this.tested=true;this.render();},400);});
 }
 moveStep(step){this.step=step;this.error='';this.render();this.host.scrollTop=0;const heading=this.host.querySelector('.wizard-step.active');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});}
 connectionChanged(){const f=this.f,r=this.record;return !r||f.connectorType!==databaseType(r)||['host','port','database','user'].some(key=>String(f[key]).trim()!==String(r[key]||'').trim())||!!f.password;}
 connectionValid(){const f=this.f;if(!databaseTypes[f.connectorType])throw Error('请选择数据库类型');if(!f.host.trim()||!f.database.trim()||!f.user.trim()||!this.record&&!f.password)throw Error('请完整填写连接地址、数据库、用户名和密码');if(!/^\d+$/.test(f.port)||Number(f.port)<1||Number(f.port)>65535)throw Error('端口应为 1～65535 的整数');}
 taskValid(stage){const f=this.f;if(stage>=0&&!connections(this.project).some(c=>c.name===f.connection))throw Error('请选择当前项目内的连接');if(stage>=1&&(!f.tables.length||f.tables.some(t=>!f.fields[t]?.length)))throw Error('至少选择一个源表，并为每个源表选择字段');if(stage>=2&&f.mode==='incremental'&&(!f.incrementalField||f.tables.some(t=>!f.fields[t]?.includes(f.incrementalField))))throw Error('递增字段必须存在于每个已选源表和采集字段中');}
 same(rows){if(rows.some(x=>x.id!==this.record?.id&&x.name===this.f.name.trim()))throw Error('当前项目已有同名记录');}
 save(){
  if(this.uploadBusy)throw Error('文件正在读取，请稍候。');
  const f=this.f,r=this.record,p=this.project,kind=this.kind;
  if(kind==='member'){this.saveMember();return;}
  if(!f.name.trim()||f.name.trim().length>100)throw Error('名称需为 1～100 个字符');
  if(kind==='project'){
   if(!canCreate())throw Error('当前身份不可创建项目');if(f.name.trim().length<2||f.name.trim().length>50)throw Error('项目名称需为 2～50 个字符');if(read(projectKey,this.projects).some(x=>x.name===f.name.trim()))throw Error('项目名称已存在');
   write(projectKey,[...read(projectKey,this.projects),{name:f.name.trim(),description:f.description,empty:true}]);localStorage.setItem(permissionKey(f.name.trim()),JSON.stringify({version:1,revision:1,archived:false,members:[{id:actor(),role:'owner',download:true}],creators:[],schedules:[],events:[]}));this.done('项目已创建，可从项目列表进入工作区');return;
  }
  assertWrite(p.name);
  if(kind==='connection'){
   this.same(connections(p));this.connectionValid();if(!this.tested&&this.connectionChanged())throw Error('连接配置已变化，请先测试连接');
   const row={id:r?.id||uid(),name:f.name.trim(),description:f.description,connectorType:f.connectorType,host:f.host.trim(),database:f.database.trim(),port:f.port,user:f.user.trim(),test:this.tested?'成功（演示）':r?.test||'待测试'};
   if(r&&tasks(p).some(t=>t.connection===r.name)&&row.name!==r.name)throw Error('此连接已被采集任务引用，不能修改名称');write(key(p.name,'connections'),[...connections(p).filter(c=>c.id!==r?.id),row]);
  }
  if(kind==='task'){
   this.same(tasks(p));this.taskValid(2);const outputs=Object.fromEntries(f.tables.map(t=>[t,String(f.outputs[t]||'').trim()])),names=Object.values(outputs);
   if(names.some(n=>!n)||new Set(names).size!==names.length)throw Error('请为每个源表设置不同的输出名称');if(names.some(n=>datasets(p).some(d=>d.name===n&&d.producer!==r?.id)))throw Error('输出名称已被数据集占用');
   write(key(p.name,'tasks'),[...tasks(p).filter(t=>t.id!==r?.id),{id:r?.id||uid(),name:f.name.trim(),connection:f.connection,mode:f.mode,incrementalField:f.incrementalField,tables:f.tables,fields:f.fields,outputs,published:f.mode==='continuous',revision:(r?.revision||0)+1}]);
  }
  if(['code','flow'].includes(kind)){
   if(kind==='code')validateCodeBindings({...f,id:r?.id},datasets(p),codes(p));
   this.same(kind==='code'?codes(p):flows(p));const available=datasets(p);if(!f.inputs.length||f.inputs.some(id=>!available.some(d=>d.id===id)))throw Error('请绑定当前项目的数据集');if(!f.output.trim())throw Error('请填写输出数据集名称');if(kind==='flow'&&available.some(d=>d.name===f.output.trim()&&(d.producer!==r?.id||f.inputs.includes(d.id))))throw Error('输出已被占用或与输入相同');
   const job={...r,id:r?.id||uid(),name:f.name.trim(),description:f.description,inputs:f.inputs,inputReferences:f.inputReferences,outputBindings:f.outputBindings,output:f.output.trim(),outputMode:f.outputMode,outputId:f.outputId,replaceAcknowledged:f.replaceAcknowledged,fileName:f.fileName,packageId:f.packageId,packageSize:f.packageSize,configStatus:f.fileName?'READY':'DRAFT',published:false,revision:(r?.revision||0)+1};
   if(kind==='code')saveCode(p,job);else write(key(p.name,'flows'),[...flows(p).filter(t=>t.id!==job.id),job]);
  }
  if(kind==='dataset'){
   let schema,rows;if(f.datasetMode==='csv'){if(!this.imported)throw Error('请先选择并解析 CSV 文件');({schema,rows}=this.imported);}
   else{schema=f.schema.trim().split('\n').map(line=>{const [name,type='STRING']=line.trim().split(':');if(!/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(name)||!dataTypes.includes(type.trim()))throw Error('字段格式应为 字段名:类型，支持 STRING、BIGINT、DECIMAL(18,2)、DATE、DATETIME、BOOLEAN');return {name,type:type.trim()};});rows=f.rows.trim()?csv(f.rows):[];}
   schema=schema.map(field=>({...field,name:field.name.trim()}));if(!schema.length||schema.some(field=>!field.name||field.name.length>100)||new Set(schema.map(x=>x.name)).size!==schema.length)throw Error('字段名称不得为空或重复');if(rows.some(row=>row.length!==schema.length))throw Error('每行数据列数必须与字段数一致');rows=rows.map((row,index)=>row.map((cell,i)=>{try{return typedValue(String(cell),schema[i].type);}catch(error){throw Error('第 '+(index+1)+' 条数据，字段 '+schema[i].name+'：'+error.message);}}));
   const hasVersion=f.datasetMode==='csv'||rows.length>0;const now=new Date().toISOString();
   saveDataset(p,{name:f.name.trim(),group:f.datasetMode==='csv'?'raw':f.group,schema,rows,description:f.description,method:f.datasetMode==='csv'?'文件导入':'手动录入',source:f.datasetMode==='csv'?f.fileName:'手动录入',state:hasVersion?'可用':'待录入',hasData:rows.length>0,rowCount:rows.length,versionNumber:hasVersion?1:null,versions:hasVersion?[{version:1,time:now,rows:rows.length,source:f.fileName||'手动录入',schema,data:rows}]:[]});
  }
  if(kind==='plan'){
   this.same(readPlans(p));const selected=targets(p).find(t=>t.id===f.task);if(!selected)throw Error('请选择已就绪或已发布且支持调度的任务');if(f.planMode==='event'&&(selected.type==='batch'||!f.watch.length||f.watch.some(id=>!selected.inputs.includes(id))))throw Error('请选择任务输入数据集作为监听对象');if(f.planMode!=='event'&&!engine.compute(f.rule).labels.length)throw Error('当前规则没有未来触发时间');
   const plan=armPlan(p,{...r,id:r?.id||uid(),name:f.name.trim(),description:f.description,task:f.task,mode:f.planMode,rule:f.rule,watch:f.watch,combo:f.combo,enabled:r?.enabled||false,executionIdentity:'PROJECT_RUNTIME',createdBy:r?.createdBy||actor(),records:r?.records||[]});write(key(p.name,'plans'),[...readPlans(p).filter(x=>x.id!==r?.id),plan]);
  }
  this.done(kind==='code'?(f.fileName?'代码配置已保存，任务已就绪，可运行或创建调度':'任务配置已保存，请下载开发模板并上传代码包'):kind==='task'&&f.mode==='continuous'?'采集配置已保存，可启动采集':kind==='plan'&&!r?'调度计划已创建，当前为停用状态':'配置已保存'+(['task','code','flow'].includes(kind)?'，请重新校验发布':''));
 }
 saveMember(){const f=this.f,p=this.project,c=cap(p.name),state=permissions(p.name),current=state.members.find(m=>m.id===f.member);if(!c.manage)throw Error('当前角色无权管理成员');if(!users.some(u=>u.id===f.member))throw Error('请选择组织成员');if(!['admin','developer','viewer'].includes(f.role)||c.role==='admin'&&f.role==='admin')throw Error('无权分配此角色');if(current?.role==='owner'||current?.id===actor()||c.role==='admin'&&current?.role==='admin')throw Error('不可修改负责人、自己或同级管理员');if(!this.record&&current)throw Error('该成员已在项目中');localStorage.setItem(permissionKey(p.name),JSON.stringify({...state,revision:state.revision+1,members:[...state.members.filter(m=>m.id!==f.member),{id:f.member,role:f.role,download:f.download}],events:[{at:new Date().toISOString(),action:this.record?'调整权限':'添加成员',actor:actor(),member:f.member},...state.events]}));this.done('成员权限已保存');}
 render(){
  const focused=this.host.contains(document.activeElement)?document.activeElement:null,scroll=this.host.scrollTop;
  const selectFocus=disposeFilterSelects(this.host);
  disposeDatePickers(this.host);
  this.sourcePicker?.dispose();
  const {kind,record:r,project:p,f,step}=this,options=map=>Object.entries(map).map(([value,label])=>({value,label}));
  const text=(label,name,props={})=>input(label,name,f[name],props);let body='';
  if(kind!=='member'&&(kind!=='task'||step===0||step===3))body+=text(kind==='project'?'项目名称':kind==='connection'?'连接名称':kind==='dataset'?'数据集名称':kind==='plan'?'计划名称':'任务名称','name',{required:true,extra:`maxlength="${kind==='project'?50:100}"`});
  if(kind==='project')body+=textarea('项目说明','description',f.description);
  if(kind==='connection')body+=`<fieldset ${this.busy?'disabled':''}><div class="mc-form-grid">${select('数据库类型','connectorType',f.connectorType,Object.entries(databaseTypes).map(([value,type])=>({value,label:type.label})),{hint:'根据客户数据库选择类型；默认端口为 '+databaseTypes[f.connectorType]?.port+'，可按实际配置修改。'})}${text('连接地址','host',{required:true})}${text('端口','port',{required:true,extra:'inputmode="numeric"'})}${text('数据库名称','database',{required:true})}${text('用户名','user',{required:true})}${text('密码','password',{type:'password',required:!r,placeholder:r?'留空保留原有凭据':'',extra:'autocomplete="new-password"'})}</div>${alert('测试与保存均为本地演示；密码只在表单中使用，不保存到浏览器存储。')}<button type="button" class="btn btn-outline-primary" data-form-action="test" ${this.busy?'disabled':''}>${this.busy?'测试中…':this.tested?'测试成功（演示）':'测试连接（演示）'}</button></fieldset>`;
  if(kind==='task'){
   body+=`<div class="wizard-steps mb-4">${['选择连接','选择源表与字段','采集规则','确认输出'].map((label,i)=>`<div class="wizard-step ${step===i?'active':step>i?'completed':''}"><div class="wizard-step-icon"><span class="wizard-step-number">${i+1}</span><i class="bi bi-check-lg wizard-step-check" aria-hidden="true"></i></div><div class="wizard-step-label">${label}</div></div>`).join('')}</div>`;
   if(step===0)body+=select('来源连接','connection',f.connection,[{value:'',label:'请选择连接'},...connections(p).map(c=>({value:c.name,label:c.name+' · '+c.database}))])+(!connections(p).length?alert('当前项目没有连接，请先关闭表单并新建数据连接。','warning'):'');
   if(step===1){this.sourcePicker??=new SourcePicker(f,()=>{this.dirty=true;this.error='';this.showError();});body+=this.sourcePicker.markup(connections(p).find(c=>c.name===f.connection));}
   if(step===2)body+=select('采集方式','mode',f.mode,options(modeNames))+(f.mode==='incremental'?text('递增字段','incrementalField',{required:true}):'')+alert('源表和数据为演示目录。持续采集会自动保留各表主键，可返回上一步查看；单独启动与停止，不参与批次调度。');
   if(step===3)body+=`<div class="alert alert-secondary">${e(f.connection)} · ${e(modeNames[f.mode])} · ${f.tables.length} 张源表</div>${f.tables.map(t=>input(t+' → 输出数据集','output:'+t,f.outputs[t]||'',{required:true,extra:`aria-label="${e(t)}输出名称"`})).join('')}${alert(f.mode==='continuous'?'保存配置后可启动持续采集；每次运行使用启动时的配置。':'保存后为草稿，校验发布后才能运行或调度。修改配置需重新发布。')}`;
  }
  if(kind==='flow'){
   const available=datasets(p);body+='<div class="mb-3"><span class="form-label">输入数据集</span><div class="d-flex flex-column gap-2 my-3">'+available.map(d=>checkbox(d.name+' · '+(d.state||'数据集'),'inputs',d.id,f.inputs.includes(d.id))).join('')+'</div></div>'+text('输出数据集名称','output',{required:true})+textarea('用途说明','description',f.description)+alert('转换流程在本地模拟版本流转，不执行真实加工逻辑。');
  }
  if(kind==='code')body+=this.codeForm();
  if(kind==='dataset')body+=select('创建方式','datasetMode',f.datasetMode,[{value:'manual',label:'手动录入'},{value:'csv',label:'CSV 文件导入'}])+(f.datasetMode==='csv'?fileUpload({name:'csvFile',label:'CSV 文件',accept:'.csv,text/csv',hint:'选择一个 UTF-8 编码的 CSV 文件，最大 10 MiB。下方可确认首行含义、字段类型和数据预览。'})+select('首行含义','csvHeader',f.csvHeader,[{value:'header',label:'首行为字段名'},{value:'data',label:'首行为数据'}])+this.importPreview():select('数据分组','group',f.group,[{value:'raw',label:'原始数据'},{value:'processed',label:'加工数据'}])+textarea('字段结构','schema',f.schema,'每行 字段名:类型，例如 id:BIGINT、name:STRING。')+textarea('数据内容','rows',f.rows,'按 CSV 格式录入，列顺序与字段结构一致，无需表头。'));
  if(kind==='dataset')body+=textarea('数据集说明','description',f.description);
  if(kind==='plan')body+=this.planForm();
  if(kind==='member')body+=select('组织成员','member',f.member,[{value:'',label:'请选择成员'},...users.map(u=>({value:u.id,label:u.name+' · '+u.orgRole}))],{disabled:!!r})+select('项目角色','role',f.role,[...(cap(p.name).owner?[{value:'admin',label:'管理员'}]:[]),{value:'developer',label:'开发者'},{value:'viewer',label:'只读成员'}])+checkbox('允许下载项目数据','download','1',f.download)+alert('只读成员可查看数据与任务，不可配置、发布或运行。下载权限单独授权。');
  const submit=kind==='task'&&step<3?'下一步':kind==='project'?'创建项目':kind==='plan'&&!r?'创建停用计划':kind==='member'?'保存权限':kind==='connection'?'保存连接':kind==='dataset'?'创建数据集':'保存配置';
  if(kind==='member'&&f.member)body=`<div class="mb-4">${memberIdentity(f.member)}</div>`+body;
  this.host.innerHTML=`<div id="modal-feedback" aria-live="polite"></div>${kind==='plan'?'':`<p class="text-muted small">${p?`当前项目：${e(p.name)} · `:''}${['task','code','flow'].includes(kind)?kind==='code'?'完成输入输出配置后即可下载模板开发；上传 ZIP 并保存后任务就绪。':kind==='task'&&f.mode==='continuous'?'配置保存后可启动持续采集，运行使用启动时的配置。':'保存为草稿，校验发布后才能运行。修改配置后需要重新发布。':'填写配置后保存，取消不会提交修改。'}</p>`}<form id="workspace-form"><div id="form-error" tabindex="-1" aria-live="assertive">${this.error?alert(this.error,'danger'):''}</div>${body}</form>`;
  this.footer.hidden=false;this.footer.innerHTML=`<button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">取消</button>${kind==='task'&&step>0?'<button type="button" class="btn btn-outline-secondary" data-form-action="back">上一步</button>':''}<button type="submit" form="workspace-form" class="btn btn-primary" ${this.busy||this.uploadBusy?'disabled':''}>${submit}</button>`;
  if(kind==='code')this.updateCodeControls();
  if(kind==='task'&&step===1)this.sourcePicker.mount(this.host,this.footer.querySelector('[type="submit"]'));
  if(kind==='plan')this.updatePreview();
  this.updateUpload();
  // Bootstrap's overflow utility lets the template menu extend beyond a short
  // editable table (CSV field types and code output bindings).
  this.host.querySelectorAll('.table-responsive:has(select[data-choices])').forEach(table=>table.classList.add('overflow-visible'));
  mountFilterSelects(this.host,selectFocus?{...selectFocus,open:false}:undefined);
  mountDatePickers(this.host);
  if(focused?.name&&!selectFocus){const next=[...this.host.querySelectorAll('input,select,textarea')].find(el=>el.name===focused.name&&(!['checkbox','radio'].includes(focused.type)||el.value===focused.value));next?.focus({preventScroll:true});}
  this.host.scrollTop=scroll;
 }
 bindingSignature(){return JSON.stringify([this.f.inputs,this.f.inputReferences,this.f.outputBindings.map(({replaceAcknowledged,...binding})=>binding)]);}
 updateCodeControls(){
  if(this.kind!=='code')return;
  const signature=this.bindingSignature();
  if(signature!==this.codeBindingSignature){
   this.codeBindingSignature=signature;
   if(this.loadingCode){this.fileRequest++;this.loadingCode=false;this.uploadBusy=false;const submit=this.footer?.querySelector('[type="submit"]');if(submit)submit.disabled=false;}
   if(this.f.fileName){this.f.fileName='';this.f.packageId='';this.f.packageSize=undefined;this.fileSize=undefined;this.uploadError='';this.uploadNote='输入输出绑定已变化，请重新下载模板并上传代码包。';const input=this.host.querySelector('[name="codeFile"]');if(input)input.value='';}this.updateUpload();
  }
  const problem=codeBindingIssue({...this.f,id:this.record?.id},datasets(this.project),codes(this.project));
  const button=this.host.querySelector('[data-form-action="download-template"]');if(button){button.disabled=!!problem;button.title=problem||'根据当前全部输入输出绑定生成代码模板';}
  const hint=this.host.querySelector('#code-template-hint');if(hint)hint.textContent=problem||'输入输出已完整，可下载模板。模板包含本次输入和输出绑定，不包含数据内容。';
 }
 codeForm(){
  const f=this.f,p=this.project,r=this.record,available=datasets(p);
  const compact=html=>html.replaceAll('class="form-label"','class="form-label visually-hidden"').replaceAll('class="mb-3"','class="mb-0"');
  const inputs=compact(table([{title:'选择输入数据集',render:data=>checkbox(data.name+' · '+(data.state||'数据集'),'inputs',data.id,f.inputs.includes(data.id))},{title:'代码引用名称',render:data=>f.inputs.includes(data.id)?input('输入引用名称 '+data.name,'coderef.'+data.id,inputReference(f,data.id,f.inputs.indexOf(data.id)),{extra:'maxlength="64"'}):'—'},{title:'参考结构 / 版本',render:data=>e((data.schema||[]).length+' 个字段 · '+(data.versionNumber!=null?'v'+data.versionNumber:data.state==='可用'?'未记录版本':'尚未产出'))}],available,{search:false,id:'code-input-bindings',empty:'当前项目暂无数据集，请先采集或创建数据集。'}));
  const eligible=available.filter(data=>data.group==='processed'&&data.writable===true&&(!data.producer||data.producer===r?.id)&&!f.inputs.includes(data.id));
  const outputs=f.outputBindings.map((o,i)=>{
   const prefix='codeout.'+i+'.',target=available.find(data=>data.id===o.datasetId);
   return '<tr><td>'+select('输出方式 '+(i+1),prefix+'mode',o.mode,[{value:'new',label:'新建加工数据集'},{value:'existing',label:'绑定已有加工数据集'}])+'</td><td>'+(o.mode==='existing'?select('输出数据集 '+(i+1),prefix+'datasetId',o.datasetId,[{value:'',label:'请选择已有加工数据集'},...eligible.map(data=>({value:data.id,label:data.name+' · '+data.state}))]):input('输出数据集名称 '+(i+1),prefix+'name',o.name,{required:true}))+(o.mode==='existing'&&target?'<p class="form-text">'+e((target.schema||[]).map(field=>field.name+' · '+field.type).join('；')||'首次运行后生成结构')+'</p>'+((target.hasData||target.versionNumber!=null)?checkbox('确认更新已有数据 '+(i+1)+'，历史版本保留','codeack.'+i,'1',o.replaceAcknowledged):''):'')+'</td><td>'+input('输出引用名称 '+(i+1),prefix+'reference',o.reference,{required:true,extra:'maxlength="64"'})+'</td><td><button type="button" class="btn btn-link text-danger" data-form-action="remove-code-output" data-index="'+i+'" '+(f.outputBindings.length===1?'disabled':'')+'>移除</button></td></tr>';
  }).join('');
  return alert('支持多个输入和多个输出。代码任务统一读取选中的输入，按引用名称分别写入各个输出，无需逐行配对。请完成全部绑定后下载模板。','secondary')+
   '<h3 class="h6">输入数据集</h3>'+inputs+'<div class="d-flex align-items-center justify-content-between my-3"><h3 class="h6 mb-0">输出声明</h3><button type="button" class="btn btn-outline-primary btn-sm" data-form-action="add-code-output">'+icon('plus')+' 添加输出</button></div><div class="table-responsive"><table class="table align-middle" id="code-output-bindings"><thead><tr><th>输出方式</th><th>输出目标</th><th>代码引用名称</th><th>操作</th></tr></thead><tbody>'+compact(outputs)+'</tbody></table></div>'+alert('输入输出引用名称需合法且不能重复；输出不能覆盖输入或占用其他任务的输出。绑定变化后须重新上传代码包。','secondary')+
   '<div class="mb-3"><button type="button" class="btn btn-outline-primary" data-form-action="download-template">'+icon('download')+' 下载代码模板</button><div class="form-text" id="code-template-hint"></div></div>'+
   fileUpload({name:'codeFile',label:'代码包（ZIP）',accept:'.zip',hint:'选择一个 ZIP 代码包，最大 50 MB。下载模板并完成本地开发后上传，保存配置后生效。'})+textarea('用途说明','description',f.description)+alert('代码任务在本地模拟版本流转，不执行真实加工逻辑。');
 }

 planForm(){
  const f=this.f,eligible=targets(this.project),selected=eligible.find(t=>t.id===f.task),options=map=>Object.entries(map).map(([value,label])=>({value,label}));
  let html=select('执行任务','task',f.task,[{value:'',label:'选择可执行任务'},...eligible.map(t=>({value:t.id,label:t.name}))])+(!eligible.length?alert('暂无可调度任务，请先发布采集任务或完成代码任务配置。','warning'):'');
  const eventAllowed=!!selected&&selected.type!=='batch'&&selected.inputs?.length>0;
  html+=`<fieldset class="mb-4"><legend class="fs-6 fw-semibold">触发方式</legend><div class="row g-3">${[
   ['time','定时触发','按设定时间运行，使用当时可用的数据。'],
   ['event','上游更新触发','选定输入数据集产生新版本后运行。']
  ].map(([value,label,hint])=>`<div class="col-6"><div class="card h-100"><div class="card-body"><div class="form-check mb-2"><input class="form-check-input" type="radio" name="planMode" id="trigger-${value}" value="${value}" ${f.planMode===value?'checked':''} ${!selected||value==='event'&&!eventAllowed?'disabled':''} aria-describedby="trigger-help-${value}"><label class="form-check-label fw-semibold" for="trigger-${value}">${label}</label></div><p class="small text-muted mb-0" id="trigger-help-${value}">${hint}</p></div></div></div>`).join('')}</div>${!selected?'<div class="form-text">请先选择执行任务。</div>':!eventAllowed?'<div class="form-text">'+(selected.type==='batch'?'采集任务仅支持定时触发。':'当前任务无输入数据集，仅支持定时触发。')+'</div>':''}</fieldset>`;
  if(f.planMode==='event')html+=`<fieldset class="mb-3"><legend class="form-label fs-6">监听数据集 <span class="text-muted fw-normal small">至少选择一个</span></legend><div class="d-flex flex-column gap-2">${(selected?.inputs||[]).map(id=>checkbox(datasets(this.project).find(d=>d.id===id)?.name||id,'watch',id,f.watch.includes(id))).join('')}</div></fieldset>`+select('组合规则','combo',f.combo,[{value:'any',label:'任一输入更新'},{value:'all',label:'全部输入均有新版本'}])+'<div class="border-top pt-3 mb-3" id="schedule-preview" aria-live="polite"></div>';
  else{
   const rule=f.rule,kind=rule.kind,interval=['second','minute','hour'].includes(kind);
   html+=`<div class="mc-form-grid">${select('时间规则','rule.kind',kind,options({second:'固定间隔 · 秒',minute:'固定间隔 · 分钟',hour:'固定间隔 · 小时',day:'按天',week:'每周',month:'每月',year:'每年',once:'单次'}))}${select('时区','rule.zone',rule.zone,['Asia/Shanghai','UTC','Asia/Tokyo','America/New_York','Europe/London'].map(value=>({value,label:value})))}`;
   if(interval)html+=input('间隔数值','rule.every',rule.every,{type:'number',extra:'min="1"'});
   if(kind==='day')html+=input('间隔天数','rule.dayInterval',rule.dayInterval,{type:'number',extra:'min="1"'})+(Number(rule.dayInterval)>1?input('起始日期','rule.anchorDate',rule.anchorDate,{type:'date'}):'');
   if(kind==='week')html+=`<div class="mb-3"><span class="form-label">执行星期</span><div class="d-flex flex-column gap-2 my-3">${[1,2,3,4,5,6,0].map(n=>checkbox('星期'+'日一二三四五六'[n],'rule.weekdays',n,rule.weekdays.includes(n))).join('')}</div></div>`;
   if(kind==='month')html+=select('月内规则','rule.monthMode',rule.monthMode,[{value:'date',label:'指定日期'},{value:'week',label:'第几个星期几'}]);
   if(kind==='month'&&rule.monthMode==='week')html+=select('周序','rule.nth',rule.nth,['1','2','3','4','5','last'].map(value=>({value,label:value==='last'?'最后一个':'第 '+value+' 个'})))+select('星期','rule.weekday',rule.weekday,[0,1,2,3,4,5,6].map(n=>({value:n,label:'星期'+'日一二三四五六'[n]})));
   else if(['month','year'].includes(kind))html+=input('执行日期','rule.days',rule.days,{placeholder:'多个逗号分隔，L 表示月末'});
   if(kind==='year')html+=`<div class="mb-3"><span class="form-label">执行月份</span><div class="d-flex flex-column gap-2 my-3">${Array.from({length:12},(_,i)=>i+1).map(n=>checkbox(n+' 月','rule.months',n,rule.months.includes(n))).join('')}</div></div>`;
   if(['day','week','month','year'].includes(kind)){
    const times=String(rule.times??'08:00').split(',');
    html+='<div class="mb-3"><div class="d-flex justify-content-between align-items-center mb-2"><span class="form-label mb-0">执行时间</span><button type="button" class="btn btn-link btn-sm" data-form-action="add-time">'+icon('plus')+'添加时间</button></div>'+times.map((time,i)=>'<div class="d-flex align-items-start gap-2">'+input('执行时间 '+(i+1),'scheduleTime',time.trim(),{type:'time',required:true})+'<button type="button" class="btn btn-link text-danger mt-4" data-form-action="remove-time" data-index="'+i+'" aria-label="移除执行时间 '+(i+1)+'" '+(times.length===1?'disabled':'')+'>'+icon('x-lg')+'</button></div>').join('')+'</div>';
   }
   html+=kind==='once'?input('执行日期与时间','rule.once',rule.once,{type:'datetime-local'}):input(interval?'基准时间':'开始时间（可选）','rule.start',rule.start,{type:'datetime-local'})+input('结束时间（可选）','rule.end',rule.end,{type:'datetime-local'});
   html+='</div><div class="border-top pt-3 mb-3" id="schedule-preview" aria-live="polite"></div>';
  }
  return html+'<p class="form-text mb-0">'+(this.record?'保存后保持'+(this.record.enabled?'启用':'停用')+'状态，新规则从后续触发生效。':'创建后需手动启用。')+'</p>';
 }
 updatePreview(){const host=this.host.querySelector('#schedule-preview');if(!host)return;
  if(this.f.planMode==='event'){const count=this.f.watch.length;host.innerHTML='<h3 class="h6">触发预览</h3>'+(count?`<p class="mb-0">已选 ${count} 个数据集 · ${this.f.combo==='all'?'全部更新后运行':'任一更新后运行'}</p>${this.f.combo==='all'?'<p class="form-text mb-0">各数据集的新版本不一定属于同一业务批次。</p>':''}`:'<p class="text-muted mb-0">请选择至少一个输入数据集。</p>');return;}
  try{const labels=engine.compute(this.f.rule).labels;host.innerHTML='<div class="d-flex align-items-center gap-2 mb-2"><h3 class="h6 mb-0">后续触发时间</h3>'+`<span class="small text-muted">${e(this.f.rule.zone)}</span></div>`+(labels.length?`<ol class="mb-0">${labels.map(time=>`<li>${e(time)}</li>`).join('')}</ol>`:alert('当前规则没有未来触发时间','danger'));}catch(error){host.innerHTML=alert(error.message,'danger');}}
}
