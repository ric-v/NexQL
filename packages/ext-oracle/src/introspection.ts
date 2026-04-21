import type { IntrospectionProvider } from '@nexql/core/core/db/introspection/IntrospectionProvider';

/**
 * Oracle introspection provider.
 * Returns SQL queries using ALL_* data dictionary views to discover
 * database objects. Oracle schemas map to users (owner-based model).
 */
export class OracleIntrospection implements IntrospectionProvider {
  listSchemas(): string {
    return `
      SELECT username AS schema_name
      FROM all_users
      WHERE username NOT IN (
        'SYS', 'SYSTEM', 'DBSNMP', 'OUTLN', 'DIP', 'ORACLE_OCM',
        'APPQOSSYS', 'WMSYS', 'XDB', 'ANONYMOUS', 'XS$NULL',
        'GSMADMIN_INTERNAL', 'GSMUSER', 'AUDSYS', 'REMOTE_SCHEDULER_AGENT',
        'SYSBACKUP', 'SYSDG', 'SYSKM', 'SYSRAC', 'OJVMSYS',
        'CTXSYS', 'MDSYS', 'ORDDATA', 'ORDSYS', 'LBACSYS'
      )
      ORDER BY username
    `;
  }

  listTables(schema?: string): string {
    const schemaFilter = schema
      ? `WHERE t.owner = '${schema}'`
      : `WHERE t.owner NOT IN ('SYS', 'SYSTEM', 'XDB', 'CTXSYS', 'MDSYS', 'ORDDATA', 'ORDSYS', 'WMSYS', 'LBACSYS', 'AUDSYS')`;
    return `
      SELECT
        t.owner AS table_schema,
        t.table_name AS table_name,
        'BASE TABLE' AS table_type
      FROM all_tables t
      ${schemaFilter}
      ORDER BY t.owner, t.table_name
    `;
  }

  listViews(schema?: string): string {
    const schemaFilter = schema
      ? `WHERE v.owner = '${schema}'`
      : `WHERE v.owner NOT IN ('SYS', 'SYSTEM', 'XDB', 'CTXSYS', 'MDSYS', 'ORDDATA', 'ORDSYS', 'WMSYS', 'LBACSYS', 'AUDSYS')`;
    return `
      SELECT
        v.owner AS table_schema,
        v.view_name AS table_name
      FROM all_views v
      ${schemaFilter}
      ORDER BY v.owner, v.view_name
    `;
  }

  listColumns(schema: string, table: string): string {
    return `
      SELECT
        c.column_name AS column_name,
        c.data_type AS data_type,
        c.nullable AS is_nullable,
        c.data_default AS column_default,
        c.char_length AS character_maximum_length,
        c.data_precision AS numeric_precision,
        c.data_scale AS numeric_scale,
        c.column_id AS ordinal_position
      FROM all_tab_columns c
      WHERE c.owner = '${schema}'
        AND c.table_name = '${table}'
      ORDER BY c.column_id
    `;
  }

  listIndexes(schema: string, table: string): string {
    return `
      SELECT
        i.index_name AS index_name,
        CASE WHEN i.uniqueness = 'UNIQUE' THEN 'Y' ELSE 'N' END AS is_unique,
        CASE WHEN c2.constraint_type = 'P' THEN 'Y' ELSE 'N' END AS is_primary_key,
        i.index_type AS index_type,
        LISTAGG(ic.column_name, ', ') WITHIN GROUP (ORDER BY ic.column_position) AS columns
      FROM all_indexes i
      INNER JOIN all_ind_columns ic
        ON i.owner = ic.index_owner AND i.index_name = ic.index_name
      LEFT JOIN all_constraints c2
        ON i.owner = c2.owner AND i.index_name = c2.index_name AND c2.constraint_type = 'P'
      WHERE i.table_owner = '${schema}'
        AND i.table_name = '${table}'
      GROUP BY i.index_name, i.uniqueness, i.index_type, c2.constraint_type
      ORDER BY i.index_name
    `;
  }

  listForeignKeys(schema: string, table: string): string {
    return `
      SELECT
        c.constraint_name AS constraint_name,
        cc.column_name AS column_name,
        rc.owner AS foreign_table_schema,
        rc.table_name AS foreign_table_name,
        rcc.column_name AS foreign_column_name
      FROM all_constraints c
      INNER JOIN all_cons_columns cc
        ON c.owner = cc.owner AND c.constraint_name = cc.constraint_name
      INNER JOIN all_constraints rc
        ON c.r_owner = rc.owner AND c.r_constraint_name = rc.constraint_name
      INNER JOIN all_cons_columns rcc
        ON rc.owner = rcc.owner AND rc.constraint_name = rcc.constraint_name
        AND cc.position = rcc.position
      WHERE c.owner = '${schema}'
        AND c.table_name = '${table}'
        AND c.constraint_type = 'R'
      ORDER BY c.constraint_name, cc.position
    `;
  }

  listFunctions(schema?: string): string {
    const schemaFilter = schema
      ? `AND o.owner = '${schema}'`
      : `AND o.owner NOT IN ('SYS', 'SYSTEM', 'XDB', 'CTXSYS', 'MDSYS', 'ORDDATA', 'ORDSYS', 'WMSYS', 'LBACSYS', 'AUDSYS')`;
    return `
      SELECT
        o.owner AS schema_name,
        o.object_name AS function_name,
        o.object_type AS kind
      FROM all_objects o
      WHERE o.object_type = 'FUNCTION'
        ${schemaFilter}
      ORDER BY o.owner, o.object_name
    `;
  }

  listProcedures(schema?: string): string {
    const schemaFilter = schema
      ? `AND p.owner = '${schema}'`
      : `AND p.owner NOT IN ('SYS', 'SYSTEM', 'XDB', 'CTXSYS', 'MDSYS', 'ORDDATA', 'ORDSYS', 'WMSYS', 'LBACSYS', 'AUDSYS')`;
    return `
      SELECT
        p.owner AS schema_name,
        p.object_name AS procedure_name
      FROM all_procedures p
      WHERE p.object_type = 'PROCEDURE'
        ${schemaFilter}
      ORDER BY p.owner, p.object_name
    `;
  }

  search(term: string): string {
    return `
      SELECT *
      FROM (
        SELECT
          o.owner AS schema_name,
          o.object_name AS object_name,
          CASE o.object_type
            WHEN 'TABLE' THEN 'table'
            WHEN 'VIEW' THEN 'view'
            WHEN 'PROCEDURE' THEN 'procedure'
            WHEN 'FUNCTION' THEN 'function'
            WHEN 'PACKAGE' THEN 'package'
            WHEN 'SEQUENCE' THEN 'sequence'
          END AS object_type
        FROM all_objects o
        WHERE UPPER(o.object_name) LIKE UPPER('%${term}%')
          AND o.object_type IN ('TABLE', 'VIEW', 'PROCEDURE', 'FUNCTION', 'PACKAGE', 'SEQUENCE')
          AND o.owner NOT IN ('SYS', 'SYSTEM', 'XDB', 'CTXSYS', 'MDSYS', 'ORDDATA', 'ORDSYS', 'WMSYS', 'LBACSYS', 'AUDSYS')
        ORDER BY o.object_type, o.owner, o.object_name
      )
      WHERE ROWNUM <= 50
    `;
  }
}
