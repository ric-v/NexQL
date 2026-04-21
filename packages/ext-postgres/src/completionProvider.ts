import type { CompletionProvider } from '@nexql/core/core/db/CompletionProvider';

/**
 * PostgreSQL completion provider.
 * Supplies PG-specific keywords, built-in functions, and system schemas
 * for SQL IntelliSense.
 */
export class PostgresCompletionProvider implements CompletionProvider {
  getKeywords(): string[] {
    return [
      // Standard SQL
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'EXISTS',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
      'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW',
      'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON',
      'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING',
      'LIMIT', 'OFFSET', 'FETCH', 'FIRST', 'NEXT', 'ROWS', 'ONLY',
      'UNION', 'INTERSECT', 'EXCEPT', 'ALL',
      'AS', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'NULL', 'IS', 'LIKE', 'ILIKE', 'BETWEEN', 'SIMILAR', 'TO',
      'TRUE', 'FALSE',
      'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT',
      'GRANT', 'REVOKE', 'WITH',
      // PG-specific
      'RETURNING', 'CONFLICT', 'DO', 'NOTHING',
      'LATERAL', 'MATERIALIZED', 'RECURSIVE',
      'EXPLAIN', 'ANALYZE', 'VERBOSE', 'BUFFERS', 'FORMAT',
      'VACUUM', 'REINDEX', 'CLUSTER', 'NOTIFY', 'LISTEN', 'UNLISTEN',
      'COPY', 'PERFORM', 'RAISE', 'EXCEPTION', 'NOTICE',
      'SERIAL', 'BIGSERIAL', 'SMALLSERIAL',
      'TABLESPACE', 'EXTENSION', 'SCHEMA', 'SEQUENCE',
      'TRIGGER', 'FUNCTION', 'PROCEDURE', 'LANGUAGE', 'PLPGSQL',
      'RETURNS', 'SETOF', 'RECORD', 'VOID',
      'IF', 'ELSIF', 'LOOP', 'WHILE', 'FOR', 'FOREACH', 'EXIT', 'CONTINUE',
      'DECLARE', 'VARIABLE', 'CONSTANT',
      'PARTITION', 'RANGE', 'LIST', 'HASH',
      'CONCURRENTLY', 'CASCADE', 'RESTRICT',
      'INHERITS', 'LIKE', 'INCLUDING', 'EXCLUDING',
      'GENERATED', 'ALWAYS', 'IDENTITY', 'OVERRIDING',
      'ON CONFLICT', 'DO UPDATE',
    ];
  }

  getBuiltinFunctions(): string[] {
    return [
      // Aggregate functions
      'count', 'sum', 'avg', 'min', 'max',
      'array_agg', 'string_agg', 'json_agg', 'jsonb_agg',
      'json_object_agg', 'jsonb_object_agg',
      'bool_and', 'bool_or', 'every',
      // Window functions
      'row_number', 'rank', 'dense_rank', 'percent_rank', 'cume_dist',
      'ntile', 'lag', 'lead', 'first_value', 'last_value', 'nth_value',
      // String functions
      'length', 'lower', 'upper', 'trim', 'ltrim', 'rtrim',
      'substring', 'replace', 'concat', 'concat_ws',
      'left', 'right', 'repeat', 'reverse', 'split_part',
      'regexp_match', 'regexp_matches', 'regexp_replace', 'regexp_split_to_array',
      'format', 'quote_ident', 'quote_literal', 'quote_nullable',
      'encode', 'decode', 'md5', 'sha256',
      // Date/time functions
      'now', 'current_timestamp', 'current_date', 'current_time',
      'date_trunc', 'date_part', 'extract', 'age',
      'make_date', 'make_time', 'make_timestamp', 'make_timestamptz',
      'to_timestamp', 'to_date', 'to_char',
      'clock_timestamp', 'statement_timestamp', 'transaction_timestamp',
      // Math functions
      'abs', 'ceil', 'ceiling', 'floor', 'round', 'trunc',
      'mod', 'power', 'sqrt', 'log', 'ln', 'exp',
      'random', 'setseed', 'sign', 'pi', 'degrees', 'radians',
      // JSON functions
      'json_build_object', 'jsonb_build_object',
      'json_build_array', 'jsonb_build_array',
      'json_extract_path', 'jsonb_extract_path',
      'json_extract_path_text', 'jsonb_extract_path_text',
      'jsonb_set', 'jsonb_insert', 'jsonb_pretty',
      'json_typeof', 'jsonb_typeof',
      'json_array_length', 'jsonb_array_length',
      'json_each', 'jsonb_each', 'json_each_text', 'jsonb_each_text',
      'json_object_keys', 'jsonb_object_keys',
      'to_json', 'to_jsonb', 'row_to_json',
      // Array functions
      'array_length', 'array_dims', 'array_lower', 'array_upper',
      'array_append', 'array_prepend', 'array_cat', 'array_remove',
      'array_position', 'array_positions', 'array_replace',
      'unnest', 'array_to_string', 'string_to_array',
      // Type casting
      'cast', 'coalesce', 'nullif', 'greatest', 'least',
      // System functions
      'current_database', 'current_schema', 'current_user', 'session_user',
      'pg_backend_pid', 'pg_cancel_backend', 'pg_terminate_backend',
      'pg_size_pretty', 'pg_database_size', 'pg_table_size', 'pg_total_relation_size',
      'pg_relation_size', 'pg_indexes_size',
      'pg_get_viewdef', 'pg_get_functiondef', 'pg_get_indexdef',
      'generate_series', 'generate_subscripts',
      'txid_current', 'pg_advisory_lock', 'pg_advisory_unlock',
    ];
  }

  getSystemSchemas(): string[] {
    return [
      'pg_catalog',
      'information_schema',
      'pg_toast',
      'pg_temp_1',
      'pg_toast_temp_1',
    ];
  }
}
