import {escape as e} from './html.js';

export const resourceKind=kind=>({task:'tasks',flow:'flows'}[kind]||kind);
export const resourceView=kind=>({connection:'connections',tasks:'tasks',dataset:'datasets',code:'code',flows:'flows',plan:'plans',run:'runs'}[resourceKind(kind)]);
const clearDetail=params=>{for(const key of ['detail','id','tab','version','task','connection','connectionTab'])params.delete(key);};
export function listURL(view,project=new URLSearchParams(location.search).get('project')){
 const params=new URLSearchParams(location.search);clearDetail(params);
 if(['projects','organization'].includes(view)||!project)params.delete('project');else params.set('project',project);
 return location.pathname+(params.size?'?'+params:'')+'#'+view;
}
export function detailURL(kind,id,options={}){
 kind=resourceKind(kind);const url=new URL(listURL(resourceView(kind)),location.origin);
 url.searchParams.set('detail',kind);url.searchParams.set('id',id);
 for(const [key,value]of Object.entries({tab:options.tab,version:options.version,task:options.taskId}))if(value!=null&&value!=='')url.searchParams.set(key,value);
 return url.pathname+url.search+url.hash;
}
export function detailRoute(){
 const params=new URLSearchParams(location.search),kind=resourceKind(params.get('detail')),id=params.get('id');
 if(!resourceView(kind)||!id)return null;
 return {kind,id,options:{tab:params.get('tab')||undefined,version:params.get('version')??undefined,taskId:params.get('task')||undefined}};
}
export const resourceLink=(name,kind,id,options={})=>`<a class="btn btn-link p-0 text-start text-break" href="${e(detailURL(kind,id,options))}" data-action="inspect" data-kind="${e(resourceKind(kind))}" data-id="${e(id)}" ${options.tab?`data-detail-tab="${e(options.tab)}"`:''} ${options.taskId?`data-task="${e(options.taskId)}"`:''} ${options.version!=null?`data-version="${e(options.version)}"`:''}>${e(name)}</a>`;
