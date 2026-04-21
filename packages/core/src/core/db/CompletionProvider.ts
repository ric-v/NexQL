/**
 * Interface for engine-specific SQL IntelliSense support.
 * Provides keywords, built-in functions, and system schemas
 * for code completion.
 */
export interface CompletionProvider {
  /**
   * Returns the engine's SQL keywords for completion.
   * (e.g., PG has RETURNING, MySQL has LIMIT ... OFFSET, SQLite has PRAGMA)
   */
  getKeywords(): string[];

  /**
   * Returns the engine's built-in function names for completion.
   */
  getBuiltinFunctions(): string[];

  /**
   * Returns system schema names to filter from user-facing lists.
   * (e.g., pg_catalog, information_schema, mysql, sys)
   */
  getSystemSchemas(): string[];
}
