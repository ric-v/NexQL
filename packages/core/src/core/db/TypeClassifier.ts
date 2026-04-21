/**
 * Interface for engine-specific type classification.
 * Used by analyst features (column stats, chart type detection) to
 * categorize column types without hardcoding engine-specific type names.
 */
export interface TypeClassifier {
  /** Returns true if the given type name represents a numeric type */
  isNumeric(typeName: string): boolean;

  /** Returns true if the given type name represents a text/string type */
  isText(typeName: string): boolean;

  /** Returns true if the given type name represents a date/time type */
  isDate(typeName: string): boolean;

  /** Returns true if the given type name represents a boolean type */
  isBoolean(typeName: string): boolean;
}
