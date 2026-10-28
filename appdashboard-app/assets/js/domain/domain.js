import {validateCodeBindings,codeBindingIssue} from '../code-bindings.js';
import { read, write, tasks, key, uid, engine } from "./store.js";
export const users = [{
        id: 'zhang',
        name: '张敏',
        orgRole: '组织管理员'
    }, {
        id: 'li',
        name: '李明',
        orgRole: '组织成员'
    }, {
        id: 'wang',
        name: '王琳',
        orgRole: '组织成员'
    }, {
        id: 'chen',
        name: '陈杰',
        orgRole: '组织成员'
    }, {
        id: 'zhou',
        name: '周航',
        orgRole: '组织成员'
    }, {
        id: 'liu',
        name: '刘悦',
        orgRole: '组织成员'
    }];
export const roleNames = {
    owner: '负责人',
    admin: '管理员',
    developer: '开发者',
    viewer: '只读成员'
};
export const actor = () => new URLSearchParams(location.search).get('as') || 'zhang';
export const person = (id) => users.find(u => u.id === id)?.name || '未知成员';
export function permissionKey(project) {
    return 'mingce-appdashboard-permissions-v1:' + project;
}
export function permissions(project) {
    const fallback = {
        version: 1,
        revision: 1,
        archived: false,
        members: project === '销售数据工程' ? [{
                id: 'zhang',
                role: 'owner',
                download: true
            }, {
                id: 'li',
                role: 'admin',
                download: false
            }, {
                id: 'wang',
                role: 'developer',
                download: true
            }, {
                id: 'chen',
                role: 'viewer',
                download: false
            }] : project === '供应链分析' ? [{
                id: 'li',
                role: 'owner',
                download: true
            }, {
                id: 'zhang',
                role: 'developer',
                download: false
            }] : [{
                id: 'zhang',
                role: 'owner',
                download: true
            }],
        creators: ['zhang', 'li'],
        schedules: [],
        events: []
    };
    try {
        const s = JSON.parse(localStorage.getItem(permissionKey(project)) || 'null');
        if (s?.version === 1 && Number.isInteger(s.revision) && Array.isArray(s.members) && s.members.every((m) => users.some(u => u.id === m.id) && roleNames[m.role]) && new Set(s.members.map((m) => m.id)).size === s.members.length && s.members.filter((m) => m.role === 'owner').length === 1 && Array.isArray(s.creators) && Array.isArray(s.schedules) && Array.isArray(s.events))
            return s;
    }
    catch { }
    return fallback;
}
export function cap(project, id = actor()) {
    const s = permissions(project), m = s.members.find((m) => m.id === id), archived = s.archived || new URLSearchParams(location.search).get('archived') === '1';
    return {
        role: m?.role,
        read: !!m,
        write: !!m && !archived && m.role !== 'viewer',
        manage: !!m && !archived && ['owner', 'admin'].includes(m.role),
        owner: !!m && !archived && m.role === 'owner',
        download: !!m && (m.role === 'owner' || m.download === true || m.allowDataDownload === true)
    };
}
export const orgKey = 'mingce-appdashboard-org-v1:east';
export function orgState() {
    try {
        return JSON.parse(localStorage.getItem(orgKey) || 'null') || {
            version: 1,
            revision: 1,
            creators: ['zhang', 'li']
        };
    }
    catch {
        return {
            version: 1,
            revision: 1,
            creators: ['zhang', 'li']
        };
    }
}
export function canCreate() {
    return orgState().creators.includes(actor()) || users.find(u => u.id === actor())?.orgRole === '组织管理员';
}
export function assertWrite(project) {
    if (!cap(project).write)
        throw Error('当前角色或项目状态不允许修改');
}
export const codeKey = (p) => 'mingce.appdashboard.code.v1.' + p;
export function codes(p) {
    return read(codeKey(p.name), p.empty ? [] : [{
            id: 'code-channel-daily',
            name: '渠道指标计算',
            description: '按日期和渠道汇总订单',
            configStatus: 'READY',
            published: true,
            revision: 1,
            updatedBy: '张敏',
            updatedAt: '2026-10-19T10:00:00+08:00',
            fileName: 'channel-metrics.zip',
            inputs: ['orders'],
            output: '销售日报',
            existing: false,
            run: null
        }, {
            id: 'code-quality-check',
            name: '数据质量规则',
            description: '检查订单数据质量',
            configStatus: 'DRAFT',
            revision: 1,
            updatedBy: '张敏',
            updatedAt: '2026-10-18T10:00:00+08:00',
            inputs: ['orders'],
            output: '质量校验结果',
            existing: false,
            run: null
        }]);
}
export function saveCode(p, task) {
    assertWrite(p.name);
    task={...task,id:task.id||uid()};
    const rows = codes(p);
    if(read(key(p.name,'executions'),[]).some(run=>run.taskId===task.id&&['QUEUED','RUNNING'].includes(run.status)))throw Error('任务正在运行，请等待本次运行结束后再修改配置');
    if (!task.name.trim() || task.name.length > 100 || /[\x00-\x1f\x7f]/.test(task.name))
        throw Error('任务名称需为 1～100 字');
    if (rows.some(t => t.id !== task.id && t.name === task.name.trim()))
        throw Error('当前项目已有同名代码任务');
    if (task.description.length > 500)
        throw Error('用途说明不能超过 500 字');
    const binding=validateCodeBindings(task,datasets(p),rows);
    const next={...task,name:task.name.trim(),revision:(rows.find(t=>t.id===task.id)?.revision||0)+1,published:task.configStatus==='READY'&&!!task.fileName,updatedBy:person(actor()),updatedAt:new Date().toISOString()};
    const outputs=binding.outputs.map(b=>{const output=b.target?{...b.target}:{id:uid(),name:b.outputName,group:'processed',schema:[],rows:[],state:'待产出',hasData:false,rowCount:0,versionNumber:null,versions:[],writable:true,owner:person(actor())};Object.assign(output,{producer:task.id,producerType:'code',source:next.name,method:'代码任务',input:binding.inputs.map(d=>d.name).join('、'),updated:next.updatedAt});return output;});
    next.outputBindings=binding.outputs.map((b,i)=>({name:b.outputName,mode:b.mode,datasetId:outputs[i].id,reference:b.reference,replaceAcknowledged:!!b.replaceAcknowledged}));
    next.output=next.outputBindings[0].name;next.outputId=outputs[0].id;
    const retainedIds=new Set(outputs.map(o=>o.id));
    const detached=read(datasetKey(p.name),[]).filter(data=>!retainedIds.has(data.id)).map(data=>data.producer===task.id?{...data,producer:null,producerType:null,source:'已解除代码任务绑定',input:''}:data);

    const dataKey=datasetKey(p.name),jobKey=codeKey(p.name),snapshots=[dataKey,jobKey].map(key=>[key,sessionStorage.getItem(key)]);
    try{
        write(dataKey,[...detached,...outputs]);
        write(jobKey,[...rows.filter(job=>job.id!==task.id),next]);
    }catch(error){for(const [key,value]of snapshots){if(value===null)sessionStorage.removeItem(key);else sessionStorage.setItem(key,value);}throw error;}

}
export const datasetKey = (p) => 'mingce.appdashboard.datasets.v1.' + p;
const orderDetails = {
    "schema": [{
            "name": "order_id",
            "type": "BIGINT"
        }, {
            "name": "customer_id",
            "type": "BIGINT"
        }, {
            "name": "amount",
            "type": "DECIMAL(18,2)"
        }, {
            "name": "order_date",
            "type": "DATE"
        }, {
            "name": "status",
            "type": "STRING"
        }],
    "rows": [["10001", "2001", "128.00", "2026-10-14", "已支付"], ["10002", "2002", "299.00", "2026-10-14", "已支付"], ["10003", "2001", "68.00", "2026-10-14", "已支付"], ["10004", "2003", "0.00", "2026-10-14", "已关闭"], ["10005", "2004", "158.50", "2026-10-14", "待支付"], ["10006", "2002", "599.00", "2026-10-14", "已支付"], ["10007", "2005", "89.90", "2026-10-14", "已关闭"], ["10008", "2003", "320.00", "2026-10-14", "已支付"]],
    "versionNumber": 12,
    "rowCount": 12846,
    "committedAt": "2026-10-14T10:20:00+08:00"
};
export function datasets(p) {
    const saved = read(datasetKey(p.name), []);
    return [...(p.empty ? [] : globalThis.MingceDemoDatasets || []).filter((d) => !saved.some(s => s.id === d.id)).map((d) => d.id === 'orders' ? {
            ...d,
            ...orderDetails
        } : d), ...saved].map(d=>['手动创建','手工录入','手动录入'].includes(d.method)&&!d.hasData&&['待产出','待导入'].includes(d.state)?{...d,state:'待录入'}:d);
}
export const dataTypes = ['STRING', 'BIGINT', 'DECIMAL(18,2)', 'DATE', 'DATETIME', 'BOOLEAN'];
export function saveDataset(p, data) {
    assertWrite(p.name);
    if (!data.name.trim() || data.name.length > 100)
        throw Error('数据集名称需为 1～100 字');
    if (datasets(p).some(d => d.name === data.name.trim()))
        throw Error('当前项目已有同名数据集');
    const record = {
        writable:true,
        ...data,
        id: uid(),
        name: data.name.trim(),
        owner: person(actor()),
        updated: '刚刚',
        committedAt: data.versionNumber != null || data.hasData ? new Date().toISOString() : null
    };
    write(datasetKey(p.name), [...read(datasetKey(p.name), []), record]);
    return record;
}
export const runKey = (p, t) => 'mingce-appdashboard-run-v1:' + JSON.stringify([p, t]);
const runSeeds = [{
        id: 'ingest-orders',
        name: '订单持续采集',
        table: 'orders',
        status: 'STOPPED'
    }, {
        id: 'ingest-customers',
        name: '客户变更采集',
        table: 'customers',
        status: 'RUNNING'
    }, {
        id: 'ingest-archive',
        name: '订单归档采集',
        table: 'orders',
        status: 'FAILED'
    }, {
        id: 'ingest-refunds',
        name: '退款记录采集',
        table: 'refunds',
        status: 'NOT_RUN'
    }];
function seedRuns(project, taskId) {
    const known = runSeeds.find(t => t.id === taskId);
    const currentObjects = () => [{
            table: 'sales.' + known?.table,
            output: known?.table + '_raw'
        }];
    if (!known || known.status === 'NOT_RUN' || project !== '销售数据工程')
        return [];
    const list = [['2026-10-16T08:00:00+08:00', known.status, 'MANUAL', 'SYNCING'], ['2026-10-15T08:00:00+08:00', 'STOPPED', 'MANUAL', 'SYNCING'], ['2026-10-14T08:00:00+08:00', 'FAILED', 'MANUAL', 'CHECK'], ['2026-10-13T08:00:00+08:00', 'PARTIAL_FAILED', 'SCHEDULE', 'INITIALIZING'], ['2026-10-12T08:00:00+08:00', 'STOPPED', 'SCHEDULE', 'SYNCING'], ['2026-10-11T08:00:00+08:00', 'FAILED', 'MANUAL', 'CHECK']];
    return list.map(([start, status, trigger, phase], i) => {
        if (status === 'FAILED')
            phase = 'CHECK';
        const objects = currentObjects();
        if (status === 'PARTIAL_FAILED' && objects.length === 1)
            objects.push({
                table: 'sales.customer_contacts',
                output: 'customer_contacts_raw'
            });
        return {
            id: 'RUN-' + start.slice(0, 10).replaceAll('-', '') + '-' + (106 - i),
            status,
            trigger,
            actor: trigger === 'MANUAL' ? '张敏' : '客户数据同步',
            start,
            end: status === 'RUNNING' ? null : new Date(Date.parse(start) + (status === 'FAILED' ? 18 : status === 'PARTIAL_FAILED' ? 180 : 7200) * 1000).toISOString(),
            phase,
            configRevision: 'ingestion-r' + (i < 2 ? 3 : 2),
            objects: objects.map((o, j) => ({
                ...o,
                state: status === 'FAILED' ? '未开始' : status === 'PARTIAL_FAILED' && j === 1 ? '失败' : status === 'RUNNING' ? '同步中' : status === 'STOPPED' ? '已停止' : '初始化完成',
                version: status === 'FAILED' || status === 'PARTIAL_FAILED' && j === 1 ? null : 12 - i,
                rows: status === 'FAILED' || status === 'PARTIAL_FAILED' && j === 1 ? null : 12846 - i * 80,
                publishedAt: status === 'FAILED' || status === 'PARTIAL_FAILED' && j === 1 ? null : new Date(Date.parse(start) + 120000).toISOString()
            })),
            reason: status === 'FAILED' ? '源端账号缺少日志读取权限，启动检查未通过。' : status === 'PARTIAL_FAILED' ? 'sales.customer_contacts 的字段结构已变化，本次采集已终止。' : '',
            stopBy: status === 'STOPPED' ? '张敏' : null
        };
    });
}
export function runs(p, t) {
    return read(runKey(p, t), seedRuns(p, t));
}
export function advanceRuns(p, t) {
    let changed = false;
    const rows = runs(p, t);
    for (const r of rows) {
        if (r.status === 'STOPPING' && Date.now() - Date.parse(r.stopRequestedAt) > 1600) {
            r.status = 'STOPPED';
            r.end = new Date(Date.parse(r.stopRequestedAt) + 1600).toISOString();
            r.objects.forEach((o) => {
                if (!['失败', '未开始'].includes(o.state))
                    o.state = '已停止';
            });
            changed = true;
        }
        if (r.demoStarted && r.status === 'RUNNING' && r.phase !== 'SYNCING') {
            const elapsed = Date.now() - Date.parse(r.start), phase = elapsed > 6000 ? 'SYNCING' : elapsed > 1800 ? 'INITIALIZING' : 'CHECK';
            if (phase !== r.phase) {
                r.phase = phase;
                r.objects.forEach((o) => {
                    o.state = phase === 'SYNCING' ? '同步中' : '初始化中';
                    if (phase === 'SYNCING') {
                        o.version = 1;
                        o.rows = 12846;
                        o.publishedAt = new Date(Date.parse(r.start) + 6000).toISOString();
                    }
                });
                changed = true;
            }
        }
    }
    if (changed)
        write(runKey(p, t), rows);
    return rows;
}
export function startIngest(p, task) {
    assertWrite(p.name);
    if (!task.published || task.mode !== 'continuous')
        throw Error('当前原型仅支持已发布的持续采集任务运行');
    const rows = runs(p.name, task.id);
    if (rows.some(r => ['RUNNING', 'STOPPING'].includes(r.status)))
        throw Error('该任务已有运行，不能重复启动');
    const run = {
        id: 'RUN-DEMO-' + Date.now().toString(36).toUpperCase(),
        status: 'RUNNING',
        trigger: 'MANUAL',
        actor: person(actor()),
        start: new Date().toISOString(),
        end: null,
        phase: 'CHECK',
        demoStarted: true,
        objects: task.tables.map((t) => ({
            table: 'sales.' + t,
            output: task.outputs[t],
            state: '未开始',
            version: null,
            rows: null,
            publishedAt: null
        })),
        reason: ''
    };
    run.configRevision='ingestion-r'+(task.revision||1);run.task=structuredClone(task);
    write(runKey(p.name, task.id), [run, ...rows]);
    return run;
}
export function stopIngest(p, task, id) {
    assertWrite(p.name);
    const rows = runs(p.name, task.id), r = rows.find(r => r.id === id);
    if (r?.status !== 'RUNNING')
        throw Error('当前无法停止本次采集');
    r.status = 'STOPPING';
    r.stopRequestedAt = new Date().toISOString();
    r.stopBy = person(actor());
    write(runKey(p.name, task.id), rows);
}
export function targets(p) {
    return [...tasks(p).filter(t => t.published && t.mode !== 'continuous').map(t => ({
            id: t.id,
            name: t.name,
            type: 'batch',
            inputs: [],
            published: true
        })), ...codes(p).filter(t => t.configStatus==='READY'&&!!t.fileName&&!codeBindingIssue(t,datasets(p),codes(p))).map(t => ({
            id: t.id,
            name: t.name,
            type: 'code',
            inputs: t.inputs || ['orders', 'customers'],
            published: true
        })), ...flows(p).filter(t => t.published).map(t => ({ id: t.id, name: t.name, type: 'flow', inputs: t.inputs, published: true }))];
}
export function flows(p) {
    return read(key(p.name, 'flows'), p.empty ? [] : [
        { id: 'flow-orders', name: '订单清洗', inputs: ['orders'], output: '清洗后订单', published: true, revision: 1 },
        { id: 'flow-daily', name: '销售日报汇总', inputs: ['orders'], output: '销售日报', published: true, revision: 1 },
        { id: 'flow-customers', name: '客户信息标准化', inputs: ['customers_dim'], output: '标准客户表', published: true, revision: 1 },
        { id: 'flow-stock', name: '库存口径校验', inputs: [], output: '', published: false, revision: 1 }
    ]);
}
export function download(name, text, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], {
        type
    }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function readPlans(p) {
    return read(key(p.name, 'plans'), p.empty ? [] : [{
            id: 'seed-daily',
            name: '每日销售更新',
            description: '每天更新销售日报',
            task: 'code-channel-daily',
            mode: 'time',
            rule: engine.defaults('08:00'),
            watch: [],
            combo: 'any',
            enabled: true,
            executionIdentity: 'PROJECT_RUNTIME',
            createdBy: 'wang',
            records: []
        }, {
            id: 'seed-event',
            name: '基础数据联动更新',
            description: '订单明细有新版本时触发订单清洗',
            task: 'flow-orders',
            mode: 'event',
            rule: engine.defaults('08:00'),
            watch: ['orders'],
            combo: 'any',
            enabled: false,
            executionIdentity: 'PROJECT_RUNTIME',
            createdBy: 'li',
            records: []
        }]);
}
