import type { IntrospectionProvider } from '@nexql/core/core/db/introspection/IntrospectionProvider';

/**
 * MySQL introspection provider.
 * Returns SQL queries that use information_schema to discover database objects.
 */
export class MysqlIntrospection implements IntrospectionProvider {
  listSchemas(): string {
    return `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
      ORDER BY schema_name;
    `;
  }

  listTables(schema?: string): string {
    const schemaFilter = schema
      ? `AND table_schema = '${schema}'`
      : `AND table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')`;
    return `
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        ${schemaFilter}
      ORDER BY table_schema, table_name;
    `;
  }

  listViews(schema?: string): string {
    const schemaFilter = schema
      ? `AND table_schema = '${schema}'`
      : `AND table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')`;
    return `
      SELECT table_schema, table_name
      FROM information_schema.views
      WHERE 1=1
        ${schemaFilter}
      ORDER BY table_schema, table_name;
    `;
  }

  listColumns(schema: string, table: string): string {
    return `
      SELECT
        column_name,
        data_type,
        column_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = '${schema}'
        AND table_name = '${table}'
      ORDER BY ordinal_position;
    `;
  }

  listIndexes(schema: string, table: string): string {
    return `
      SELECT
        index_name,
        non_unique,
        GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns,
        index_type
      FROM information_schema.statistics
      WHERE table_schema = '${schema}'
        AND table_name = '${table}'
      GROUP BY index_name, non_unique, index_type
      ORDER BY index_name;
    `;
  }

  listForeignKeys(schema: string, table: string): string {
    return `
      SELECT
        constraint_name,
        column_name,
        referenced_table_schema AS foreign_table_schema,
        referenced_table_name AS foreign_table_name,
        referenced_column_name AS foreign_column_name
      FROM information_schema.key_column_usage
      WHERE table_schema = '${schema}'
        AND table_name = '${table}'
        AND referenced_table_name IS NOT NULL
      ORDER BY constraint_name, ordinal_position;
    `;
  }

  listFunctions(schema?: string): string {
    const schemaFilter = schema
      ? `AND routine_schema = '${schema}'`
      : `AND routine_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')`;
    return `
      SELECT
        routine_schema AS schema_name,
        routine_name AS function_name,
        data_type AS return_type,
        routine_type AS kind
      FROM information_schema.routines
      WHERE routine_type = 'FUNCTION'
        ${schemaFilter}
      ORDER BY routine_schema, routine_name;
    `;
  }

  listProcedures(schema?: string): string {
    const schemaFilter = schema
      ? `AND routine_schema = '${schema}'`
      : `AND routine_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')`;
    return `
      SELECT
        routine_schema AS schema_name,
        routine_name AS procedure_name
      FROM information_schema.routines
      WHERE routine_type = 'PROCEDURE'
        ${schemaFilter}
      ORDER BY routine_schema, routine_name;
    `;
  }

  search(term: string): string {
    return `
      SELECT
        table_schema AS schema_name,
        table_name AS object_name,
        CASE table_type
          WHEN 'BASE TABLE' THEN 'table'
          WHEN 'VIEW' THEN 'view'
        END AS object_type
      FROM information_schema.tables
      WHERE table_name LIKE '%${term}%'
        AND table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
      ORDER BY object_type, table_schema, table_name
      LIMIT 50;
    `;
  }
}
