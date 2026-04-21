import type { SqlTemplateProvider } from '@nexql/core/core/db/SqlTemplateProvider';

/**
 * Oracle SQL template provider.
 * Generates Oracle-specific SQL statements:
 * - FETCH FIRST n ROWS ONLY for limiting (Oracle 12c+)
 * - No RETURNING clause for INSERT by default
 * - Sequences with NEXTVAL for auto-generated keys
 * - DUAL table for expressions
 * - Double-quote identifier quoting
 */
export class OracleSqlTemplates implements SqlTemplateProvider {
  selectAll(schema: string, table: string): string {
    return `SELECT * FROM "${schema}"."${table}"`;
  }

  selectTop(schema: string, table: string, limit: number): string {
    return `SELECT * FROM "${schema}"."${table}" FETCH FIRST ${limit} ROWS ONLY`;
  }

  insert(schema: string, table: string, columns: string[]): string {
    const cols = columns.map(c => `"${c}"`).join(', ');
    const placeholders = columns.map((_, i) => `:p${i + 1}`).join(', ');
    return `INSERT INTO "${schema}"."${table}" (${cols})\nVALUES (${placeholders})`;
  }

  update(schema: string, table: string, columns: string[], whereColumns: string[]): string {
    const setClauses = columns.map((c, i) => `"${c}" = :p${i + 1}`).join(',\n  ');
    const whereClauses = whereColumns.map((c, i) => `"${c}" = :w${i + 1}`).join(' AND ');
    return `UPDATE "${schema}"."${table}"\nSET ${setClauses}\nWHERE ${whereClauses}`;
  }

  delete(schema: string, table: string, whereColumns: string[]): string {
    const whereClauses = whereColumns.map((c, i) => `"${c}" = :w${i + 1}`).join(' AND ');
    return `DELETE FROM "${schema}"."${table}"\nWHERE ${whereClauses}`;
  }

  createTable(schema: string, table: string): string {
    return [
      `CREATE TABLE "${schema}"."${table}" (`,
      `  "id" NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,`,
      `  "created_at" TIMESTAMP DEFAULT SYSTIMESTAMP`,
      `)`,
    ].join('\n');
  }

  dropTable(schema: string, table: string): string {
    return `DROP TABLE "${schema}"."${table}" CASCADE CONSTRAINTS`;
  }

  truncateTable(schema: string, table: string): string {
    return `TRUNCATE TABLE "${schema}"."${table}"`;
  }

  analyze(schema: string, table: string): string {
    return `BEGIN DBMS_STATS.GATHER_TABLE_STATS('${schema}', '${table}'); END;`;
  }

  insertRow(table: string, columns: Record<string, unknown>): string {
    const keys = Object.keys(columns);
    const cols = keys.map(c => `"${c}"`).join(', ');
    const vals = keys.map(k => this.formatValue(columns[k])).join(', ');
    return `INSERT INTO ${table} (${cols})\nVALUES (${vals})`;
  }

  updateRow(table: string, set: Record<string, unknown>, where: Record<string, unknown>): string {
    const setClauses = Object.entries(set)
      .map(([k, v]) => `"${k}" = ${this.formatValue(v)}`)
      .join(', ');
    const whereClauses = Object.entries(where)
      .map(([k, v]) => `"${k}" = ${this.formatValue(v)}`)
      .join(' AND ');
    return `UPDATE ${table}\nSET ${setClauses}\nWHERE ${whereClauses}`;
  }

  deleteRow(table: string, where: Record<string, unknown>): string {
    const whereClauses = Object.entries(where)
      .map(([k, v]) => `"${k}" = ${this.formatValue(v)}`)
      .join(' AND ');
    return `DELETE FROM ${table}\nWHERE ${whereClauses}`;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    return `'${String(value).replace(/'/g, "''")}'`;
  }
}
