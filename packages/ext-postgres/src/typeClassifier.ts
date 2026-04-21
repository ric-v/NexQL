import type { TypeClassifier } from '@nexql/core/core/db/TypeClassifier';

/**
 * PostgreSQL type classifier.
 * Categorizes PostgreSQL column types into numeric, text, date, and boolean groups.
 */
export class PostgresTypeClassifier implements TypeClassifier {
  private static readonly NUMERIC_TYPES = new Set([
    'smallint', 'int2',
    'integer', 'int', 'int4',
    'bigint', 'int8',
    'decimal', 'numeric',
    'real', 'float4',
    'double precision', 'float8',
    'serial', 'serial4',
    'bigserial', 'serial8',
    'smallserial', 'serial2',
    'money',
    'oid',
  ]);

  private static readonly TEXT_TYPES = new Set([
    'character varying', 'varchar',
    'character', 'char', 'bpchar',
    'text',
    'name',
    'citext',
    'uuid',
    'xml',
    'json', 'jsonb',
    'bytea',
    'bit', 'bit varying', 'varbit',
    'tsvector', 'tsquery',
    'inet', 'cidr', 'macaddr', 'macaddr8',
  ]);

  private static readonly DATE_TYPES = new Set([
    'date',
    'time', 'time without time zone', 'timetz', 'time with time zone',
    'timestamp', 'timestamp without time zone', 'timestamptz', 'timestamp with time zone',
    'interval',
  ]);

  private static readonly BOOLEAN_TYPES = new Set([
    'boolean', 'bool',
  ]);

  isNumeric(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (PostgresTypeClassifier.NUMERIC_TYPES.has(normalized)) {
      return true;
    }
    // Handle parameterized types like numeric(10,2) or varchar(255)
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return PostgresTypeClassifier.NUMERIC_TYPES.has(baseType);
  }

  isText(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (PostgresTypeClassifier.TEXT_TYPES.has(normalized)) {
      return true;
    }
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return PostgresTypeClassifier.TEXT_TYPES.has(baseType);
  }

  isDate(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (PostgresTypeClassifier.DATE_TYPES.has(normalized)) {
      return true;
    }
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return PostgresTypeClassifier.DATE_TYPES.has(baseType);
  }

  isBoolean(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    return PostgresTypeClassifier.BOOLEAN_TYPES.has(normalized);
  }
}
