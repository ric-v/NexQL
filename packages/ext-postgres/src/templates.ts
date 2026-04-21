import type { SqlTemplateProvider } from '@nexql/core/core/db/SqlTemplateProvider';

/**
 * PostgreSQL SQL template provider.
 * Generates PG-specific SQL statements for common operations.
 */
export class PostgresSqlTemplates implements SqlTemplateProvider {
  selectAll(schema: string, table: string): string {
    return `SELECT * FROM "${schema}"."${table}";`;
  }

  selectTop(schema: string, table: string, limit: number): string {
    return `SELECT * FROM "${schema}"."${table}" LIMIT ${limit};`;
  }

  insert(schema: string, table: string, columns: string[]): string {
    const cols = columns.map(c => `"${c}"`).join(', ');
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    return `INSERT INTO "${schema}"."${table}" (${cols})\nVALUES (${placeholders})\nRETURNING *;`;
  }

  update(schema: string, table: string, columns: string[], whereColumns: string[]): string {
    const setClauses = columns.map((c, i) => `"${c}" = $${i + 1}`).join(',\n  ');
    const whereClauses = whereColumns.map((c, i) => `"${c}" = $${columns.length + i + 1}`).join(' AND ');
    return `UPDATE "${schema}"."${table}"\nSET ${setClauses}\nWHERE ${whereClauses}\nRETURNING *;`;
  }

  delete(schema: string, table: string, whereColumns: string[]): string {
    const whereClauses = whereColumns.map((c, i) => `"${c}" = $${i + 1}`).join(' AND ');
    return `DELETE FROM "${schema}"."${table}"\nWHERE ${whereClauses}\nRETURNING *;`;
  }

  createTable(schema: string, table: string): string {
    return `CREATE TABLE "${schema}"."${table}" (\n  id SERIAL PRIMARY KEY,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);`;
  }

  dropTable(schema: string, table: string): string {
    return `DROP TABLE IF EXISTS "${schema}"."${table}" CASCADE;`;
  }

  truncateTable(schema: string, table: string): string {
    return `TRUNCATE TABLE "${schema}"."${table}" RESTART IDENTITY CASCADE;`;
  }

  vacuum(schema: string, table: string): string {
    return `VACUUM ANALYZE "${schema}"."${table}";`;
  }

  analyze(schema: string, table: string): string {
    return `ANALYZE "${schema}"."${table}";`;
  }

  insertRow(table: string, columns: Record<string, unknown>): string {
    const keys = Object.keys(columns);
    const cols = keys.map(c => `"${c}"`).join(', ');
    const vals = keys.map(k => formatValue(columns[k])).join(', ');
    return `INSERT INTO ${table} (${cols}) VALUES (${vals}) RETURNING *;`;
  }

  updateRow(table: string, set: Record<string, unknown>, where: Record<string, unknown>): string {
    const setClauses = Object.entries(set).map(([k, v]) => `"${k}" = ${formatValue(v)}`).join(', ');
    const whereClauses = Object.entries(where).map(([k, v]) => `"${k}" = ${formatValue(v)}`).join(' AND ');
    return `UPDATE ${table} SET ${setClauses} WHERE ${whereClauses} RETURNING *;`;
  }

  deleteRow(table: string, where: Record<string, unknown>): string {
    const whereClauses = Object.entries(where).map(([k, v]) => `"${k}" = ${formatValue(v)}`).join(' AND ');
    return `DELETE FROM ${table} WHERE ${whereClauses} RETURNING *;`;
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  // Escape single quotes for string values
  return `'${String(value).replace(/'/g, "''")}'`;
}
