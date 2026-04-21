import type { IntrospectionProvider } from '@nexql/core/core/db/introspection/IntrospectionProvider';

/**
 * SQLite introspection provider.
 * Returns SQL queries that use sqlite_master and PRAGMA statements
 * to discover database objects.
 *
 * Note: SQLite has no schema concept — all objects live in the main database.
 */
export class SqliteIntrospection implements IntrospectionProvider {
  listTables(_schema?: string): string {
    return `
      SELECT name AS table_name, 'BASE TABLE' AS table_type
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `;
  }

  listViews(_schema?: string): string {
    return `
      SELECT name AS table_name
      FROM sqlite_master
      WHERE type = 'view'
      ORDER BY name;
    `;
  }

  listColumns(_schema: string, table: string): string {
    return `PRAGMA table_info('${table}');`;
  }

  listIndexes(_schema: string, table: string): string {
    return `PRAGMA index_list('${table}');`;
  }

  listForeignKeys(_schema: string, table: string): string {
    return `PRAGMA foreign_key_list('${table}');`;
  }

  listFunctions(_schema?: string): string {
    // SQLite does not expose user-defined functions via SQL
    return `SELECT '' AS function_name WHERE 0;`;
  }

  search(term: string): string {
    return `
      SELECT
        name AS object_name,
        type AS object_type
      FROM sqlite_master
      WHERE name LIKE '%${term}%'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY type, name
      LIMIT 50;
    `;
  }
}
