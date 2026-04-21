import type { SqlTemplateProvider } from '@nexql/core/core/db/SqlTemplateProvider';

/**
 * MSSQL SQL template provider.
 * Generates MSSQL-specific SQL statements using T-SQL syntax:
 * - TOP instead of LIMIT
 * - No RETURNING clause (use OUTPUT instead)
 * - IDENTITY instead of SERIAL/AUTO_INCREMENT
 * - Bracket quoting for identifiers
 */
export class MssqlSqlTemplates implements SqlTemplateProvider {
  selectAll(schema: string, table: string): string {
    return `SELECT * FROM [${schema}].[${table}];`;
  }

  selectTop(schema: string, table: string, limit: number): string {
    return `SELECT TOP ${limit} * FROM [${schema}].[${table}];`;
  }

  insert(schema: string, table: string, columns: string[]): string {
    const cols = columns.map(c => `[${c}]`).join(', ');
    const placeholders = columns.map((_, i) => `@p${i + 1}`).join(', ');
    return `INSERT INTO [${schema}].[${table}] (${cols})\nVALUES (${placeholders});`;
  }

  update(schema: string, table: string, columns: string[], whereColumns: string[]): string {
    const setClauses = columns.map((c, i) => `[${c}] = @p${i + 1}`).join(',\n  ');
    const whereClauses = whereColumns.map((c, i) => `[${c}] = @w${i + 1}`).join(' AND ');
    return `UPDATE [${schema}].[${table}]\nSET ${setClauses}\nWHERE ${whereClauses};`;
  }

  delete(schema: string, table: string, whereColumns: string[]): string {
    const whereClauses = whereColumns.map((c, i) => `[${c}] = @w${i + 1}`).join(' AND ');
    return `DELETE FROM [${schema}].[${table}]\nWHERE ${whereClauses};`;
  }

  createTable(schema: string, table: string): string {
    return [
      `CREATE TABLE [${schema}].[${table}] (`,
      '  [id] INT IDENTITY(1,1) PRIMARY KEY,',
      '  [created_at] DATETIME2 DEFAULT GETDATE()',
      ');',
    ].join('\n');
  }

  dropTable(schema: string, table: string): string {
    return `DROP TABLE IF EXISTS [${schema}].[${table}];`;
  }

  truncateTable(schema: string, table: string): string {
    return `TRUNCATE TABLE [${schema}].[${table}];`;
  }

  analyze(schema: string, table: string): string {
    return `UPDATE STATISTICS [${schema}].[${table}];`;
  }

  insertRow(table: string, columns: Record<string, unknown>): string {
    const keys = Object.keys(columns);
    const cols = keys.map(c => `[${c}]`).join(', ');
    const vals = keys.map(k => this.formatValue(columns[k])).join(', ');
    return `INSERT INTO ${table} (${cols})\nVALUES (${vals});`;
  }

  updateRow(table: string, set: Record<string, unknown>, where: Record<string, unknown>): string {
    const setClauses = Object.entries(set)
      .map(([k, v]) => `[${k}] = ${this.formatValue(v)}`)
      .join(', ');
    const whereClauses = Object.entries(where)
      .map(([k, v]) => `[${k}] = ${this.formatValue(v)}`)
      .join(' AND ');
    return `UPDATE ${table}\nSET ${setClauses}\nWHERE ${whereClauses};`;
  }

  deleteRow(table: string, where: Record<string, unknown>): string {
    const whereClauses = Object.entries(where)
      .map(([k, v]) => `[${k}] = ${this.formatValue(v)}`)
      .join(' AND ');
    return `DELETE FROM ${table}\nWHERE ${whereClauses};`;
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
