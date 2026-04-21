import type { CompletionProvider } from '@nexql/core/core/db/CompletionProvider';

/**
 * MSSQL completion provider.
 * Supplies T-SQL-specific keywords, built-in functions, and system schemas
 * for SQL IntelliSense.
 */
export class MssqlCompletionProvider implements CompletionProvider {
  getKeywords(): string[] {
    return [
      // Standard SQL
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'EXISTS',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
      'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW',
      'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON',
      'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING',
      'UNION', 'INTERSECT', 'EXCEPT', 'ALL',
      'AS', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'NULL', 'IS', 'LIKE', 'BETWEEN',
      'TRUE', 'FALSE',
      'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION',
      'GRANT', 'REVOKE', 'WITH',
      // T-SQL specific
      'TOP', 'NOLOCK', 'HOLDLOCK', 'UPDLOCK', 'ROWLOCK', 'TABLOCK',
      'OUTPUT', 'INSERTED', 'DELETED',
      'MERGE', 'MATCHED', 'TARGET', 'SOURCE',
      'OFFSET', 'FETCH', 'NEXT', 'ROWS', 'ONLY',
      'IDENTITY', 'SCOPE_IDENTITY', 'IDENT_CURRENT',
      'GO', 'USE', 'EXEC', 'EXECUTE', 'PRINT',
      'DECLARE', 'SET', 'IF', 'ELSE', 'WHILE', 'BREAK', 'CONTINUE',
      'TRY', 'CATCH', 'THROW', 'RAISERROR',
      'BEGIN TRY', 'END TRY', 'BEGIN CATCH', 'END CATCH',
      'CURSOR', 'OPEN', 'CLOSE', 'DEALLOCATE', 'FETCH NEXT',
      'PROCEDURE', 'FUNCTION', 'TRIGGER', 'SCHEMA', 'SEQUENCE',
      'RETURNS', 'RETURN', 'TABLE',
      'NONCLUSTERED', 'CLUSTERED', 'UNIQUE',
      'CONSTRAINT', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
      'CHECK', 'DEFAULT',
      'SAVE TRANSACTION',
      'CROSS APPLY', 'OUTER APPLY',
      'PIVOT', 'UNPIVOT',
      'OVER', 'PARTITION', 'ROWS', 'RANGE', 'UNBOUNDED', 'PRECEDING', 'FOLLOWING',
      'STRING_AGG', 'WITHIN GROUP',
      'IIF', 'CHOOSE', 'COALESCE', 'NULLIF',
      'OPENJSON', 'FOR JSON', 'FOR XML',
      'WAITFOR', 'DELAY',
      'BULK INSERT', 'OPENROWSET', 'OPENQUERY',
      'SYNONYM', 'TYPE',
      'INCLUDE', 'FILLFACTOR', 'PAD_INDEX',
      'STATISTICS', 'RECOMPILE', 'OPTION',
    ];
  }

  getBuiltinFunctions(): string[] {
    return [
      // Aggregate functions
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'COUNT_BIG', 'STDEV', 'STDEVP', 'VAR', 'VARP',
      'STRING_AGG', 'GROUPING', 'GROUPING_ID',
      // Window functions
      'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE',
      'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE',
      'PERCENT_RANK', 'CUME_DIST', 'PERCENTILE_CONT', 'PERCENTILE_DISC',
      // String functions
      'LEN', 'DATALENGTH', 'LEFT', 'RIGHT', 'SUBSTRING',
      'CHARINDEX', 'PATINDEX', 'REPLACE', 'STUFF',
      'UPPER', 'LOWER', 'LTRIM', 'RTRIM', 'TRIM',
      'CONCAT', 'CONCAT_WS', 'FORMAT', 'REPLICATE', 'REVERSE',
      'SPACE', 'STR', 'STRING_SPLIT', 'STRING_ESCAPE',
      'TRANSLATE', 'UNICODE', 'NCHAR', 'CHAR', 'ASCII',
      'QUOTENAME', 'SOUNDEX', 'DIFFERENCE',
      // Date/time functions
      'GETDATE', 'GETUTCDATE', 'SYSDATETIME', 'SYSUTCDATETIME',
      'SYSDATETIMEOFFSET', 'CURRENT_TIMESTAMP',
      'DATEADD', 'DATEDIFF', 'DATEDIFF_BIG', 'DATENAME', 'DATEPART',
      'YEAR', 'MONTH', 'DAY', 'EOMONTH',
      'DATEFROMPARTS', 'DATETIME2FROMPARTS', 'DATETIMEFROMPARTS',
      'SMALLDATETIMEFROMPARTS', 'TIMEFROMPARTS', 'DATETIMEOFFSETFROMPARTS',
      'ISDATE', 'SWITCHOFFSET', 'TODATETIMEOFFSET',
      // Math functions
      'ABS', 'CEILING', 'FLOOR', 'ROUND', 'SIGN',
      'POWER', 'SQRT', 'SQUARE', 'LOG', 'LOG10', 'EXP',
      'PI', 'RAND', 'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'ATN2',
      'DEGREES', 'RADIANS',
      // Conversion functions
      'CAST', 'CONVERT', 'TRY_CAST', 'TRY_CONVERT', 'PARSE', 'TRY_PARSE',
      // JSON functions
      'ISJSON', 'JSON_VALUE', 'JSON_QUERY', 'JSON_MODIFY', 'JSON_PATH_EXISTS',
      // System functions
      'NEWID', 'NEWSEQUENTIALID',
      'SCOPE_IDENTITY', 'IDENT_CURRENT', 'IDENTITY',
      'DB_ID', 'DB_NAME', 'OBJECT_ID', 'OBJECT_NAME',
      'SCHEMA_ID', 'SCHEMA_NAME', 'COL_NAME', 'TYPE_NAME',
      'USER_NAME', 'SUSER_SNAME', 'SYSTEM_USER', 'SESSION_USER',
      'HOST_NAME', 'APP_NAME', 'ORIGINAL_LOGIN',
      'ERROR_NUMBER', 'ERROR_MESSAGE', 'ERROR_SEVERITY', 'ERROR_STATE',
      'ERROR_LINE', 'ERROR_PROCEDURE',
      '@@ROWCOUNT', '@@IDENTITY', '@@SPID', '@@TRANCOUNT', '@@ERROR',
      '@@VERSION', '@@SERVERNAME',
      // Logical functions
      'IIF', 'CHOOSE', 'COALESCE', 'NULLIF',
      // Security functions
      'HAS_PERMS_BY_NAME', 'IS_MEMBER', 'IS_ROLEMEMBER',
      'SUSER_ID', 'USER_ID',
    ];
  }

  getSystemSchemas(): string[] {
    return [
      'sys',
      'INFORMATION_SCHEMA',
      'guest',
      'db_owner',
      'db_accessadmin',
      'db_securityadmin',
      'db_ddladmin',
      'db_backupoperator',
      'db_datareader',
      'db_datawriter',
      'db_denydatareader',
      'db_denydatawriter',
    ];
  }
}
