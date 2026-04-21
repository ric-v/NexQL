import type { CompletionProvider } from '@nexql/core/core/db/CompletionProvider';

/**
 * Oracle completion provider.
 * Supplies PL/SQL-specific keywords, built-in functions, and system schemas
 * for SQL IntelliSense.
 */
export class OracleCompletionProvider implements CompletionProvider {
  getKeywords(): string[] {
    return [
      // Standard SQL
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'EXISTS',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
      'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW',
      'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON',
      'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING',
      'UNION', 'INTERSECT', 'MINUS', 'ALL',
      'AS', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'NULL', 'IS', 'LIKE', 'BETWEEN',
      'COMMIT', 'ROLLBACK', 'SAVEPOINT',
      'GRANT', 'REVOKE', 'WITH',
      // Oracle-specific SQL
      'FETCH', 'FIRST', 'ROWS', 'ONLY', 'NEXT', 'OFFSET',
      'CONNECT', 'START', 'PRIOR', 'LEVEL', 'NOCYCLE',
      'ROWNUM', 'ROWID', 'DUAL',
      'SEQUENCE', 'NEXTVAL', 'CURRVAL',
      'SYNONYM', 'TABLESPACE', 'CLUSTER',
      'MATERIALIZED', 'FLASHBACK', 'PURGE',
      'PARTITION', 'SUBPARTITION', 'RANGE', 'LIST', 'HASH',
      'MERGE', 'MATCHED', 'USING',
      'RETURNING', 'BULK', 'COLLECT',
      'OVER', 'PARTITION BY', 'ROWS', 'RANGE', 'UNBOUNDED', 'PRECEDING', 'FOLLOWING',
      'PIVOT', 'UNPIVOT',
      'EXPLAIN', 'PLAN', 'FOR',
      'COMMENT', 'RENAME', 'TRUNCATE',
      // PL/SQL keywords
      'PACKAGE', 'BODY', 'PROCEDURE', 'FUNCTION', 'TRIGGER',
      'DECLARE', 'BEGIN', 'EXCEPTION', 'END',
      'IF', 'ELSIF', 'ELSE', 'LOOP', 'WHILE', 'FOR', 'EXIT', 'CONTINUE',
      'CURSOR', 'OPEN', 'CLOSE', 'FETCH INTO',
      'RAISE', 'RAISE_APPLICATION_ERROR',
      'PRAGMA', 'AUTONOMOUS_TRANSACTION', 'EXCEPTION_INIT',
      'TYPE', 'RECORD', 'VARRAY', 'TABLE OF',
      'FORALL', 'BULK COLLECT',
      'EXECUTE IMMEDIATE', 'DBMS_OUTPUT',
      'RETURN', 'OUT', 'IN OUT', 'NOCOPY',
      'PIPELINED', 'DETERMINISTIC', 'PARALLEL_ENABLE',
      'AUTHID', 'CURRENT_USER', 'DEFINER',
      'RESULT_CACHE', 'RELIES_ON',
    ];
  }

  getBuiltinFunctions(): string[] {
    return [
      // Aggregate functions
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'LISTAGG', 'MEDIAN', 'STATS_MODE',
      'STDDEV', 'VARIANCE', 'CORR', 'COVAR_POP', 'COVAR_SAMP',
      // Window/analytic functions
      'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE',
      'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE',
      'PERCENT_RANK', 'CUME_DIST', 'PERCENTILE_CONT', 'PERCENTILE_DISC',
      'RATIO_TO_REPORT',
      // String functions
      'LENGTH', 'LENGTHB', 'SUBSTR', 'SUBSTRB',
      'INSTR', 'INSTRB', 'REPLACE', 'TRANSLATE',
      'UPPER', 'LOWER', 'INITCAP',
      'TRIM', 'LTRIM', 'RTRIM', 'LPAD', 'RPAD',
      'CONCAT', 'CHR', 'ASCII',
      'REGEXP_SUBSTR', 'REGEXP_INSTR', 'REGEXP_REPLACE', 'REGEXP_LIKE', 'REGEXP_COUNT',
      'SOUNDEX', 'DUMP', 'VSIZE',
      'TO_CHAR', 'TO_NUMBER', 'TO_DATE', 'TO_TIMESTAMP',
      // Numeric functions
      'ABS', 'CEIL', 'FLOOR', 'ROUND', 'TRUNC', 'MOD', 'SIGN',
      'POWER', 'SQRT', 'LOG', 'LN', 'EXP',
      'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'ATAN2',
      'GREATEST', 'LEAST', 'WIDTH_BUCKET',
      // Date/time functions
      'SYSDATE', 'SYSTIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIMESTAMP',
      'ADD_MONTHS', 'MONTHS_BETWEEN',
      'NEXT_DAY', 'LAST_DAY', 'TRUNC', 'ROUND',
      'EXTRACT', 'NUMTODSINTERVAL', 'NUMTOYMINTERVAL',
      'FROM_TZ', 'TO_TIMESTAMP_TZ', 'SYS_EXTRACT_UTC',
      'DBTIMEZONE', 'SESSIONTIMEZONE',
      // Conversion functions
      'CAST', 'TO_CHAR', 'TO_NUMBER', 'TO_DATE', 'TO_TIMESTAMP',
      'TO_CLOB', 'TO_BLOB', 'TO_NCHAR', 'TO_NCLOB',
      'HEXTORAW', 'RAWTOHEX', 'ROWIDTOCHAR', 'CHARTOROWID',
      // NULL-related functions
      'NVL', 'NVL2', 'NULLIF', 'COALESCE', 'DECODE',
      'LNNVL', 'NANVL',
      // Conditional functions
      'CASE', 'DECODE', 'GREATEST', 'LEAST',
      // System/environment functions
      'USER', 'SYS_CONTEXT', 'USERENV', 'UID', 'SYS_GUID',
      'ORA_HASH', 'STANDARD_HASH',
      'DBMS_RANDOM.VALUE', 'DBMS_RANDOM.STRING',
      // Object reference functions
      'REF', 'DEREF', 'VALUE',
      // XML functions
      'XMLELEMENT', 'XMLAGG', 'XMLFOREST', 'XMLROOT', 'XMLPARSE',
      'XMLQUERY', 'XMLTABLE', 'XMLSERIALIZE',
      // JSON functions (12c+)
      'JSON_VALUE', 'JSON_QUERY', 'JSON_TABLE', 'JSON_EXISTS',
      'JSON_OBJECT', 'JSON_ARRAY', 'JSON_ARRAYAGG', 'JSON_OBJECTAGG',
    ];
  }

  getSystemSchemas(): string[] {
    return [
      'SYS',
      'SYSTEM',
      'DBSNMP',
      'OUTLN',
      'DIP',
      'ORACLE_OCM',
      'APPQOSSYS',
      'WMSYS',
      'XDB',
      'ANONYMOUS',
      'XS$NULL',
      'GSMADMIN_INTERNAL',
      'GSMUSER',
      'AUDSYS',
      'REMOTE_SCHEDULER_AGENT',
      'SYSBACKUP',
      'SYSDG',
      'SYSKM',
      'SYSRAC',
      'OJVMSYS',
      'CTXSYS',
      'MDSYS',
      'ORDDATA',
      'ORDSYS',
      'LBACSYS',
    ];
  }
}
