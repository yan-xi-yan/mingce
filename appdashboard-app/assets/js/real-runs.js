import {projectOrganizationId} from './domain/organizations.js';
// Read-only evidence snapshots: never insert into the browser's execution engine.
let catalog=null;
let failure='';
export async function loadRealRuns(fetcher=globalThis.fetch){
 try{
  const response=await fetcher(new URL('../data/real-runs.json',import.meta.url),{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const data=await response.json();
  if(data.schemaVersion!==1||!Array.isArray(data.runs)||data.runs.some(r=>r.provenance?.kind!=='VERIFIED_LAB'||!r.readOnly))throw new Error('数据格式不正确');
  catalog=data;failure='';
 }catch(error){catalog=null;failure='真实实验数据加载失败：'+error.message+'。请刷新页面重试。';}
}
export function realRuns(project){return project?.name===(catalog?.project||'供应链分析')&&projectOrganizationId(project)===(catalog?.organizationId||'east')?catalog?.runs||[]:[];}
export function realRunsStatus(project){return project?.name==='供应链分析'&&projectOrganizationId(project)==='east'?{error:failure,capturedAt:catalog?.capturedAt,count:catalog?.runs.length||0}:null;}
