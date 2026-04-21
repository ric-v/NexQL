/**
 * Interface for engine-specific SQL template generation.
 * All methods are optional — the Core Extension disables commands
 * for which the active engine's provider returns `undefined`.
 */
export interface SqlTemplateProvider {
  selectAll?(schema: string, table: string): string;
  selectTop?(schema: string, table: string, limit: number): string;
  insert?(schema: string, table: string, columns: string[]): string;
  update?(schema: string, table: string, columns: string[], whereColumns: string[]): string;
  delete?(schema: string, table: string, whereColumns: string[]): string;
  createTable?(schema: string, table: string): string;
  dropTable?(schema: string, table: string): string;
  truncateTable?(schema: string, table: string): string;
  vacuum?(schema: string, table: string): string;
  analyze?(schema: string, table: string): string;
  /** Generates an INSERT statement for a single row with column values */
  insertRow?(table: string, columns: Record<string, unknown>): string;
  /** Generates an UPDATE statement for a single row */
  updateRow?(table: string, set: Record<string, unknown>, where: Record<string, unknown>): string;
  /** Generates a DELETE statement for a single row */
  deleteRow?(table: string, where: Record<string, unknown>): string;
}
