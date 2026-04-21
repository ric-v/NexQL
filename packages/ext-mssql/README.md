# NexQL - MSSQL

Microsoft SQL Server database extension for [NexQL](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql).

## Overview

This extension adds Microsoft SQL Server (MSSQL) support to NexQL, providing schema exploration, query execution, IntelliSense, and monitoring capabilities for SQL Server databases.

## Requirements

- [NexQL Core Extension](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql) must be installed
- SQL Server 2016 or later recommended

## Features

- **Schema Explorer** — Browse databases, schemas, tables, views, stored procedures, and functions
- **Query Execution** — Run T-SQL queries with parameterized query support
- **IntelliSense** — T-SQL keyword and function completion
- **Query Plans** — View execution plans via SET SHOWPLAN_XML ON
- **Monitoring Dashboard** — Active sessions, database size, performance stats, and slow queries
- **SQL Templates** — Generate INSERT, UPDATE, DELETE, CREATE TABLE with MSSQL syntax
- **Transaction Support** — BEGIN TRANSACTION, COMMIT, ROLLBACK, SAVE TRANSACTION

## MSSQL-Specific Syntax

This extension uses proper T-SQL conventions:

- **Identifier quoting**: `[schema].[table]` (bracket notation)
- **Row limiting**: `SELECT TOP n` instead of `LIMIT`
- **Auto-increment**: `IDENTITY(1,1)` instead of SERIAL
- **Savepoints**: `SAVE TRANSACTION name` instead of SAVEPOINT
- **Parameters**: `@param` placeholders
- **Output**: `OUTPUT INSERTED.*` instead of RETURNING

## Related Extensions

| Extension | Marketplace |
|-----------|-------------|
| NexQL Core | [ric-v.nexql](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql) |
| NexQL - PostgreSQL | [ric-v.nexql-postgres](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql-postgres) |
| NexQL - MySQL | [ric-v.nexql-mysql](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql-mysql) |
| NexQL - SQLite | [ric-v.nexql-sqlite](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql-sqlite) |
| NexQL - MSSQL | [ric-v.nexql-mssql](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql-mssql) |

## Connection Configuration

| Field | Default | Description |
|-------|---------|-------------|
| Host | localhost | SQL Server hostname or IP |
| Port | 1433 | SQL Server port |
| Database | master | Initial database |
| Username | sa | Login username |
| Password | — | Login password |
| Encrypt | true | Use TLS encryption |
| Trust Server Certificate | false | Skip certificate validation |

## License

MIT
