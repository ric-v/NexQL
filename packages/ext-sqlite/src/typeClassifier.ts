import type { TypeClassifier } from '@nexql/core/core/db/TypeClassifier';

/**
 * SQLite type classifier.
 * Categorizes SQLite column types into numeric, text, date, and boolean groups.
 *
 * SQLite has a flexible type system with type affinity rules. The declared type
 * name determines the affinity. This classifier handles common declared type names
 * and maps them to logical categories.
 */
export class SqliteTypeClassifier implements TypeClassifier {
  private static readonly NUMERIC_TYPES = new Set([
    'integer', 'int', 'tinyint', 'smallint', 'mediumint', 'bigint',
    'int2', 'int8', 'unsigned big int',
    'real', 'double', 'double precision', 'float',
    'numeric', 'decimal',
  ]);

  private static readonly TEXT_TYPES = new Set([
    'text', 'clob',
    'blob',
    'character', 'varchar', 'varying character', 'nchar',
    'native character', 'nvarchar',
  ]);

  /**
   * SQLite has no native date type, but these declared type names are
   * commonly used to indicate date/time values stored as TEXT, REAL, or INTEGER.
   */
  private static readonly DATE_PATTERNS = new Set([
    'date', 'datetime', 'timestamp',
  ]);

  isNumeric(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (SqliteTypeClassifier.NUMERIC_TYPES.has(normalized)) {
      return true;
    }
    // Handle parameterized types like DECIMAL(10,5), INT(11)
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return SqliteTypeClassifier.NUMERIC_TYPES.has(baseType);
  }

  isText(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (SqliteTypeClassifier.TEXT_TYPES.has(normalized)) {
      return true;
    }
    // Handle parameterized types like VARCHAR(255), CHARACTER(20)
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return SqliteTypeClassifier.TEXT_TYPES.has(baseType);
  }

  isDate(typeName: string): boolean {
    const normalized = typeName.toLowerCase().trim();
    if (SqliteTypeClassifier.DATE_PATTERNS.has(normalized)) {
      return true;
    }
    // Handle parameterized types like DATETIME(6)
    const baseType = normalized.replace(/\(.*\)/, '').trim();
    return SqliteTypeClassifier.DATE_PATTERNS.has(baseType);
  }

  isBoolean(_typeName: string): boolean {
    // SQLite has no native boolean type. Booleans are typically stored as
    // INTEGER (0/1). We do not classify any type as boolean since SQLite
    // does not have a distinct boolean affinity.
    return false;
  }
}
