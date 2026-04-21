import type { IntrospectionProvider } from '@nexql/core/core/db/introspection/IntrospectionProvider';

/**
 * MSSQL introspection provider.
 * Returns SQL queries using INFORMATION_SCHEMA and sys.* catalog views
 * to discover database objects.
 */
export class MssqlIntrospection implements IntrospectionProvider {
  listSchemas(): string {
    return `
      SELECT schema_name
      FROM INFORMATION_SCHEMA.SCHEMATA
      WHERE schema_name NOT IN ('guest', 'INFORMATION_SCHEMA', 'sys', 'db_owner',
        'db_accessadmin', 'db_securityadmin', 'db_ddladmin', 'db_backupoperator',
        'db_datareader', 'db_datawriter', 'db_denydatareader', 'db_denydatawriter')
      ORDER BY schema_name;
    `;
  }

  listTables(schema?: string): string {
    const schemaFilter = schema
      ? `AND t.TABLE_SCHEMA = '${schema}'`
      : `AND t.TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')`;
    return `
      SELECT
        t.TABLE_SCHEMA AS table_schema,
        t.TABLE_NAME AS table_name,
        t.TABLE_TYPE AS table_type
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE t.TABLE_TYPE = 'BASE TABLE'
        ${schemaFilter}
      ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME;
    `;
  }

  listViews(schema?: string): string {
    const schemaFilter = schema
      ? `AND v.TABLE_SCHEMA = '${schema}'`
      : `AND v.TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')`;
    return `
      SELECT
        v.TABLE_SCHEMA AS table_schema,
        v.TABLE_NAME AS table_name
      FROM INFORMATION_SCHEMA.VIEWS v
      WHERE 1=1
        ${schemaFilter}
      ORDER BY v.TABLE_SCHEMA, v.TABLE_NAME;
    `;
  }

  listColumns(schema: string, table: string): string {
    return `
      SELECT
        c.COLUMN_NAME AS column_name,
        c.DATA_TYPE AS data_type,
        c.IS_NULLABLE AS is_nullable,
        c.COLUMN_DEFAULT AS column_default,
        c.CHARACTER_MAXIMUM_LENGTH AS character_maximum_length,
        c.NUMERIC_PRECISION AS numeric_precision,
        c.NUMERIC_SCALE AS numeric_scale,
        c.ORDINAL_POSITION AS ordinal_position,
        COLUMNPROPERTY(OBJECT_ID('${schema}.${table}'), c.COLUMN_NAME, 'IsIdentity') AS is_identity
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = '${schema}'
        AND c.TABLE_NAME = '${table}'
      ORDER BY c.ORDINAL_POSITION;
    `;
  }

  listIndexes(schema: string, table: string): string {
    return `
      SELECT
        i.name AS index_name,
        i.is_unique,
        i.is_primary_key,
        i.type_desc AS index_type,
        STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
      FROM sys.indexes i
      INNER JOIN sys.index_columns ic
        ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN sys.columns c
        ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE i.object_id = OBJECT_ID('${schema}.${table}')
        AND i.name IS NOT NULL
      GROUP BY i.name, i.is_unique, i.is_primary_key, i.type_desc
      ORDER BY i.name;
    `;
  }

  listForeignKeys(schema: string, table: string): string {
    return `
      SELECT
        fk.name AS constraint_name,
        COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS column_name,
        SCHEMA_NAME(rt.schema_id) AS foreign_table_schema,
        rt.name AS foreign_table_name,
        COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS foreign_column_name
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc
        ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.tables rt
        ON fkc.referenced_object_id = rt.object_id
      WHERE fk.parent_object_id = OBJECT_ID('${schema}.${table}')
      ORDER BY fk.name, fkc.constraint_column_id;
    `;
  }

  listFunctions(schema?: string): string {
    const schemaFilter = schema
      ? `AND SCHEMA_NAME(o.schema_id) = '${schema}'`
      : `AND SCHEMA_NAME(o.schema_id) NOT IN ('sys', 'INFORMATION_SCHEMA')`;
    return `
      SELECT
        SCHEMA_NAME(o.schema_id) AS schema_name,
        o.name AS function_name,
        o.type_desc AS kind
      FROM sys.objects o
      WHERE o.type IN ('FN', 'IF', 'TF')
        ${schemaFilter}
      ORDER BY schema_name, o.name;
    `;
  }

  listProcedures(schema?: string): string {
    const schemaFilter = schema
      ? `AND SCHEMA_NAME(p.schema_id) = '${schema}'`
      : `AND SCHEMA_NAME(p.schema_id) NOT IN ('sys', 'INFORMATION_SCHEMA')`;
    return `
      SELECT
        SCHEMA_NAME(p.schema_id) AS schema_name,
        p.name AS procedure_name
      FROM sys.procedures p
      WHERE 1=1
        ${schemaFilter}
      ORDER BY schema_name, p.name;
    `;
  }

  search(term: string): string {
    return `
      SELECT TOP 50
        SCHEMA_NAME(o.schema_id) AS schema_name,
        o.name AS object_name,
        CASE o.type
          WHEN 'U' THEN 'table'
          WHEN 'V' THEN 'view'
          WHEN 'P' THEN 'procedure'
          WHEN 'FN' THEN 'function'
          WHEN 'IF' THEN 'function'
          WHEN 'TF' THEN 'function'
        END AS object_type
      FROM sys.objects o
      WHERE o.name LIKE '%${term}%'
        AND o.type IN ('U', 'V', 'P', 'FN', 'IF', 'TF')
        AND SCHEMA_NAME(o.schema_id) NOT IN ('sys', 'INFORMATION_SCHEMA')
      ORDER BY object_type, schema_name, o.name;
    `;
  }
}
