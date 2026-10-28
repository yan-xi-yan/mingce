// Connection metadata for the frontend demo; these are not backend connectors.
export const databaseTypes={
 MYSQL:{label:'MySQL',port:'3306'},
 POSTGRESQL:{label:'PostgreSQL',port:'5432'},
 SQLSERVER:{label:'SQL Server',port:'1433'},
 ORACLE:{label:'Oracle',port:'1521'}
};
export const databaseType=connection=>connection.connectorType||'MYSQL';
export const databaseLabel=connection=>databaseTypes[databaseType(connection)]?.label||'未知类型';
