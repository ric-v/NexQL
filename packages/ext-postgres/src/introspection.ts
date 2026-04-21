import type { IntrospectionProvider } from '@nexql/core/core/db/introspection/IntrospectionProvider';

/**
 * PostgreSQL introspection provider.
 * Returns SQL queries that use information_schema and pg_catalog
 * to discover database objects.
 */
export class PostgresIntrospection implements IntrospectionProvider {
  listSchemas(): string {
    return `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name;
    `;
  }

  listTables(schema?: string): string {
    const schemaFilter = schema
      ? `AND table_schema = '${schema}'`
      : `AND table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')`;
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
      : `AND table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')`;
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
        udt_name,
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
        i.relname AS index_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary,
        array_to_string(array_agg(a.attname ORDER BY k.n), ', ') AS columns,
        am.amname AS index_type
      FROM pg_catalog.pg_index ix
      JOIN pg_catalog.pg_class i ON i.oid = ix.indexrelid
      JOIN pg_catalog.pg_class t ON t.oid = ix.indrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_catalog.pg_am am ON am.oid = i.relam
      CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n)
      JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE n.nspname = '${schema}'
        AND t.relname = '${table}'
      GROUP BY i.relname, ix.indisunique, ix.indisprimary, am.amname
      ORDER BY i.relname;
    `;
  }

  listForeignKeys(schema: string, table: string): string {
    return `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = '${schema}'
        AND tc.table_name = '${table}'
      ORDER BY tc.constraint_name, kcu.ordinal_position;
    `;
  }

  listFunctions(schema?: string): string {
    const schemaFilter = schema
      ? `AND n.nspname = '${schema}'`
      : `AND n.nspname NOT IN ('pg_catalog', 'information_schema')`;
    return `
      SELECT
        n.nspname AS schema_name,
        p.proname AS function_name,
        pg_get_function_result(p.oid) AS return_type,
        pg_get_function_arguments(p.oid) AS arguments,
        CASE p.prokind
          WHEN 'f' THEN 'function'
          WHEN 'p' THEN 'procedure'
          WHEN 'a' THEN 'aggregate'
          WHEN 'w' THEN 'window'
        END AS kind
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE p.prokind IN ('f', 'a', 'w')
        ${schemaFilter}
      ORDER BY n.nspname, p.proname;
    `;
  }

  listProcedures(schema?: string): string {
    const schemaFilter = schema
      ? `AND n.nspname = '${schema}'`
      : `AND n.nspname NOT IN ('pg_catalog', 'information_schema')`;
    return `
      SELECT
        n.nspname AS schema_name,
        p.proname AS procedure_name,
        pg_get_function_arguments(p.oid) AS arguments
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE p.prokind = 'p'
        ${schemaFilter}
      ORDER BY n.nspname, p.proname;
    `;
  }

  search(term: string): string {
    return `
      SELECT
        n.nspname AS schema_name,
        c.relname AS object_name,
        CASE c.relkind
          WHEN 'r' THEN 'table'
          WHEN 'v' THEN 'view'
          WHEN 'm' THEN 'materialized_view'
          WHEN 'i' THEN 'index'
          WHEN 'S' THEN 'sequence'
        END AS object_type
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname ILIKE '%${term}%'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND c.relkind IN ('r', 'v', 'm', 'i', 'S')
      ORDER BY object_type, schema_name, object_name
      LIMIT 50;
    `;
  }
}
