// Both overview charts use the same seven calendar days in Asia/Shanghai.
const dayKey = time => new Date(time + 8 * 3600000).toISOString().slice(0,10);
export function overviewStats(rows, now=Date.now()) {
 const today=dayKey(now), midnight=Date.parse(today+'T00:00:00+08:00');
 const groups=[
  {key:'success',label:'成功',color:'--success-color'},
  {key:'failed',label:'失败 / 部分失败',color:'--danger-color'},
  {key:'active',label:'排队 / 运行 / 停止中',color:'--accent-color'},
  {key:'stopped',label:'已停止 / 已取消',color:'--warning-color'},
  {key:'other',label:'其他状态',color:'--muted-color'}
 ].map(g=>({...g,count:0}));
 const days=Array.from({length:7},(_,i)=>{const key=dayKey(midnight-(6-i)*86400000);return {key,label:key.slice(5).replace('-','/'),counts:Object.fromEntries(groups.map(g=>[g.key,0]))};});
 for(const row of rows){
  const time=typeof row.start==='number'?row.start:Date.parse(row.start);if(!Number.isFinite(time)||time>now)continue;
  const day=days.find(d=>d.key===dayKey(time));if(!day)continue;
  const key=['SUCCESS','SUCCEEDED'].includes(row.status)?'success':['FAILED','PARTIAL_FAILED'].includes(row.status)?'failed':['QUEUED','RUNNING','STOPPING'].includes(row.status)?'active':['STOPPED','CANCELLED'].includes(row.status)?'stopped':'other';
  day.counts[key]++;groups.find(g=>g.key===key).count++;
 }
 return {days,groups,total:groups.reduce((n,g)=>n+g.count,0)};
}
