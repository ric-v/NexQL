import type { TypeClassifier } from '@nexql/core/core/db/TypeClassifier';

/**
 * Oracle type classifier.
 * Categorizes Oracle column types into numeric, text, date, and boolean groups.
 * Note: Oracle has no native BOOLEAN type before 23c; NUMBER(1) is commonly
 * used as a boolean substitute.
 */
export class OracleTypeClassifier implements TypeClassifier {
  private static readonly NUMERIC_TYPES = new Set([
    'number',
    'float',
    'binary_float',
    'binary_double',
    'integer',
    'int',
    'smallint',
    'decimal',
    'numeric',
    'real',
    'double precision',
  ]);

  private static readonly TEXT_TYPES = new Set([
    'varchar2',
    'nvarchar2',
    'char',
    'nchar',
    'clob',
    'nclob',
    'long',
    'raw',
    'long raw',
    'rowid',
    'urowid',
    'xmltype',
  ]);

  private static readonly DATE_TYPES = new Set([
    'date',
    'timestamp',
    'timestamp with time zone',
    'timestamp with local time zone',
    'interval year to month',
    'interval day to second',
  ]);

  private static readonly BOOLEAN_TYPES = new Set([
    'boolean',
  ]);

  isNumeric(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (OracleTypeClassifier.NUMERIC_TYPES.has(normalized)) {
      return true;
    }
    // Handle parameterized types like NUMBER(10,2)
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return OracleTypeClassifier.NUMERIC_TYPES.has(baseType);
  }

  isText(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (OracleTypeClassifier.TEXT_TYPES.has(normalized)) {
      return true;
    }
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return OracleTypeClassifier.TEXT_TYPES.has(baseType);
  }

  isDate(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (OracleTypeClassifier.DATE_TYPES.has(normalized)) {
      return true;
    }
    // Handle TIMESTAMP(6) WITH TIME ZONE etc.
    const baseType = normalized.replace(/\(\d+\)/, '').trim();
    return OracleTypeClassifier.DATE_TYPES.has(baseType);
  }

  isBoolean(typeName: string): boolean {
    // Oracle 23c introduced native BOOLEAN; before that, no native boolean
    const normalized = typeName.toLowerCase().trim();
    return OracleTypeClassifier.BOOLEAN_TYPES.has(normalized);
  }
}
