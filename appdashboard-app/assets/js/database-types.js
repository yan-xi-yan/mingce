// Connection metadata for the frontend demo; these are not backend connectors.
export const databaseTypes={
 MYSQL:{label:'MySQL',port:'3306',description:'连接 MySQL 关系型数据库',databaseLabel:'数据库名称',databasePlaceholder:'例如 sales'},
 POSTGRESQL:{label:'PostgreSQL',port:'5432',description:'连接 PostgreSQL（pgsql）数据库',databaseLabel:'数据库名称',databasePlaceholder:'例如 analytics'},
 ORACLE:{label:'Oracle',port:'1521',description:'连接 Oracle Database',databaseLabel:'服务名称（Service Name）',databasePlaceholder:'例如 ORCLPDB1'},
 SQLSERVER:{label:'SQL Server',port:'1433',description:'连接 Microsoft SQL Server',databaseLabel:'数据库名称',databasePlaceholder:'例如 reporting'}
};
export const databaseType=connection=>connection.connectorType||'MYSQL';
export const databaseLabel=connection=>databaseTypes[databaseType(connection)]?.label||'未知类型';
