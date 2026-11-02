import {codeOutputs,inputReference} from './code-bindings.js';
// Package versions are immutable uploads, independent of task configuration revisions.
export function packageBinding(task){return JSON.stringify({inputs:(task.inputs||[]).map((id,i)=>({id,ref:inputReference(task,id,i)})).sort((a,b)=>a.ref.localeCompare(b.ref)),outputs:codeOutputs(task).map(o=>({name:o.name,ref:o.reference,mode:o.mode||'new',target:o.mode==='existing'?o.datasetId:null})).sort((a,b)=>a.ref.localeCompare(b.ref))});}
export function packageVersions(task){
 const versions=structuredClone(task?.packageVersions||[]);
 if(task?.packageId&&!versions.some(v=>v.packageId===task.packageId))versions.push({version:Math.max(0,...versions.map(v=>v.version))+1,packageId:task.packageId,fileName:task.fileName,size:task.packageSize??null,uploadedAt:null,uploadedBy:null,note:'已有代码包，未记录上传信息',binding:packageBinding(task),legacy:true});
 return versions.sort((a,b)=>b.version-a.version);
}
export function packageCompatible(task,version){return version.binding===packageBinding(task);}
export function packageVersionUpdate(previous,next,{now,by}){
 const versions=packageVersions(previous),note=String(next.packageNote||'').trim();if(note.length>500)throw Error('版本说明不能超过 500 字');
 if(!next.packageId)return {packageVersions:versions,packageVersion:null,packageNote:undefined};
 let version=versions.find(v=>v.packageId===next.packageId);
 if(version){if(!packageCompatible(next,version))throw Error('此代码包的输入输出绑定与当前配置不一致，请上传新版本。');}
 else{version={version:Math.max(0,...versions.map(v=>v.version))+1,packageId:next.packageId,fileName:next.fileName,size:next.packageSize??null,uploadedAt:now,uploadedBy:by,note,binding:packageBinding(next)};versions.unshift(version);}
 return {packageVersions:versions,packageVersion:version.version,fileName:version.fileName,packageSize:version.size,packageNote:undefined};
}
