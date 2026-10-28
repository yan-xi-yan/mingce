// Example metadata and rows carried over from 采集对象配置.js.
// These do not come from a live customer database.
export const sourceCatalog={
 orders:{key:'order_id',fields:[['order_id','bigint'],['customer_id','bigint'],['amount','decimal(18,2)'],['order_date','date'],['status','varchar(32)'],['remark','text']],rows:[[10001,501,'128.00','2026-10-14','已支付',''],[10002,502,'299.00','2026-10-14','待支付','加急']]},
 customers:{key:'customer_id',fields:[['customer_id','bigint'],['customer_name','varchar(100)'],['city','varchar(64)'],['created_at','timestamp']],rows:[[501,'华东商贸','上海','2026-10-12 09:30'],[502,'明远科技','杭州','2026-10-13 11:20']]},
 refunds:{key:'refund_id',fields:[['refund_id','bigint'],['order_id','bigint'],['refund_amount','decimal(18,2)'],['refund_date','date']],rows:[[20001,10001,'28.00','2026-10-14'],[20002,10002,'99.00','2026-10-14']]}
};
