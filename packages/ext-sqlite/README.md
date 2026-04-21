# NexQL - SQLite

SQLite database support for the [NexQL](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql) universal database management platform.

## Prerequisites

- **[NexQL Core Extension](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql)** (`ric-v.nexql`) must be installed first.

## Installation

```bash
# Install the Core Extension (required)
code --install-extension ric-v.nexql

# Install this SQLite extension
code --install-extension ric-v.nexql-sqlite
```

## Features

- SQLite file-based database introspection (tables, views, indexes, triggers)
- File path selector for database connection
- Optional encryption password support (SQLCipher)
- Read-only mode option
- SQLite-specific SQL dialect with EXPLAIN QUERY PLAN
- SQLite-specific SQL templates (AUTOINCREMENT, datetime functions)
- VACUUM and ANALYZE support
- Foreign key introspection via PRAGMA

## Status

🚧 **Preview** — This extension provides the scaffolding and interface implementations for SQLite support. The database driver is a stub that will be connected to a SQLite client library in a future release.

## Connection Options

- Database file path (.db, .sqlite, .sqlite3)
- Optional encryption password (for SQLCipher-encrypted databases)
- Read-only mode toggle

## SQLite Limitations

SQLite is a lightweight, serverless database. Compared to PostgreSQL or MySQL:

- No schemas — all objects live in the main database
- No stored procedures
- No user roles or access control
- Limited ALTER TABLE support (varies by SQLite version)
- No materialized views
- Single-writer concurrency model

## Architecture

This extension registers a SQLite engine with the NexQL Core Extension via the Provider API. All UI, notebooks, AI features, and connection management are provided by the Core Extension — this package provides the SQLite-specific driver, dialect, introspection queries, and SQL templates.

## Links

- [NexQL Core Extension](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql)
- [NexQL - PostgreSQL](https://marketplace.visualstudio.com/items?itemName=ric-v.postgres-explorer)
- [NexQL - MySQL](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql-mysql)
- [Documentation](https://pgstudio.astrx.dev/)
- [GitHub](https://github.com/dev-asterix/PgStudio)

## License

[MIT](../../LICENSE)
