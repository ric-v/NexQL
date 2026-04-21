import type { CompletionProvider } from '@nexql/core/core/db/CompletionProvider';

/**
 * MySQL completion provider.
 * Supplies MySQL-specific keywords, built-in functions, and system schemas
 * for SQL IntelliSense.
 */
export class MysqlCompletionProvider implements CompletionProvider {
  getKeywords(): string[] {
    return [
      // Standard SQL
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'EXISTS',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
      'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW',
      'JOIN', 'INNER', 'LEFT', 'RIGHT', 'CROSS', 'ON',
      'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING',
      'LIMIT', 'OFFSET',
      'UNION', 'INTERSECT', 'EXCEPT', 'ALL',
      'AS', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'NULL', 'IS', 'LIKE', 'BETWEEN',
      'TRUE', 'FALSE',
      'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT',
      'GRANT', 'REVOKE', 'WITH',
      // MySQL-specific
      'AUTO_INCREMENT', 'ENGINE', 'CHARSET', 'COLLATE',
      'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'USE',
      'DELIMITER', 'CALL', 'HANDLER',
      'DATABASE', 'DATABASES', 'TABLES', 'COLUMNS', 'STATUS',
      'VARIABLES', 'WARNINGS', 'ERRORS',
      'IF', 'ELSEIF', 'LOOP', 'WHILE', 'REPEAT', 'UNTIL', 'LEAVE', 'ITERATE',
      'DECLARE', 'CURSOR', 'FETCH', 'OPEN', 'CLOSE',
      'TRIGGER', 'FUNCTION', 'PROCEDURE', 'RETURNS', 'DETERMINISTIC',
      'EVENT', 'SCHEDULE', 'EVERY', 'STARTS', 'ENDS',
      'PARTITION', 'RANGE', 'LIST', 'HASH', 'KEY',
      'CASCADE', 'RESTRICT', 'NO ACTION', 'SET NULL', 'SET DEFAULT',
      'FOREIGN', 'PRIMARY', 'UNIQUE', 'REFERENCES', 'CONSTRAINT',
      'START TRANSACTION', 'RELEASE SAVEPOINT', 'ROLLBACK TO SAVEPOINT',
      'LOCK', 'UNLOCK', 'FLUSH', 'RESET', 'PURGE',
      'LOAD DATA', 'INFILE', 'OUTFILE', 'REPLACE',
      'ON DUPLICATE KEY UPDATE',
      'STRAIGHT_JOIN', 'SQL_CALC_FOUND_ROWS', 'HIGH_PRIORITY', 'LOW_PRIORITY',
      'DELAYED', 'IGNORE',
      'BINARY', 'UNSIGNED', 'ZEROFILL',
      'DEFAULT', 'COMMENT', 'AFTER', 'FIRST',
      'TEMPORARY', 'ALGORITHM', 'DEFINER', 'INVOKER',
      'SIGNAL', 'RESIGNAL', 'CONDITION',
    ];
  }

  getBuiltinFunctions(): string[] {
    return [
      // Aggregate functions
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'GROUP_CONCAT', 'JSON_ARRAYAGG', 'JSON_OBJECTAGG',
      'BIT_AND', 'BIT_OR', 'BIT_XOR',
      'STD', 'STDDEV', 'STDDEV_POP', 'STDDEV_SAMP',
      'VAR_POP', 'VAR_SAMP', 'VARIANCE',
      // Window functions
      'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'PERCENT_RANK', 'CUME_DIST',
      'NTILE', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE',
      // String functions
      'CONCAT', 'CONCAT_WS', 'LENGTH', 'CHAR_LENGTH', 'CHARACTER_LENGTH',
      'LOWER', 'LCASE', 'UPPER', 'UCASE',
      'TRIM', 'LTRIM', 'RTRIM', 'LPAD', 'RPAD',
      'SUBSTRING', 'SUBSTR', 'MID', 'LEFT', 'RIGHT',
      'REPLACE', 'INSERT', 'REVERSE', 'REPEAT',
      'LOCATE', 'INSTR', 'POSITION', 'FIND_IN_SET',
      'FORMAT', 'HEX', 'UNHEX', 'BIN', 'OCT',
      'ASCII', 'CHAR', 'ORD',
      'FIELD', 'ELT', 'MAKE_SET',
      'REGEXP_LIKE', 'REGEXP_REPLACE', 'REGEXP_INSTR', 'REGEXP_SUBSTR',
      'SOUNDEX', 'SPACE', 'QUOTE',
      // Date/time functions
      'NOW', 'CURDATE', 'CURTIME', 'CURRENT_TIMESTAMP',
      'DATE', 'TIME', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
      'DAYOFWEEK', 'DAYOFMONTH', 'DAYOFYEAR', 'WEEKDAY', 'WEEK',
      'DATE_ADD', 'DATE_SUB', 'ADDDATE', 'SUBDATE',
      'DATE_FORMAT', 'STR_TO_DATE', 'TIME_FORMAT',
      'DATEDIFF', 'TIMEDIFF', 'TIMESTAMPDIFF', 'TIMESTAMPADD',
      'FROM_UNIXTIME', 'UNIX_TIMESTAMP',
      'LAST_DAY', 'MAKEDATE', 'MAKETIME',
      'CONVERT_TZ', 'UTC_DATE', 'UTC_TIME', 'UTC_TIMESTAMP',
      'EXTRACT', 'GET_FORMAT',
      // Math functions
      'ABS', 'CEIL', 'CEILING', 'FLOOR', 'ROUND', 'TRUNCATE',
      'MOD', 'POWER', 'POW', 'SQRT', 'LOG', 'LOG2', 'LOG10', 'LN', 'EXP',
      'RAND', 'SIGN', 'PI', 'DEGREES', 'RADIANS',
      'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'ATAN2', 'COT',
      'GREATEST', 'LEAST', 'CONV', 'CRC32',
      // JSON functions
      'JSON_EXTRACT', 'JSON_UNQUOTE', 'JSON_SET', 'JSON_INSERT', 'JSON_REPLACE',
      'JSON_REMOVE', 'JSON_CONTAINS', 'JSON_CONTAINS_PATH',
      'JSON_TYPE', 'JSON_VALID', 'JSON_LENGTH', 'JSON_DEPTH', 'JSON_KEYS',
      'JSON_ARRAY', 'JSON_OBJECT', 'JSON_QUOTE',
      'JSON_SEARCH', 'JSON_MERGE_PATCH', 'JSON_MERGE_PRESERVE',
      'JSON_TABLE', 'JSON_VALUE',
      // Control flow
      'IF', 'IFNULL', 'NULLIF', 'COALESCE',
      'CASE', 'GREATEST', 'LEAST',
      // Type casting
      'CAST', 'CONVERT', 'BINARY',
      // Encryption
      'MD5', 'SHA1', 'SHA2', 'AES_ENCRYPT', 'AES_DECRYPT',
      // Information functions
      'DATABASE', 'USER', 'CURRENT_USER', 'VERSION',
      'CONNECTION_ID', 'LAST_INSERT_ID', 'ROW_COUNT', 'FOUND_ROWS',
      'CHARSET', 'COLLATION',
      // Misc
      'UUID', 'UUID_SHORT', 'SLEEP', 'BENCHMARK',
      'INET_ATON', 'INET_NTOA', 'INET6_ATON', 'INET6_NTOA',
      'IS_IPV4', 'IS_IPV6',
    ];
  }

  getSystemSchemas(): string[] {
    return [
      'mysql',
      'information_schema',
      'performance_schema',
      'sys',
    ];
  }
}
