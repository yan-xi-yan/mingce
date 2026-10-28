import {sourceCatalog} from '../source-catalog.js';
import {uuid} from '../uuid.js';
export const engine = globalThis.MingceSchedule;
export const uid = uuid;
export function read(key, fallback) {
    try {
        return JSON.parse(sessionStorage.getItem(key) || 'null') ?? fallback;
    }
    catch {
        return fallback;
    }
}
export function write(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
}
export const projectKey = 'mingce.appdashboard.projects.v1';
export const initialProjects = [{
        name: '销售数据工程',
        empty: false
    }, {
        name: '供应链分析',
        empty: true
    }];
export const key = (project, kind) => 'mingce.appdashboard.' + kind + '.v1.' + project;
export const catalog=Object.fromEntries(Object.entries(sourceCatalog).map(([name,meta])=>[name,meta.fields.map(([field])=>field)]));

export function connections(p) {
    return read(key(p.name, 'connections'), p.empty ? [] : [{
            id: 'orders-db',
            name: '订单业务库',
            connectorType: 'MYSQL',
            description: '订单业务数据访问',
            host: 'analytics-db.internal',
            database: 'sales',
            port: '3306',
            user: 'sales_reader',
            test: '成功（示例）'
        }]);
}
export function tasks(p) {
    return read(key(p.name, 'tasks'), p.empty ? [] : [{
            id: 'batch',
            name: '订单批量采集',
            connection: '订单业务库',
            mode: 'full',
            tables: ['orders'],
            fields: {
                orders: catalog.orders
            },
            outputs: {
                orders: 'orders_raw'
            },
            published: true
        }, ...[{
                id: 'ingest-orders',
                name: '订单持续采集',
                table: 'orders'
            }, {
                id: 'ingest-customers',
                name: '客户变更采集',
                table: 'customers'
            }, {
                id: 'ingest-archive',
                name: '订单归档采集',
                table: 'orders'
            }, {
                id: 'ingest-refunds',
                name: '退款记录采集',
                table: 'refunds'
            }].map(t => ({
            id: t.id,
            name: t.name,
            connection: '订单业务库',
            mode: 'continuous',
            tables: [t.table],
            fields: {
                [t.table]: catalog[t.table]
            },
            outputs: {
                [t.table]: t.table + '_raw'
            },
            published: true
        }))]);
}
export const modeNames = {
    full: '全量读取',
    incremental: '递增字段读取',
    continuous: '持续变更采集'
};
