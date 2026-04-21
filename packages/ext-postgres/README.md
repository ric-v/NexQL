# NexQL - PostgreSQL

Full PostgreSQL database support for the [NexQL](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql) universal database management platform.

## Prerequisites

- **[NexQL Core Extension](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql)** (`ric-v.nexql`) must be installed first.

## Installation

```bash
# Install the Core Extension (required)
code --install-extension ric-v.nexql

# Install this PostgreSQL extension
code --install-extension ric-v.postgres-explorer
```

## Features

- Full PostgreSQL introspection (schemas, tables, views, functions, procedures, types, sequences, domains, and more)
- Connection pooling with `pg` library
- SSL and SSH tunnel support
- EXPLAIN ANALYZE with JSON format
- PostgreSQL-specific SQL templates (RETURNING, CTEs, window functions)
- Real-time monitoring dashboard queries
- DDL generation and migration statement generation
- Index advisor and completion provider
- Support for Foreign Data Wrappers, Materialized Views, Partitions, RLS Policies

## Supported PostgreSQL Versions

- PostgreSQL 12, 14, 15, 16, 17

## Connection Options

- Host / Port / Database / Username / Password
- SSL modes: disable, allow, prefer, require, verify-ca, verify-full
- SSH tunneling with private key authentication
- Application name, statement timeout, connection timeout

## Architecture

This extension registers a PostgreSQL engine with the NexQL Core Extension via the Provider API. All UI, notebooks, AI features, and connection management are provided by the Core Extension — this package provides the PostgreSQL-specific driver, dialect, introspection queries, and SQL templates.

## Links

- [NexQL Core Extension](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql)
- [NexQL - MySQL](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql-mysql)
- [NexQL - SQLite](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql-sqlite)
- [Documentation](https://pgstudio.astrx.dev/)
- [GitHub](https://github.com/dev-asterix/PgStudio)

## License

[MIT](../../LICENSE)
