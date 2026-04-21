import type { SqlTemplateProvider } from '@nexql/core/core/db/SqlTemplateProvider';

/**
 * SQLite SQL template provider.
 * Generates SQLite-specific SQL statements for common operations.
 */
export class SqliteSqlTemplates implements SqlTemplateProvider {
  selectAll(_schema: string, table: string): string {
    return `SELECT * FROM "${table}";`;
  }

  selectTop(_schema: string, table: string, limit: number): string {
    return `SELECT * FROM "${table}" LIMIT ${limit};`;
  }

  insert(_schema: string, table: string, columns: string[]): string {
    const cols = columns.map(c => `"${c}"`).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    return `INSERT INTO "${table}" (${cols})\nVALUES (${placeholders});`;
  }

  update(_schema: string, table: string, columns: string[], whereColumns: string[]): string {
    const setClauses = columns.map(c => `"${c}" = ?`).join(',\n  ');
    const whereClauses = whereColumns.map(c => `"${c}" = ?`).join(' AND ');
    return `UPDATE "${table}"\nSET ${setClauses}\nWHERE ${whereClauses};`;
  }

  delete(_schema: string, table: string, whereColumns: string[]): string {
    const whereClauses = whereColumns.map(c => `"${c}" = ?`).join(' AND ');
    return `DELETE FROM "${table}"\nWHERE ${whereClauses};`;
  }

  createTable(_schema: string, table: string): string {
    return `CREATE TABLE "${table}" (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  created_at TEXT DEFAULT (datetime('now'))\n);`;
  }

  dropTable(_schema: string, table: string): string {
    return `DROP TABLE IF EXISTS "${table}";`;
  }

  truncateTable(_schema: string, table: string): string {
    // SQLite has no TRUNCATE — use DELETE
    return `DELETE FROM "${table}";`;
  }

  vacuum(_schema: string, _table: string): string {
    // SQLite VACUUM operates on the entire database
    return `VACUUM;`;
  }

  analyze(_schema: string, table: string): string {
    return `ANALYZE "${table}";`;
  }
}
