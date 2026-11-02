// Pure snapshot operations. Never substitute current data for an unavailable old version.
export function datasetVersions(record){
 const versions=(record.versions||[]).filter(v=>v.version!=null).map(v=>({...v}));
 if(record.versionNumber!=null&&!versions.some(v=>String(v.version)===String(record.versionNumber)))versions.push({version:record.versionNumber,time:record.committedAt,rows:record.rowCount??record.rows?.length,source:record.source,schema:record.schema,data:record.rows,demo:record.demo});
 return versions.map(v=>{const current=String(v.version)===String(record.versionNumber);return {...v,schema:v.schema??(current?record.schema:undefined),data:v.data??(current?record.rows:undefined)};}).sort((a,b)=>Number(a.version)-Number(b.version));
}
export function snapshotAt(record,version){const versions=datasetVersions(record);return version==null||version===''?versions.find(v=>String(v.version)===String(record.versionNumber))||versions.at(-1):versions.find(v=>String(v.version)===String(version));}
export function rowsOf(snapshot){return Array.isArray(snapshot?.data)&&Array.isArray(snapshot?.schema)?snapshot.data.map(row=>Object.fromEntries(snapshot.schema.map((f,i)=>[f.name,Array.isArray(row)?row[i]:row?.[f.name]]))):null;}
export function snapshotBefore(record,date){const at=typeof date==='number'?date:Date.parse(date);return datasetVersions(record).filter(v=>Number.isFinite(Date.parse(v.time))&&Date.parse(v.time)<=at).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time)||Number(a.version)-Number(b.version)).at(-1);}
export const cellText=value=>value===undefined?'未提供':value===null?'NULL':value===''?'（空字符串）':typeof value==='object'?JSON.stringify(value):String(value);
const signature=value=>JSON.stringify(value===undefined?['undefined']:value===null?['null']:[typeof value,value]);
export function schemaChanges(before,after){const a=new Map((before||[]).map(c=>[c.name,c])),b=new Map((after||[]).map(c=>[c.name,c]));return [...new Set([...a.keys(),...b.keys()])].map(name=>({name,before:a.get(name)?.type,after:b.get(name)?.type,status:!a.has(name)?'added':!b.has(name)?'removed':a.get(name).type!==b.get(name).type?'changed':'same'}));}
export function compareSnapshots(before,after,key=''){
 const left=rowsOf(before),right=rowsOf(after),schemaKnown=Array.isArray(before?.schema)&&Array.isArray(after?.schema),schema=schemaKnown?schemaChanges(before.schema,after.schema):[];
 const result={schema,schemaKnown,changes:[],added:0,removed:0,modified:0,unchanged:0,available:left!==null&&right!==null,partial:!before||!after||before.rows!==left?.length||after.rows!==right?.length||before.dataComplete===false||after.dataComplete===false};
 if(!result.available)return result;
 if(key){
  if(!before.schema.some(f=>f.name===key)||!after.schema.some(f=>f.name===key))throw Error('关联键必须同时存在于两个版本中');
  for(const rows of [left,right]){const values=rows.map(r=>signature(r[key]));if(rows.some(r=>r[key]==null||r[key]==='')||new Set(values).size!==values.length)throw Error('所选关联键包含空值或重复值，请选择唯一字段，或使用整行比较');}
  const a=new Map(left.map(r=>[signature(r[key]),r])),b=new Map(right.map(r=>[signature(r[key]),r]));
  for(const id of new Set([...a.keys(),...b.keys()])){const previous=a.get(id),next=b.get(id),fields=schema.filter(c=>signature(previous?.[c.name])!==signature(next?.[c.name])).map(c=>c.name);const status=!previous?'added':!next?'removed':fields.length?'modified':'same';if(status==='same')result.unchanged++;else{result[status]++;result.changes.push({status,key:cellText((next||previous)[key]),before:previous,after:next,fields});}}
 }else{
  const names=schema.map(c=>c.name),rowKey=row=>JSON.stringify(names.map(n=>signature(row[n]))),remaining=new Map();
  for(const row of left){const id=rowKey(row);if(!remaining.has(id))remaining.set(id,[]);remaining.get(id).push(row);}
  for(const row of right){const same=remaining.get(rowKey(row));if(same?.length){same.pop();result.unchanged++;}else{result.added++;result.changes.push({status:'added',after:row,fields:names});}}
  for(const rows of remaining.values())for(const row of rows){result.removed++;result.changes.push({status:'removed',before:row,fields:names});}
 }
 return result;
}
export function previewRows(snapshot,{query='',column='',sort='',direction='asc',limit=20,page=0}={}){
 let rows=rowsOf(snapshot);if(rows===null)return {available:false,rows:[],total:0,pages:0,page:0};
 const needle=query.trim().toLocaleLowerCase(),names=column?[column]:(snapshot.schema||[]).map(c=>c.name);
 if(needle)rows=rows.filter(r=>names.some(n=>cellText(r[n]).toLocaleLowerCase().includes(needle)));
 if(sort){const type=snapshot.schema.find(c=>c.name===sort)?.type||'',numeric=/INT|LONG|DOUBLE|FLOAT|DECIMAL|NUMERIC/i.test(type);rows=[...rows].sort((a,b)=>{const x=a[sort],y=b[sort];let order=x==null?(y==null?0:-1):y==null?1:numeric&&Number.isFinite(Number(x))&&Number.isFinite(Number(y))?Number(x)-Number(y):cellText(x).localeCompare(cellText(y),'zh-CN',{numeric:true});return direction==='desc'?-order:order;});}
 const pages=Math.ceil(rows.length/limit),safePage=Math.max(0,Math.min(page,Math.max(0,pages-1)));
 return {available:true,rows:rows.slice(safePage*limit,(safePage+1)*limit),total:rows.length,pages,page:safePage};
}
export function columnProfile(snapshot,name){const rows=rowsOf(snapshot);if(!rows)return null;const values=rows.map(r=>r[name]),present=values.filter(v=>v!=null);return {count:rows.length,nulls:values.length-present.length,distinct:new Set(present.map(signature)).size,samples:[...new Set(present.map(cellText))].slice(0,4)};}
