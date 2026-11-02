import {isCDC} from '../collection-selection.js';
import {inspectSchema,rememberChecks} from '../schema-evolution.js';
import {nextPublication} from '../continuous-versions.js';
import {validateCollection,validateOutputs} from '../collection-config.js';
import {validateCodeBindings,codeOutputNames} from '../code-bindings.js';
import { tasks, connections, key, read, write, uid, engine } from "./store.js";
import { codes, codeKey, datasets, datasetKey, flows, assertWrite, cap, permissions, readPlans, targets, person, actor, advanceRuns, runKey } from "./domain.js";
// Browser-only lifecycle simulator. It never executes Python, SQL or remote jobs.
export const executionKey = (p) => key(p.name, 'executions');
export const executions = (p) => read(executionKey(p), []);
export function taskRecord(p, type, id) {
    return (type === 'batch' ? tasks(p) : type === 'code' ? codes(p) : flows(p)).find(t => t.id === id);
}
export function validateTask(p, type, task) {
    if (!task)
        throw Error('任务不存在');
    if(type==='code')validateCodeBindings(task,datasets(p),codes(p));
    if (type === 'batch') {
        if (!connections(p).some(c => c.name === task.connection))
            throw Error('来源连接不存在，请先恢复连接');
        if(task.method){validateCollection(task,connections(p).find(c=>c.name===task.connection),tasks(p));validateOutputs(task,datasets(p),task.id);}
        if (!task.tables.length || task.tables.some((t) => !task.fields[t]?.length || !task.outputs[t]))
            throw Error('请完整配置源表、字段和输出');
    }
    else {
        if (!task.inputs?.length || task.inputs.some((id) => !datasets(p).some(d => d.id === id)))
            throw Error('请绑定当前项目内有效的输入数据集');
        if (!task.output?.trim())
            throw Error('请配置输出数据集');
        if (type === 'code' && (task.configStatus !== 'READY' || !task.fileName))
            throw Error('请先上传并保存代码包');
    }
    const names = type === 'batch' ? Object.values(task.outputs) : type==='code'?codeOutputNames(task):[task.output];
    for (const name of names) {
        const d = datasets(p).find(d => d.name === name);
        if (d && ((d.producer && d.producer !== task.id) || task.inputs?.includes(d.id)))
            throw Error('输出已被其他任务占用或与输入相同：' + name);
    }
}
export function publishTask(p, type, id) {
    assertWrite(p.name);
    const task = taskRecord(p, type, id);
    validateTask(p, type, task);
    const storage = type === 'batch' ? key(p.name, 'tasks') : type === 'code' ? codeKey(p.name) : key(p.name, 'flows');
    const rows = type === 'batch' ? tasks(p) : type === 'code' ? codes(p) : flows(p);
    write(storage, rows.map(t => t.id === id ? { ...t, published: true, publishedRevision: t.revision || 1 } : t));
}
export function submitExecution(p, type, id, planId, now = Date.now(), runMode = 'PRODUCTION') {
    if(!['PRODUCTION','TEST'].includes(runMode)||runMode==='TEST'&&(type!=='code'||planId))throw Error('测试仅支持手动代码任务');
    if (!planId)
        assertWrite(p.name);
    const task = taskRecord(p, type, id);
    validateTask(p, type, task);
    if(runMode==='TEST'&&!task.packageId)throw Error('请在开发与代码包页面上传 ZIP 后再测试');
    if (type==='code' ? task.configStatus!=='READY'||!task.fileName : !task.published)
        throw Error(type==='code'?'请先上传并保存代码包':'请先校验并发布任务');
    if (task.mode === 'continuous')
        throw Error('持续采集请使用启动采集，不参与批次调度');
    if (executions(p).some(r => r.taskId === id && ['QUEUED', 'RUNNING'].includes(r.status)))
        throw Error('任务正在运行');
    const inputs = (task.inputs || []).map((id) => datasets(p).find(d => d.id === id));
    if (inputs.some((d) => !d || !(d.versionNumber != null || d.state === '可用' || d.hasData)))
        throw Error('输入数据尚未产出，请先运行上游任务');
    const run = { id: uid(), taskId: id, type, name: task.name, task: JSON.parse(JSON.stringify(task)),
        inputs: JSON.parse(JSON.stringify(inputs)), inputVersions: inputs.map((d) => ({ id: d.id, version: d.versionNumber || 1 })),
        runMode, status: 'QUEUED', start: now, planId, actor: planId ? '项目运行身份' : person(actor()), outputs: [], demo: true };
    write(executionKey(p), [run, ...executions(p)]);
    return run;
}
export function submitCodeTest(p,id,now=Date.now()) { return submitExecution(p,'code',id,undefined,now,'TEST'); }
export function cancelCodeTest(p,id,now=Date.now()) {
    assertWrite(p.name);
    const rows=executions(p),run=rows.find(r=>r.id===id);
    if(!run||run.runMode!=='TEST'||!['QUEUED','RUNNING'].includes(run.status))throw Error('当前测试不可取消');
    run.status='CANCELLED';run.end=now;run.reason='用户取消测试';write(executionKey(p),rows);
}
function completeTest(run) {
    // Temporary UI samples only. Never call commitOutputs or write dataset state here.
    const input=run.inputs[0];
    run.testResults=codeOutputNames(run.task).map(name=>({name,temporary:true,demo:true,
        schema:structuredClone(input?.schema||[]),data:structuredClone((input?.rows||[]).slice(0,5)),
        note:'界面演示样例，取自首个输入；尚未执行上传的 Python 代码，不代表实际加工结果。'}));
}
function commitOutputs(p, run, now) {
    if(run.runMode==='TEST')throw Error('测试运行不能发布数据集版本');
    const all = datasets(p), saved = read(datasetKey(p.name), []);
    const names = run.type === 'batch' ? run.task.tables.map(t=>run.task.outputs[t]) : run.type==='code'?codeOutputNames(run.task):[run.task.output];
    // Preflight every output before writing any dataset or allocating versions.
    const checks = run.type === 'batch' ? run.task.tables.map(table => {
        const name=run.task.outputs[table],old=all.find(d=>d.name===name);
        return inspectSchema(p,old||{name,schema:[],table},run.task);
    }) : [];
    if(checks.length){
        run.schemaChecks=checks;rememberChecks(p,checks);
        const blocked=checks.filter(c=>c.status!=='PASSED');
        if(blocked.length)throw Object.assign(Error(blocked.map(c=>c.datasetName+'：'+c.reason).join('；')),{schemaChecks:checks});
    }
    const outputs = names.map((name, i) => {
        const old = all.find(d => d.name === name);
        if (old?.producer && old.producer !== run.taskId)
            throw Error('输出生产任务已改变，请重新检查绑定');
        const fields = run.type === 'batch' ? (isCDC(run.task)?checks[i].source.fields.map(f=>f.name):run.task.fields[run.task.tables[i]]).map((name) => {const field=checks[i].source.fields.find(f=>f.name===name);if(!field)throw Error('配置字段已不在源表中：'+name);return {name,type:field.icebergType};}) : run.inputs[0]?.schema || [];
        // Samples illustrate version propagation only; never represent computed Python/flow results.
        const schema = run.type==='batch'&&isCDC(run.task)?fields:old?.schema?.length ? old.schema : fields;
        const sample = schema.map((f) => f.type === 'BOOLEAN' ? true : /INT|DECIMAL|FLOAT|DOUBLE/.test(f.type) ? 1 : f.type === 'DATE' ? '2026-10-19' : f.type === 'DATETIME' ? '2026-10-19 00:00:00' : '演示');
        const version = (old?.versionNumber || 0) + 1;
        const snapshot = { version, time: new Date(now).toISOString(), rows: 1, fields: schema.length, source: run.name, runId: run.id, ...(run.publication?{publication:run.publication}:{}), schema, data: [sample], demo: true };
        const prior = old?.versionNumber && !old.versions?.length ? [{ version: old.versionNumber, time: old.committedAt, rows: old.rowCount ?? old.rows?.length ?? 0, fields: old.schema?.length || 0, source: old.source, schema: old.schema || [], data: old.rows || [] }] : old?.versions || [];
        const record = { ...old, id: old?.id || uid(), name, group: run.type === 'batch' ? 'raw' : 'processed',
            ...(run.type==='batch'&&isCDC(run.task)?{acceptedSourceSchema:checks[i].source}:{}),
            producer: run.taskId, producerType: run.type, source: run.name, owner: old?.owner || run.actor,
            method: run.type === 'batch' ? '采集任务' : run.type === 'code' ? '代码任务' : '转换流程',
            state: '可用', hasData: true, writable: true, schema, rows: [sample], rowCount: 1,
            versionNumber: version, committedAt: snapshot.time, updated: snapshot.time, demo: true,
            versions: [snapshot, ...prior], input: run.inputs.map((d) => d.name).join('、') };
        const index = saved.findIndex(d => d.id === record.id);
        if (index >= 0)
            saved[index] = record;
        else
            saved.push(record);
        return { id: record.id, name, version };
    });
    write(datasetKey(p.name), saved);
    run.outputs=outputs;
}
const versions = (p, watch) => Object.fromEntries(watch.map(id => {
    const d = datasets(p).find(d => d.id === id);
    return [id, d && (d.hasData || d.state === '可用' || d.versionNumber != null) ? d.versionNumber || 1 : 0];
}));
export function armPlan(p, plan, now = Date.now()) {
    return { ...plan, baseline: versions(p, plan.watch || []), pending: false,
        nextAt: plan.enabled && plan.mode !== 'event' ? engine.compute(plan.rule, now).times[0] ?? null : null };
}
export function setPlanEnabled(p, id, enabled, now = Date.now()) {
    assertWrite(p.name);
    const rows = readPlans(p), plan = rows.find(r => r.id === id);
    if (!plan)
        throw Error('计划不存在');
    if (enabled && !targets(p).some(t => t.id === plan.task))
        throw Error('执行任务尚未发布');
    const next = armPlan(p, { ...plan, enabled }, now);
    if (enabled && plan.mode !== 'event' && !next.nextAt)
        throw Error('无未来触发时间');
    write(key(p.name, 'plans'), rows.map(r => r.id === id ? next : r));
}
export function tickWorkflow(p, now = Date.now()) {
    if (!cap(p.name).read)
        return;
    for (const task of tasks(p).filter(t => t.mode === 'continuous')) {
        const rows = advanceRuns(p.name, task.id, now);
        let changed = false;
        for (const r of rows.filter(r => r.demoStarted && r.status === 'RUNNING' && r.phase === 'SYNCING')) {
            // One publication per tick. A suspended local demo coalesces elapsed windows;
            // it never fabricates a separate run for each missed interval.
            r.syncStartedAt ||= new Date(Date.parse(r.start)+6000).toISOString();
            const publication=nextPublication(r,now);
            if(!publication)continue;
            try {
                const snapshot=r.task||task;
                const execution={id:r.id,taskId:task.id,type:'batch',task:snapshot,name:snapshot.name,inputs:[],actor:r.actor,publication};
                commitOutputs(p,execution,now);
                r.publications ||= [];
                r.publications.push({...publication,publishedAt:new Date(now).toISOString(),status:'SUCCEEDED',outputs:execution.outputs});
                for(const object of r.objects){const output=execution.outputs.find(o=>o.name===object.output);if(output){const data=datasets(p).find(d=>d.id===output.id);object.id=output.id;object.version=output.version;object.rows=data?.rowCount??null;object.publishedAt=new Date(now).toISOString();}}
                r.outputCommitted = true;
                changed = true;
            }
            catch (e) {
                r.schemaChecks=e.schemaChecks||[];r.reason = e.message;r.status = 'FAILED';r.end=new Date(now).toISOString();
                r.failedPublication={...publication,status:'FAILED',reason:e.message,publishedAt:new Date(now).toISOString(),outputs:[],schemaChecks:r.schemaChecks};
                for(const object of r.objects){const check=r.schemaChecks.find(c=>c.datasetName===object.output);object.state=check?.status==='BLOCKED'?'发布受阻':'发布失败';const previous=datasets(p).find(d=>d.id===check?.datasetId);if(previous){object.id=previous.id;object.version=previous.versionNumber;object.rows=previous.rowCount;object.publishedAt=previous.committedAt;}}

                changed = true;
            }
        }
        if (changed)write(runKey(p.name, task.id), rows);
    }
    const runs = executions(p);
    let changed = false;
    for (const r of runs) {
        if (!['QUEUED', 'RUNNING'].includes(r.status))
            continue;
        if (now - r.start < 900)
            continue;
        changed = true;
        if (now - r.start < 2700) {
            r.status = 'RUNNING';
            r.startedAt ??= now;
            continue;
        }
        try {
            if(r.runMode==='TEST')completeTest(r);else commitOutputs(p, r, now);
            r.status = 'SUCCEEDED';
        }
        catch (e) {
            r.status = 'FAILED';
            r.reason = e.message;
        }
        r.end = now;
    }
    if (changed)
        write(executionKey(p), runs);
    // Project runtime is independent of the viewing member's write permission.
    if (permissions(p.name).archived || new URLSearchParams(location.search).get('archived') === '1')
        return;
    const plans = readPlans(p);
    let plansChanged = false;
    for (const plan of plans) {
        if (!plan.enabled)
            continue;
        if (!('baseline' in plan)) {
            Object.assign(plan, armPlan(p, plan, now));
            plansChanged = true;
            continue;
        }
        const current = versions(p, plan.watch || []);
        const updates = (plan.watch || []).map((id) => current[id] > (plan.baseline[id] || 0));
        const due = plan.mode === 'event' ? updates.length && (plan.combo === 'all' ? updates.every(Boolean) : updates.some(Boolean)) : plan.nextAt != null && now >= plan.nextAt;
        if (!due)
            continue;
        const busy = executions(p).some(r => r.taskId === plan.task && ['QUEUED', 'RUNNING'].includes(r.status));
        if (plan.mode === 'event' && busy) {
            plan.pending = true;
            plansChanged = true;
            continue;
        }
        const target = targets(p).find(t => t.id === plan.task);
        const record = { id: uid(), at: new Date(now).toISOString(), status: '已跳过', reason: '目标任务正在运行' };
        if (!busy) {
            try {
                if (!target)
                    throw Error('目标任务未发布或不可用');
                const run = submitExecution(p, target.type, target.id, plan.id, now);
                record.status = '已提交';
                record.reason = '本地演示执行';
                record.runId = run.id;
            }
            catch (e) {
                record.status = '未提交';
                record.reason = e.message;
            }
        }
        plan.records = [record, ...(plan.records || [])];
        plan.pending = false;
        if (plan.mode === 'event')
            plan.baseline = current;
        else
            plan.nextAt = engine.compute(plan.rule, now).times[0] ?? null;
        plansChanged = true;
    }
    if (plansChanged)
        write(key(p.name, 'plans'), plans);
}
