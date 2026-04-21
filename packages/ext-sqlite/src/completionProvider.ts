import type { CompletionProvider } from '@nexql/core/core/db/CompletionProvider';

/**
 * SQLite completion provider.
 * Supplies SQLite-specific keywords, built-in functions, and system schemas
 * for SQL IntelliSense.
 */
export class SqliteCompletionProvider implements CompletionProvider {
  getKeywords(): string[] {
    return [
      // Standard SQL
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'EXISTS',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
      'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW',
      'JOIN', 'INNER', 'LEFT', 'CROSS', 'ON', 'NATURAL',
      'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING',
      'LIMIT', 'OFFSET',
      'UNION', 'INTERSECT', 'EXCEPT', 'ALL',
      'AS', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'NULL', 'IS', 'LIKE', 'BETWEEN', 'GLOB',
      'TRUE', 'FALSE',
      'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'RELEASE',
      'WITH', 'RECURSIVE',
      // SQLite-specific
      'PRAGMA', 'AUTOINCREMENT',
      'ATTACH', 'DETACH', 'DATABASE',
      'VACUUM', 'REINDEX', 'ANALYZE',
      'EXPLAIN', 'QUERY', 'PLAN',
      'REPLACE', 'ABORT', 'FAIL', 'IGNORE',
      'CONFLICT', 'ON CONFLICT',
      'TRIGGER', 'INSTEAD', 'OF', 'BEFORE', 'AFTER', 'EACH', 'ROW',
      'VIRTUAL', 'USING', 'WITHOUT', 'ROWID',
      'IF NOT EXISTS', 'IF EXISTS',
      'COLLATE', 'NOCASE', 'RTRIM', 'BINARY',
      'CAST', 'ISNULL', 'NOTNULL',
      'PRIMARY', 'KEY', 'UNIQUE', 'FOREIGN', 'REFERENCES',
      'CHECK', 'DEFAULT', 'CONSTRAINT',
      'CASCADE', 'RESTRICT', 'NO ACTION', 'SET NULL', 'SET DEFAULT',
      'DEFERRABLE', 'DEFERRED', 'IMMEDIATE',
      'TEMPORARY', 'TEMP',
      'INDEXED', 'NOT INDEXED',
      'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP',
      'RAISE', 'ABORT', 'FAIL', 'IGNORE', 'ROLLBACK',
    ];
  }

  getBuiltinFunctions(): string[] {
    return [
      // Aggregate functions
      'count', 'sum', 'avg', 'min', 'max',
      'group_concat', 'total',
      // Window functions (SQLite 3.25+)
      'row_number', 'rank', 'dense_rank', 'percent_rank', 'cume_dist',
      'ntile', 'lag', 'lead', 'first_value', 'last_value', 'nth_value',
      // Core scalar functions
      'abs', 'changes', 'char', 'coalesce', 'glob',
      'hex', 'ifnull', 'iif', 'instr',
      'last_insert_rowid', 'length', 'like', 'likelihood', 'likely',
      'load_extension', 'lower', 'ltrim',
      'max', 'min', 'nullif',
      'printf', 'format', 'quote',
      'random', 'randomblob',
      'replace', 'round', 'rtrim',
      'sign', 'soundex', 'sqlite_compileoption_get', 'sqlite_compileoption_used',
      'sqlite_offset', 'sqlite_source_id', 'sqlite_version',
      'substr', 'substring', 'total_changes', 'trim',
      'typeof', 'unicode', 'unlikely', 'upper',
      'zeroblob',
      // Date/time functions
      'date', 'time', 'datetime', 'julianday', 'unixepoch', 'strftime',
      'timediff',
      // Math functions (SQLite 3.35+)
      'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh',
      'ceil', 'ceiling', 'cos', 'cosh', 'degrees',
      'exp', 'floor', 'ln', 'log', 'log2', 'log10',
      'mod', 'pi', 'pow', 'power', 'radians',
      'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'trunc',
      // JSON functions (SQLite 3.38+)
      'json', 'json_array', 'json_array_length',
      'json_extract', 'json_insert', 'json_object',
      'json_patch', 'json_remove', 'json_replace',
      'json_set', 'json_type', 'json_valid',
      'json_quote', 'json_group_array', 'json_group_object',
      'json_each', 'json_tree',
    ];
  }

  getSystemSchemas(): string[] {
    // SQLite does not have schemas in the traditional sense.
    // The sqlite_master/sqlite_schema table is the system catalog.
    return [
      'sqlite_master',
      'sqlite_schema',
      'sqlite_temp_master',
      'sqlite_temp_schema',
    ];
  }
}
