import type { TypeClassifier } from './TypeClassifier';

/**
 * Default heuristic TypeClassifier used as a fallback when no engine-specific
 * classifier is registered. Uses common SQL type name patterns to classify types.
 */
export class DefaultTypeClassifier implements TypeClassifier {
  private static readonly NUMERIC_PATTERNS = [
    'int', 'float', 'double', 'decimal', 'numeric', 'real', 'money',
    'bigint', 'smallint', 'tinyint', 'mediumint', 'serial', 'number',
  ];

  private static readonly TEXT_PATTERNS = [
    'char', 'text', 'varchar', 'nchar', 'nvarchar', 'clob', 'string',
    'ntext', 'longtext', 'mediumtext', 'tinytext',
  ];

  private static readonly DATE_PATTERNS = [
    'date', 'time', 'timestamp', 'datetime', 'interval', 'year',
  ];

  private static readonly BOOLEAN_PATTERNS = [
    'bool', 'boolean', 'bit',
  ];

  isNumeric(typeName: string): boolean {
    const t = typeName.toLowerCase().trim();
    return DefaultTypeClassifier.NUMERIC_PATTERNS.some(p => t.includes(p));
  }

  isText(typeName: string): boolean {
    const t = typeName.toLowerCase().trim();
    return DefaultTypeClassifier.TEXT_PATTERNS.some(p => t.includes(p));
  }

  isDate(typeName: string): boolean {
    const t = typeName.toLowerCase().trim();
    return DefaultTypeClassifier.DATE_PATTERNS.some(p => t.includes(p));
  }

  isBoolean(typeName: string): boolean {
    const t = typeName.toLowerCase().trim();
    return DefaultTypeClassifier.BOOLEAN_PATTERNS.some(p => t.includes(p));
  }
}
