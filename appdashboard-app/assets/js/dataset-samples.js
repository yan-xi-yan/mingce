/* Shared metadata for the built-in demo datasets. */
globalThis.MingceDemoDatasets=[
 {id:'orders',name:'订单明细',group:'raw',description:'订单原始记录，供清洗流程使用',method:'采集',source:'订单持续采集',kind:'采集任务',producer:'ingest-orders',table:'orders',input:'订单业务库 / sales.orders',state:'可用',owner:'张敏',updated:'10-14 10:20'},
 {id:'refunds',name:'退款明细',group:'raw',description:'从退款文件导入的原始记录',method:'文件导入',source:'退款明细_20261013.csv',kind:'导入文件',input:'本地上传',state:'可用',owner:'王琳',updated:'10-13 17:40'},
 {id:'inventory',name:'库存快照',group:'raw',description:'库存源表采集结果',method:'采集',source:'库存数据采集',kind:'采集任务',input:'库存业务库 / inventory.stock',state:'可用',owner:'李明',updated:'10-13 16:30'},
 {id:'channel',name:'渠道字典',group:'raw',description:'销售渠道名称与编码',method:'手工录入',source:'渠道字典录入',kind:'录入记录',input:'表格录入',state:'待录入',owner:'张敏',updated:'10-13 15:10'},
 {id:'customers_dim',name:'客户维度',group:'processed',description:'统一客户基础信息',method:'转换',source:'客户信息整合',kind:'转换流程',input:'标准客户表、客户标签',upstream:'加工数据',state:'可用',owner:'李明',updated:'10-14 10:12'},
 {id:'orders_cleaned',name:'清洗后订单',group:'processed',description:'完成去重与字段规范化的订单',method:'转换',source:'订单清洗',kind:'转换流程',input:'订单明细',upstream:'原始数据',state:'可用',owner:'李明',updated:'10-14 09:50'},
 {id:'customers_standard',name:'标准客户表',group:'processed',description:'统一客户编码后的标准数据',method:'转换',source:'客户编码标准化',kind:'转换流程',input:'客户原始表',upstream:'原始数据',state:'可用',owner:'张敏',updated:'10-14 09:35'},
 {id:'sales_daily',name:'销售日报',group:'processed',description:'按日期汇总销售指标',method:'代码任务',source:'渠道日报计算',kind:'代码任务',producer:'code-channel-daily',sourcePage:'20-代码配置详情.html',input:'清洗后订单、客户维度',upstream:'加工数据',state:'可用',owner:'王琳',updated:'10-14 09:20'}
];
