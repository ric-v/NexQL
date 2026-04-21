import type { CompletionProvider } from './CompletionProvider';

/**
 * Minimal ANSI SQL DefaultCompletionProvider used as a fallback when no
 * engine-specific CompletionProvider is registered.
 */
export class DefaultCompletionProvider implements CompletionProvider {
  getKeywords(): string[] {
    return [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
      'CROSS', 'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
      'IS', 'NULL', 'TRUE', 'FALSE',
      'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC',
      'LIMIT', 'OFFSET', 'FETCH', 'FIRST', 'NEXT', 'ROWS', 'ONLY',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
      'CREATE', 'ALTER', 'DROP', 'TABLE', 'VIEW', 'INDEX', 'SCHEMA',
      'AS', 'DISTINCT', 'ALL', 'UNION', 'INTERSECT', 'EXCEPT',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'EXISTS', 'ANY', 'SOME',
      'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT',
      'GRANT', 'REVOKE', 'WITH', 'RECURSIVE',
      'HAVING', 'RETURNING', 'USING',
      'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT',
      'UNIQUE', 'CHECK', 'DEFAULT', 'NOT NULL',
    ];
  }

  getBuiltinFunctions(): string[] {
    return [
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'COALESCE', 'NULLIF', 'CAST', 'CONVERT',
      'UPPER', 'LOWER', 'TRIM', 'SUBSTRING', 'LENGTH', 'CONCAT',
      'ABS', 'CEIL', 'FLOOR', 'ROUND', 'MOD', 'POWER', 'SQRT',
      'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP',
      'EXTRACT', 'DATE_PART',
      'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE',
      'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE',
    ];
  }

  getSystemSchemas(): string[] {
    return ['information_schema'];
  }
}
