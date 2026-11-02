import {isCDC,queryMode,validateSelection} from '../collection-selection.js';
import {sourceBinding,readSourceSchema,icebergType} from '../schema-evolution.js';
import {collectionDefaults,validateCollection,savedCollection} from '../collection-config.js';
import {read,write,key,uid,tasks} from './store.js';
import {datasets,datasetKey,assertWrite,actor,person} from './domain.js';

export function forkDefaults(p,dataset){
 const binding=sourceBinding(p,dataset);if(!binding)throw Error('仅支持有明确来源表的采集数据集');
 const {task,table,connection}=binding;
 const f={...structuredClone(task),...collectionDefaults(task,connection),id:uid(),name:task.name+' · 新数据集',datasetName:dataset.name+'_新',description:dataset.description||'',tables:[table],fields:{[table]:[...(task.fields[table]||[])]},outputs:{[table]:dataset.name+'_新'}};
 f.cdc['topic.prefix']='mc_cdc_'+uid().replaceAll('-','');
 // New consumers never reuse another dataset's CDC cursor/slot identity.
 f.cdc['snapshot.mode']='initial';
 f.cdc['slot.name']='mc_'+uid().replaceAll('-','');
 f.cdc['database.server.id']=String(100000+parseInt(uid().replaceAll('-','').slice(0,7),16));
 f.cdc['publication.name']||='mc_'+uid().replaceAll('-','');
 return {binding,f,baseTask:JSON.stringify(task)};
}
export function createDatasetFromSource(p,datasetId,f,expected){
 assertWrite(p.name);
 const original=datasets(p).find(d=>d.id===datasetId),binding=original&&sourceBinding(p,original);
 if(!binding)throw Error('原数据集或来源绑定已变化，请重新打开页面');
 if(JSON.stringify(binding.task)!==expected.baseTask)throw Error('原采集配置已变化，请重新打开页面');
 if(expected.baseConnection&&JSON.stringify(binding.connection)!==expected.baseConnection)throw Error('来源连接配置已变化，请重新打开页面');
 if(expected.baseSchema&&JSON.stringify(original.schema||[])!==expected.baseSchema)throw Error('原数据集 Schema 已变化，请重新打开页面');
 const source=readSourceSchema(p,binding);
 if(source.fingerprint!==expected.fingerprint)throw Error('源表结构已变化，请重新查询并确认差异');
 const name=String(f.datasetName||'').trim(),taskName=String(f.name||'').trim(),table=binding.table;
 if(!name||name.length>100||!taskName||taskName.length>100)throw Error('数据集和任务名称需为 1～100 字');
 if(datasets(p).some(d=>d.name===name)||tasks(p).some(t=>Object.values(t.outputs||{}).includes(name)))throw Error('数据集名称已被占用');
 if(tasks(p).some(t=>t.name===taskName))throw Error('采集任务名称已存在');
 const fields=isCDC(f)?source.fields.map(f=>f.name):[...new Set(f.fields[table]||[])];
 if(!fields.length||fields.some(name=>!source.fields.some(f=>f.name===name)))throw Error('请至少选择一个当前源表中存在的字段');
 if(f.method!==collectionDefaults(binding.task,binding.connection).method)throw Error('采集方式需沿用原数据集配置');
 const inherited=collectionDefaults(binding.task,binding.connection);
 for(const k of ['schema','database.dbname','database.pdb.name'])if(f.method==='CDC'&&f.cdc[k]!==inherited.cdc[k])throw Error('来源表范围需沿用原配置，请重新打开页面');
 const form={...f,sourceSchemas:{[table]:source},connection:binding.connection.name,tables:[table],fields:{[table]:fields},outputs:{[table]:name}};
 validateSelection(form);
 validateCollection(form,binding.connection,tasks(p));
 const task={id:uid(),name:taskName,description:f.description,connection:binding.connection.name,...savedCollection(form,binding.connection),tables:[table],fields:form.fields,outputs:form.outputs,revision:1,published:false,derivedFrom:original.id};
 // A first CDC version must contain a fresh baseline, even when the original used no_data.
 if(task.method==='CDC'&&task.cdc['snapshot.mode']!=='initial')throw Error('新数据集需使用 initial 初始快照建立数据基线');
 const record={id:uid(),name,description:f.description,group:original.group||'raw',owner:person(actor()),producer:task.id,producerType:'batch',source:task.name,table,sourceBinding:{connectionId:binding.connection.id,table},method:'采集任务',state:'待产出',writable:true,hasData:false,versionNumber:null,versions:[],rows:[],acceptedSourceSchema:isCDC(f)?source:undefined,schema:!isCDC(f)&&queryMode(f,table)==='sql'?[]:fields.map(name=>({name,type:icebergType(source.fields.find(f=>f.name===name).type)})),derivedFrom:original.id,createdFromVersion:original.versionNumber??null,sourceSchemaAtCreation:source,updated:new Date().toISOString(),demo:true};
 const dsKey=datasetKey(p.name),taskKey=key(p.name,'tasks'),beforeDatasets=read(dsKey,[]),beforeTasks=tasks(p);
 try{write(taskKey,[...beforeTasks,task]);write(dsKey,[...beforeDatasets,record]);}catch(error){write(taskKey,beforeTasks);write(dsKey,beforeDatasets);throw error;}
 return record;
}
