import {sourceCatalog} from './source-catalog.js';
export const isCDC=f=>f.method==='CDC'||!f.method&&f.mode==='continuous';
export const queryMode=(f,t)=>f.jdbc?.tables?.[t]?.queryMode||(f.jdbc?.tables?.[t]?.sql?.trim()?'sql':'graphical');
export const schemaBasis=f=>isCDC(f)?'已接受的完整源表结构与当前源表结构':'查询结果结构及查询依赖';
export function sourceFields(f,t){return f.sourceSchemas?.[t]?.fields||sourceCatalog[t]?.fields.map(([name,type])=>({name,type}))||[];}
export function normalizeCDC(f){if(isCDC(f))for(const t of f.tables)f.fields[t]=sourceFields(f,t).map(field=>field.name);}
export function validateSelection(f){
 if(!f.tables.length)throw Error('请至少选择一张源表');
 for(const t of f.tables){
  if(!isCDC(f)&&queryMode(f,t)==='sql'){
   const sql=f.jdbc.tables[t].sql?.trim();
   if(!sql)throw Error(t+'：请填写 SQL 查询');
   if(!/^select\s/i.test(sql)||/;/.test(sql))throw Error(t+'：仅支持单条 SELECT 查询，请勿包含分号');
  }else if(!f.fields[t]?.length)throw Error(t+'：请至少选择一个字段');
 }
}
