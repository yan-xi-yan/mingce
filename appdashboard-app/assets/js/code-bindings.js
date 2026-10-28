// Normalize older single-output records without changing stored history.
export const codeOutputs=task=>Array.isArray(task.outputBindings)?task.outputBindings:task.output?[{name:task.output,mode:task.outputMode||'new',datasetId:task.outputId||'',reference:'output_1',replaceAcknowledged:!!task.replaceAcknowledged}]:[];
export const codeOutputNames=task=>codeOutputs(task).map(o=>(o.name||'').trim());
export const inputReference=(task,id,i)=>task.inputReferences?.[id]??'input_'+(i+1);
export function validateCodeBindings(task,available,jobs=[]){
 if(!task.name?.trim()||task.name.trim().length>100||/[\x00-\x1f\x7f]/.test(task.name))throw Error('请先填写 1～100 字的代码任务名称');
 if(!Array.isArray(task.inputs)||!task.inputs.length)throw Error('请至少选择一个输入数据集');
 if(new Set(task.inputs).size!==task.inputs.length)throw Error('输入数据集不能重复');
 const inputs=task.inputs.map(id=>{const data=available.find(d=>d.id===id);if(!data)throw Error('输入数据集已不可用，请重新选择当前项目的数据集');return data;});
 const outputs=codeOutputs(task);if(!outputs.length)throw Error('请至少配置一个输出数据集');
 const refs=inputs.map((d,i)=>inputReference(task,d.id,i)),names=new Set(),ids=new Set();
 const bindings=outputs.map(o=>{
 const outputName=o.name?.trim();if(!outputName||outputName.length>100||/[\x00-\x1f\x7f]/.test(outputName))throw Error('请先填写 1～100 字的输出数据集名称');
 if(names.has(outputName))throw Error('输出数据集不能重复');names.add(outputName);
 if(inputs.some(d=>d.name===outputName))throw Error('输出数据集不能与输入数据集相同');
 const mode=o.mode||'new';let target;
 if(mode==='existing'){
 target=available.find(d=>d.id===o.datasetId);if(!target||target.name!==outputName)throw Error('请选择一个有效的已有加工数据集作为输出');
 if(target.group!=='processed'||target.writable!==true)throw Error('输出只能绑定具有写入权限的加工数据集');
 if(target.producer&&target.producer!==task.id)throw Error('输出数据集已被其他生产任务占用');
 if((target.hasData||target.versionNumber!=null)&&!o.replaceAcknowledged)throw Error('请确认后续成功运行将更新已有数据，历史版本保留');
 }else if(mode==='new'){
 target=available.find(d=>d.name===outputName);
 if(target&&(target.group!=='processed'||target.writable===false))throw Error('输出只能绑定具有写入权限的加工数据集');
 if(target&&(!task.id||target.producer!==task.id))throw Error('输出名称已存在，请更换名称或选择“绑定已有加工数据集”');
 }else throw Error('请选择有效的输出方式');
 if(target){if(ids.has(target.id))throw Error('输出数据集不能重复');ids.add(target.id);}
 if(jobs.some(job=>job.id!==task.id&&codeOutputNames(job).includes(outputName)))throw Error('输出数据集已被其他代码任务绑定');
 refs.push(o.reference);return {...o,name:outputName,outputName,target,mode};
 });
 if(refs.some(ref=>!/^[_A-Za-z][_A-Za-z0-9]{0,63}$/.test(ref||'')))throw Error('代码引用名称需以字母或下划线开头，限 64 位字母、数字或下划线');
 if(new Set(refs).size!==refs.length)throw Error('输入和输出的代码引用名称不能重复');
 // Reject indirect self-dependencies when binding an existing downstream asset as input.
 const outputIds=new Set(bindings.map(b=>b.target?.id).filter(Boolean)),visited=new Set();
 function visit(id){if(outputIds.has(id))throw Error('输入输出形成循环依赖，请调整绑定');if(visited.has(id))return;visited.add(id);const data=available.find(d=>d.id===id),producer=jobs.find(j=>j.id===data?.producer);if(producer)for(const upstream of producer.inputs||[])visit(upstream);}
 inputs.forEach(d=>visit(d.id));
 return {inputs,outputs:bindings};
}
export function codeBindingIssue(task,available,jobs=[]){try{validateCodeBindings(task,available,jobs);return '';}catch(error){return error.message;}}
