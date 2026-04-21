import type { TypeClassifier } from '@nexql/core/core/db/TypeClassifier';

/**
 * MSSQL type classifier.
 * Categorizes SQL Server column types into numeric, text, date, and boolean groups.
 */
export class MssqlTypeClassifier implements TypeClassifier {
  private static readonly NUMERIC_TYPES = new Set([
    'tinyint',
    'smallint',
    'int',
    'bigint',
    'float',
    'real',
    'decimal',
    'numeric',
    'money',
    'smallmoney',
  ]);

  private static readonly TEXT_TYPES = new Set([
    'char',
    'varchar',
    'text',
    'nchar',
    'nvarchar',
    'ntext',
    'xml',
    'uniqueidentifier',
    'sysname',
  ]);

  private static readonly DATE_TYPES = new Set([
    'date',
    'time',
    'datetime',
    'datetime2',
    'smalldatetime',
    'datetimeoffset',
  ]);

  private static readonly BOOLEAN_TYPES = new Set([
    'bit',
  ]);

  isNumeric(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (MssqlTypeClassifier.NUMERIC_TYPES.has(normalized)) {
      return true;
    }
    // Handle parameterized types like decimal(10,2) or numeric(18,4)
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return MssqlTypeClassifier.NUMERIC_TYPES.has(baseType);
  }

  isText(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (MssqlTypeClassifier.TEXT_TYPES.has(normalized)) {
      return true;
    }
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return MssqlTypeClassifier.TEXT_TYPES.has(baseType);
  }

  isDate(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (MssqlTypeClassifier.DATE_TYPES.has(normalized)) {
      return true;
    }
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return MssqlTypeClassifier.DATE_TYPES.has(baseType);
  }

  isBoolean(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    return MssqlTypeClassifier.BOOLEAN_TYPES.has(normalized);
  }
}
