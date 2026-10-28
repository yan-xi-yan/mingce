// Rules moved unchanged from 文件导入.js.
// @ts-nocheck
function fail(message, line, column) {
    throw Error(message + (line ? `（第 ${line} 行，第 ${column} 列）` : ''));
}
function csv(text) {
    if (!text.trim().length)
        fail('文件为空，请选择包含字段结构的 CSV');
    let records = [], row = [], cell = '', quoted = false, closed = false, start = true, line = 1, column = 1;
    const push = () => {
        row.push(cell);
        cell = '';
        closed = false;
        start = true;
    };
    for (let i = 0; i < text.length; i++) {
        let ch = text[i];
        if (quoted) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i++;
                    column++;
                }
                else {
                    quoted = false;
                    closed = true;
                }
            }
            else {
                cell += ch;
                if (ch === '\n') {
                    line++;
                    column = 0;
                }
            }
        }
        else if (closed && ch !== ',' && ch !== '\r' && ch !== '\n')
            fail('结束引号后只能是分隔符或换行', line, column);
        else if (ch === '"') {
            if (!start)
                fail('未加引号字段中出现引号', line, column);
            quoted = true;
            start = false;
        }
        else if (ch === ',')
            push();
        else if (ch === '\r' || ch === '\n') {
            push();
            records.push(row);
            row = [];
            if (ch === '\r' && text[i + 1] === '\n')
                i++;
            line++;
            column = 0;
        }
        else {
            cell += ch;
            start = false;
        }
        column++;
    }
    if (quoted)
        fail('引号未闭合', line, column);
    if (cell !== '' || row.length || closed || !/[\r\n]$/.test(text)) {
        push();
        records.push(row);
    }
    return records;
}
function value(raw, type) {
    if (type === 'STRING')
        return raw;
    if (raw === '')
        return null;
    if (type === 'BIGINT') {
        if (!/^-?\d+$/.test(raw) || BigInt(raw) < -9223372036854775808n || BigInt(raw) > 9223372036854775807n)
            fail('不是有效长整数');
        return raw;
    }
    if (type === 'DECIMAL(18,2)') {
        if (!/^-?\d{1,16}(\.\d{1,2})?$/.test(raw))
            fail('小数需最多 16 位整数和 2 位小数');
        return raw;
    }
    if (type === 'BOOLEAN') {
        if (!['true', 'false'].includes(raw))
            fail('布尔值必须是 true 或 false');
        return raw === 'true';
    }
    const date = type === 'DATE', normalized = raw.replace(' ', 'T');
    if (!(date ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/).test(normalized))
        fail(date ? '日期格式应为 YYYY-MM-DD' : '日期时间格式应为 YYYY-MM-DD HH:mm:ss');
    const v = new Date(normalized + (date ? 'T00:00:00Z' : 'Z'));
    if (Number.isNaN(v.getTime()) || v.toISOString().slice(0, date ? 10 : 19) !== normalized)
        fail('日期或时间不存在');
    return raw;
}
export { csv, value };
