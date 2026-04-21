# NexQL - MySQL

MySQL database support for the [NexQL](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql) universal database management platform.

## Prerequisites

- **[NexQL Core Extension](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql)** (`ric-v.nexql`) must be installed first.

## Installation

```bash
# Install the Core Extension (required)
code --install-extension ric-v.nexql

# Install this MySQL extension
code --install-extension ric-v.nexql-mysql
```

## Features

- MySQL / MariaDB introspection (databases, tables, views, functions, procedures)
- MySQL-specific SQL dialect with backtick quoting
- EXPLAIN FORMAT=JSON support
- MySQL-specific SQL templates (AUTO_INCREMENT, ENGINE=InnoDB)
- Stored procedures and triggers support
- Partitioning support
- SSL connection support

## Status

🚧 **Preview** — This extension provides the scaffolding and interface implementations for MySQL support. The database driver is a stub that will be connected to a MySQL client library in a future release.

## Connection Options

- Host / Port / Database / Username / Password
- SSL modes: disable, prefer, require, verify-ca, verify-identity
- Connection timeout

## Architecture

This extension registers a MySQL engine with the NexQL Core Extension via the Provider API. All UI, notebooks, AI features, and connection management are provided by the Core Extension — this package provides the MySQL-specific driver, dialect, introspection queries, and SQL templates.

## Links

- [NexQL Core Extension](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql)
- [NexQL - PostgreSQL](https://marketplace.visualstudio.com/items?itemName=ric-v.postgres-explorer)
- [NexQL - SQLite](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql-sqlite)
- [Documentation](https://pgstudio.astrx.dev/)
- [GitHub](https://github.com/dev-asterix/PgStudio)

## License

[MIT](../../LICENSE)
