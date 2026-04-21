import type { DdlProvider } from '@nexql/core/core/db/DdlProvider';
import type { DbClient } from '@nexql/core/core/db/DbDriver';

/**
 * PostgreSQL DDL generation provider.
 * Generates CREATE statements for PostgreSQL database objects
 * by querying pg_catalog metadata.
 */
export class PostgresDdlProvider implements DdlProvider {
  supportedObjectTypes(): string[] {
    return ['table', 'view', 'function', 'index', 'trigger', 'sequence', 'type'];
  }

  async generateDdl(objectType: string, schema: string, name: string, client: DbClient): Promise<string> {
    switch (objectType) {
      case 'table':
        return this.generateTableDdl(schema, name, client);
      case 'view':
        return this.generateViewDdl(schema, name, client);
      case 'function':
        return this.generateFunctionDdl(schema, name, client);
      case 'index':
        return this.generateIndexDdl(schema, name, client);
      case 'sequence':
        return this.generateSequenceDdl(schema, name, client);
      default:
        return `-- DDL generation for '${objectType}' is not yet implemented`;
    }
  }

  private async generateTableDdl(schema: string, name: string, client: DbClient): Promise<string> {
    // Get columns
    const colResult = await client.query(`
      SELECT
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [schema, name]);

    if (colResult.rows.length === 0) {
      return `-- Table "${schema}"."${name}" not found`;
    }

    const columns = colResult.rows.map((col: any) => {
      let typeName = col.udt_name;
      if (col.character_maximum_length) {
        typeName = `${col.data_type}(${col.character_maximum_length})`;
      } else if (col.numeric_precision && col.data_type === 'numeric') {
        typeName = `numeric(${col.numeric_precision}, ${col.numeric_scale ?? 0})`;
      }
      let def = `  "${col.column_name}" ${typeName}`;
      if (col.column_default) {
        def += ` DEFAULT ${col.column_default}`;
      }
      if (col.is_nullable === 'NO') {
        def += ' NOT NULL';
      }
      return def;
    });

    // Get primary key
    const pkResult = await client.query(`
      SELECT array_agg(a.attname ORDER BY k.n) AS pk_columns
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n)
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE n.nspname = $1 AND t.relname = $2 AND ix.indisprimary
      GROUP BY ix.indexrelid
    `, [schema, name]);

    if (pkResult.rows.length > 0 && pkResult.rows[0].pk_columns) {
      const pkCols = pkResult.rows[0].pk_columns.map((c: string) => `"${c}"`).join(', ');
      columns.push(`  PRIMARY KEY (${pkCols})`);
    }

    return `CREATE TABLE "${schema}"."${name}" (\n${columns.join(',\n')}\n);`;
  }

  private async generateViewDdl(schema: string, name: string, client: DbClient): Promise<string> {
    const result = await client.query(`
      SELECT pg_get_viewdef($1::regclass, true) AS definition
    `, [`"${schema}"."${name}"`]);

    if (result.rows.length === 0) {
      return `-- View "${schema}"."${name}" not found`;
    }

    return `CREATE OR REPLACE VIEW "${schema}"."${name}" AS\n${result.rows[0].definition}`;
  }

  private async generateFunctionDdl(schema: string, name: string, client: DbClient): Promise<string> {
    const result = await client.query(`
      SELECT pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = $1 AND p.proname = $2
      LIMIT 1
    `, [schema, name]);

    if (result.rows.length === 0) {
      return `-- Function "${schema}"."${name}" not found`;
    }

    return result.rows[0].definition;
  }

  private async generateIndexDdl(schema: string, name: string, client: DbClient): Promise<string> {
    const result = await client.query(`
      SELECT pg_get_indexdef(i.oid) AS definition
      FROM pg_class i
      JOIN pg_namespace n ON n.oid = i.relnamespace
      WHERE n.nspname = $1 AND i.relname = $2 AND i.relkind = 'i'
      LIMIT 1
    `, [schema, name]);

    if (result.rows.length === 0) {
      return `-- Index "${schema}"."${name}" not found`;
    }

    return result.rows[0].definition + ';';
  }

  private async generateSequenceDdl(schema: string, name: string, client: DbClient): Promise<string> {
    const result = await client.query(`
      SELECT
        start_value,
        minimum_value,
        maximum_value,
        increment,
        cycle_option
      FROM information_schema.sequences
      WHERE sequence_schema = $1 AND sequence_name = $2
    `, [schema, name]);

    if (result.rows.length === 0) {
      return `-- Sequence "${schema}"."${name}" not found`;
    }

    const seq = result.rows[0];
    let ddl = `CREATE SEQUENCE "${schema}"."${name}"`;
    ddl += `\n  INCREMENT BY ${seq.increment}`;
    ddl += `\n  MINVALUE ${seq.minimum_value}`;
    ddl += `\n  MAXVALUE ${seq.maximum_value}`;
    ddl += `\n  START WITH ${seq.start_value}`;
    ddl += seq.cycle_option === 'YES' ? '\n  CYCLE' : '\n  NO CYCLE';
    ddl += ';';
    return ddl;
  }
}
