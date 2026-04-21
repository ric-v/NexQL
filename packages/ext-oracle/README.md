# NexQL - Oracle

Oracle Database extension for [NexQL](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql).

## Requirements

- [NexQL Core Extension](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql) must be installed

## Features

- **Schema Explorer** — Browse Oracle schemas, tables, views, indexes, sequences, packages, procedures, and functions
- **SQL IntelliSense** — PL/SQL keyword completion, built-in function suggestions, and system schema filtering
- **Query Templates** — Oracle-specific SQL generation with proper syntax (FETCH FIRST n ROWS ONLY, bind variables, DUAL table)
- **Monitoring Dashboard** — Real-time insights via V$SESSION, V$SQL, V$DATABASE, and DBA_DATA_FILES
- **Type Classification** — Accurate categorization of Oracle data types (NUMBER, VARCHAR2, DATE, TIMESTAMP, CLOB, etc.)
- **Transaction Support** — Implicit transaction model with COMMIT, ROLLBACK, and SAVEPOINT support

## Oracle-Specific Details

- **Schemas** map to database users (owner-based model)
- **Pagination** uses `FETCH FIRST n ROWS ONLY` (Oracle 12c+) or `ROWNUM` for older versions
- **No native BOOLEAN** before Oracle 23c — uses NUMBER(1) with 0/1 convention
- **Sequences** with NEXTVAL/CURRVAL for auto-generated keys
- **PL/SQL** procedural language for packages, procedures, functions, and triggers
- **Identifier quoting** uses double quotes: `"schema"."table"`

## Connection Types

| Type | Description |
|------|-------------|
| Basic | Host, port, and service name/SID |
| TNS | TNS alias from tnsnames.ora |
| LDAP | Oracle Net name resolution via LDAP directory |

## Related Extensions

- [NexQL Core](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql) — Required core extension
- [NexQL - MSSQL](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql-mssql) — SQL Server support
- [NexQL - MySQL](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql-mysql) — MySQL support

## Marketplace

**ID:** `ric-v.nexql-oracle`

## License

MIT
