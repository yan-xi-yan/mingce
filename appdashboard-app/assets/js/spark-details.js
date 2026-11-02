import {escape as e,table,alert,badge} from './html.js';
import {tabs,statusBadge,formatTime,resourceLink} from './resource-details.js';
import {section,empty,metric,ms,bytes,sparkMetrics,safeSparkURL,evidenceMetadata} from './run-details.js';

export const sparkTabNames=['Overview','Query plan','Graph','Executors','Environment','Dependencies','Debug information'];
const numeric=values=>values.filter(Number.isFinite).sort((a,b)=>a-b);
export function taskQuantiles(tasks=[]){const values=numeric(tasks.map(t=>t.durationMs));return values.length?[0,.25,.5,.75,1].map(p=>values[Math.round((values.length-1)*p)]):[];}
export function sparkTimeDomain(spark){
 const starts=(spark.stages||[]).filter(s=>Number.isFinite(s.startMs)),points=spark.concurrency||[];
 const values=[...starts.map(s=>s.startMs),...starts.filter(s=>Number.isFinite(s.durationMs)).map(s=>s.startMs+s.durationMs),...points.map(p=>p.timeMs)].filter(Number.isFinite);
 return {from:values.length?Math.min(...values):0,to:values.length?Math.max(...values):1};
}
const stageKey=s=>String(s.id).replace(/[^a-zA-Z0-9_-]/g,'_');
const stageButton=s=>`<button class="btn btn-link p-0" data-action="spark-stage" data-stage="${e(stageKey(s))}">Stage ${e(s.id)}</button>`;
const color=s=>s.status==='FAILED'?'#dc5265':s.status==='SKIPPED'?'#a5afbf':s.status==='ACTIVE'?'#497ee6':'#2d9a86';
function axis(domain,y){return [0,.25,.5,.75,1].map(t=>`<line x1="${140+790*t}" x2="${140+790*t}" y1="0" y2="${y-20}" stroke="#dbe1ea" stroke-dasharray="3 3"/><text x="${140+790*t}" y="${y}" text-anchor="middle">${e(ms(domain.from+(domain.to-domain.from)*t))}</text>`).join('');}
function stageTimeline(spark){
 const stages=(spark.stages||[]).filter(s=>Number.isFinite(s.startMs)&&Number.isFinite(s.durationMs)),domain=sparkTimeDomain(spark),span=Math.max(1,domain.to-domain.from),height=stages.length*28+40;
 if(!stages.length)return empty('尚无已完成 Stage 的时间线。');
 const x=t=>140+(t-domain.from)/span*790;
 const edges=stages.flatMap((s,i)=>(s.parentIds||[]).flatMap(id=>{const index=stages.findLastIndex(p=>p.stageId===id&&p.startMs+p.durationMs<=s.startMs);if(index<0)return [];const p=stages[index],a=x(p.startMs+p.durationMs),b=x(s.startMs),y1=index*28+15,y2=i*28+15;return [`<path d="M${a},${y1}H${(a+b)/2}V${y2}H${b}" fill="none" stroke="#b8c6d9" stroke-width="1.2"/>`];})).join('');
 return `<div class="mc-spark-chart-scroll"><svg class="mc-spark-timeline" viewBox="0 0 1050 ${height}" role="img" aria-label="Stage 执行时间线与依赖关系">${axis(domain,height-5)}${edges}${stages.map((s,i)=>`<g><text x="125" y="${i*28+19}" text-anchor="end">Stage ${e(s.id)}</text><a href="#stage-detail-${e(stageKey(s))}" data-action="spark-stage" data-stage="${e(stageKey(s))}"><rect x="${x(s.startMs)}" y="${i*28+7}" width="${Math.max(2,s.durationMs/span*790)}" height="16" rx="3" fill="${color(s)}"><title>Stage ${e(s.id)} · ${e(ms(s.durationMs))} · 上游 ${e(s.parentIds?.join(', ')||'无')}</title></rect></a><text x="950" y="${i*28+19}">${e(ms(s.durationMs))}</text></g>`).join('')}</svg></div>`;
}
function concurrency(spark){
 const points=(spark.concurrency||[]).filter(p=>Number.isFinite(p.timeMs)&&Number.isFinite(p.activeTasks)).sort((a,b)=>a.timeMs-b.timeMs),domain=sparkTimeDomain(spark),span=Math.max(1,domain.to-domain.from);
 if(!points.length)return empty('未记录 Task 并发时间序列。');
 const peak=Math.max(1,...points.map(p=>p.activeTasks)),x=t=>140+(t-domain.from)/span*790,y=n=>130-n/peak*110;
 let previous=0;const path=points.map(p=>{const result=`L${x(p.timeMs)},${y(previous)}L${x(p.timeMs)},${y(p.activeTasks)}`;previous=p.activeTasks;return result;}).join('');
 return `<svg class="mc-spark-concurrency" viewBox="0 0 1050 175" role="img" aria-label="Task 并发数，峰值 ${peak}">${axis(domain,165)}<text x="120" y="25">${peak}</text><text x="120" y="135">0</text><path d="M140,130${path}H930" fill="none" stroke="#497ee6" stroke-width="2"/></svg><p class="small text-muted">与 Stage 时间线共用时间轴 · Task 并发峰值 ${peak}${spark.concurrencyComplete===false?' · 仅包含起止时间完整的 Tasks':''}</p>`;
}
function stageDetails(spark){
 const stages=spark.stages||[];
 const summary=table([{title:'Stage / Attempt',render:stageButton},{title:'状态',render:s=>statusBadge(s.status)},{title:'完成 / 总 Tasks',render:s=>e(s.completedTasks??'—')+' / '+e(s.totalTasks??'—')},{title:'持续时间',render:s=>e(ms(s.durationMs))},{title:'Task 中位耗时',render:s=>e(ms(taskQuantiles(s.tasks)[2]))},{title:'最长 Task',render:s=>e(ms(taskQuantiles(s.tasks)[4]))},{title:'Shuffle 写入',render:s=>e(bytes(s.shuffleWriteBytes))},{title:'磁盘溢出',render:s=>e(bytes(s.diskSpillBytes))},{title:'上游 Stage',render:s=>s.parentIds==null?'未采集':e(s.parentIds.join(', ')||'无')}],stages,{id:'spark-stage-summary',search:false,empty:'尚无 Stage 记录。'});
 return summary+stages.map(s=>`<details class="mc-spark-stage-detail" id="stage-detail-${e(stageKey(s))}"><summary>Stage ${e(s.id)} · ${e(s.status)} · ${e(ms(s.durationMs))}</summary><div class="p-3"><p class="small text-muted text-break">${e(s.name||'')}</p><div class="mc-spark-quantiles">${['最短','P25','中位数','P75','最长'].map((label,i)=>metric(label,ms(taskQuantiles(s.tasks)[i]))).join('')}</div>${table([{key:'id',title:'Task ID'},{key:'attempt',title:'Attempt'},{title:'状态',render:t=>statusBadge(t.status)},{key:'executorId',title:'Executor'},{title:'耗时',render:t=>e(ms(t.durationMs))},{key:'inputRecords',title:'读取记录'},{title:'读取大小',render:t=>e(bytes(t.inputBytes))},{title:'峰值执行内存',render:t=>e(bytes(t.peakMemoryBytes))},{title:'磁盘溢出',render:t=>e(bytes(t.diskSpillBytes))}],s.tasks||[],{id:'spark-tasks-'+stageKey(s),search:false,empty:'此 Stage 未采集 Task 明细。'})}<p class="small text-muted">分位数由已记录的 Task attempt 耗时计算。Stage 无法自动精确映射到源代码行。</p></div></details>`).join('');
}
function stageGraph(spark){
 const stages=spark.stages||[],known=stages.filter(s=>Array.isArray(s.parentIds));
 if(!known.length)return empty('未采集 Stage 依赖，暂无法绘制 Graph。');
 const byId=new Map(known.map(s=>[s.stageId,s])),depths=new Map();
 function depth(s,visiting=new Set()){
  if(depths.has(s.stageId))return depths.get(s.stageId);
  if(visiting.has(s.stageId))return 0;
  const next=new Set([...visiting,s.stageId]),parents=s.parentIds.map(id=>byId.get(id)).filter(Boolean);
  const d=parents.length?1+Math.max(...parents.map(p=>depth(p,next))):0;depths.set(s.stageId,d);return d;
 }
 const rows=new Map(),positions=new Map();
 for(const s of known){const d=depth(s),row=rows.get(d)||0;rows.set(d,row+1);positions.set(s.stageId,{x:20+d*190,y:20+row*65});}
 const width=Math.max(800,(Math.max(...depths.values())+1)*190+20),height=Math.max(160,Math.max(...rows.values())*65+30);
 const edges=known.flatMap(s=>s.parentIds.filter(id=>positions.has(id)).map(id=>{const a=positions.get(id),b=positions.get(s.stageId);return `<path d="M${a.x+150},${a.y+20}C${a.x+170},${a.y+20} ${b.x-20},${b.y+20} ${b.x},${b.y+20}" fill="none" stroke="#93a7c4" marker-end="url(#stage-arrow)"/>`;})).join('');
 return '<p class="small text-muted">Stage 执行依赖 · 来自 Spark event log。点击节点查看 Stage；灰色节点表示跳过的阶段。</p>'+`<div class="mc-spark-graph"><svg width="${width}" height="${height}" role="img" aria-label="Spark Stage 依赖图"><defs><marker id="stage-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#93a7c4"/></marker></defs>${edges}${known.map(s=>{const p=positions.get(s.stageId);return `<a href="#stage-detail-${stageKey(s)}" data-action="spark-stage" data-stage="${stageKey(s)}"><rect x="${p.x}" y="${p.y}" width="150" height="40" rx="5" fill="white" stroke="${color(s)}" stroke-width="2"/><text x="${p.x+12}" y="${p.y+25}" fill="#334155">Stage ${e(s.id)} · ${e(ms(s.durationMs))}</text></a>`;}).join('')}</svg></div>`;
}
function executors(run){
 const spark=run.spark||{},ended=!['RUNNING','QUEUED'].includes(run.status),reason=ended?'应用已结束，无法生成新的 JVM 快照。':'尚未接入运行时 JVM 快照采集服务。';
 return section('Executors',table([{key:'id',title:'Executor'},{key:'host',title:'Host'},{title:'状态',render:x=>e(x.active?'活跃':'已退出')},{key:'cores',title:'CPU 核数'},{key:'completedTasks',title:'完成 Tasks'},{title:'JVM 堆峰值',render:x=>e(bytes(x.peakMemoryBytes))},{title:'启动时间',render:x=>e(formatTime(x.startedAt))},{title:'退出时间',render:x=>e(formatTime(x.endedAt))}],spark.executors||[],{id:'spark-executors',search:false,empty:'尚无 Executor 记录。'}))+`<div class="mc-jvm-cards">${[['Java stack traces','查看 Driver / Executor 线程在采样时执行的代码。'],['Memory histogram','仅 Driver：查看堆内 Java 对象的数量与字节大小。']].map(([title,description])=>`<section><h3 class="h6">${e(title)}</h3><p class="small text-muted">${e(description)}</p><button class="btn btn-outline-secondary btn-sm" disabled title="${e(reason)}">Snapshot</button><p class="small text-muted mt-3 mb-0">${e(reason)}本次未保存诊断快照。</p></section>`).join('')}</div><p class="small text-muted mt-3">运行中采集内存直方图会触发垃圾回收，可能影响任务耗时。</p>`;
}
export function sparkDetailsBody(run){
 const spark=run.spark;if(!spark)return empty('本次运行尚无 Spark 应用，无法展示 Spark details。');
 const m=sparkMetrics(spark),url=safeSparkURL(spark.uiUrl);
 const overview=`<div class="mc-run-metrics">${metric('Job duration · 计算跨度',ms(m.durationMs))}${metric('Total task runtime',ms(m.taskRuntimeMs))}${metric('Parallelism ratio',m.parallelism)}${metric('Disk spillage',bytes(m.diskSpillBytes))}${metric('Shuffle write',bytes(m.shuffleWriteBytes))}</div><p class="small text-muted">Job duration 从首个 Stage 开始到最后一个 Stage 完成。累计 Task 耗时 / 计算跨度 = 并行度；包含已记录的执行 attempts，未完成跨度显示 —。</p>`+section('Stage execution timeline',stageTimeline(spark))+section('Task concurrency',concurrency(spark))+section('Stage details',stageDetails(spark));
 const query=section(spark.queryPlanExecutionId!=null?'Execution '+spark.queryPlanExecutionId:'Query plan',spark.queryPlan?'<pre class="mc-run-log">'+e(spark.queryPlan)+'</pre>':empty('未采集执行计划。'))+table([{key:'id',title:'SQL Execution ID'},{key:'description',title:'说明'},{title:'关联 Jobs',render:x=>e(x.jobIds?.join(', ')||'—')},{title:'执行计划',render:x=>x.plan?'<details><summary>查看计划</summary><pre class="mc-run-log">'+e(x.plan)+'</pre></details>':'未采集'}],spark.sqlExecutions||[],{id:'spark-sql',search:false});
 const environment=section('Spark properties',table([{key:'key',title:'配置项'},{title:'值',render:r=>e(/password|secret|token|credential/i.test(r.key)?'••••••':r.value)}],Object.entries(spark.config||{}).map(([key,value])=>({key,value})),{id:'spark-config',search:false,empty:'未采集配置。'}));
 const dependencies=section('运行环境与依赖',table([{key:'name',title:'组件'},{key:'version',title:'实际版本'}],spark.dependencies||[],{id:'spark-dependencies',search:false,empty:'未采集依赖。'}))+'<p class="small text-muted">当前展示实验记录的运行时组件版本。</p>';
 const debug=(run.provenance?section('运行标识与来源',evidenceMetadata(run)):'')+section('Spark Jobs',table([{key:'id',title:'Job ID'},{key:'name',title:'说明'},{title:'状态',render:j=>statusBadge(j.status)},{title:'Stages',render:j=>e(j.stageIds?.join(', ')||'—')}],spark.jobs||[],{id:'spark-jobs',search:false}))+section(spark.logLabel||'Driver / Executor logs',spark.logs?'<pre class="mc-run-log">'+e(spark.logs)+'</pre>':empty('未保存日志。'));
 return `<div class="mc-spark-heading"><div><span class="mc-spark-mark">✦</span><strong>${e(run.name||'Spark application')}</strong><span class="small text-muted">${e(spark.applicationId||'—')}</span></div><div>${statusBadge(run.status)}${url?`<a class="btn btn-outline-secondary btn-sm" href="${e(url)}" target="_blank" rel="noopener noreferrer">原生 Spark UI ↗</a>`:''}</div></div>${tabs([['overview',sparkTabNames[0],overview],['query',sparkTabNames[1],query],['graph',sparkTabNames[2],stageGraph(spark)],['executors',sparkTabNames[3],executors(run)],['environment',sparkTabNames[4],environment],['dependencies',sparkTabNames[5],dependencies],['debug',sparkTabNames[6],debug]],'spark')}`;
}
