import type { TypeClassifier } from '@nexql/core/core/db/TypeClassifier';

/**
 * MySQL type classifier.
 * Categorizes MySQL column types into numeric, text, date, and boolean groups.
 */
export class MysqlTypeClassifier implements TypeClassifier {
  private static readonly NUMERIC_TYPES = new Set([
    'tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint',
    'float', 'double', 'double precision', 'real',
    'decimal', 'dec', 'numeric', 'fixed',
    'bit',
  ]);

  private static readonly TEXT_TYPES = new Set([
    'char', 'varchar', 'binary', 'varbinary',
    'tinyblob', 'blob', 'mediumblob', 'longblob',
    'tinytext', 'text', 'mediumtext', 'longtext',
    'enum', 'set',
    'json',
  ]);

  private static readonly DATE_TYPES = new Set([
    'date', 'datetime', 'timestamp', 'time', 'year',
  ]);

  isNumeric(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    // Handle TINYINT(1) and BOOLEAN as boolean, not numeric
    if (this.isBoolean(typeName)) {
      return false;
    }
    if (MysqlTypeClassifier.NUMERIC_TYPES.has(normalized)) {
      return true;
    }
    // Handle parameterized types like INT(11), DECIMAL(10,2)
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return MysqlTypeClassifier.NUMERIC_TYPES.has(baseType);
  }

  isText(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (MysqlTypeClassifier.TEXT_TYPES.has(normalized)) {
      return true;
    }
    // Handle parameterized types like VARCHAR(255), CHAR(10)
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return MysqlTypeClassifier.TEXT_TYPES.has(baseType);
  }

  isDate(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (MysqlTypeClassifier.DATE_TYPES.has(normalized)) {
      return true;
    }
    // Handle parameterized types like DATETIME(6), TIMESTAMP(3)
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return MysqlTypeClassifier.DATE_TYPES.has(baseType);
  }

  isBoolean(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (normalized === 'boolean' || normalized === 'bool') {
      return true;
    }
    // MySQL uses TINYINT(1) as boolean
    if (normalized === 'tinyint(1)') {
      return true;
    }
    return false;
  }
}
