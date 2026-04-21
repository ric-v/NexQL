import type { TableDiff } from '../../features/schemaDiff/schemaDiffTypes';
/**
 * Interface for engine-specific migration SQL generation.
 * The engine-agnostic `computeSchemaDiff` produces diffs; this provider
 * converts those diffs into engine-specific ALTER/CREATE/DROP statements.
 */
export interface MigrationStatementGenerator {
    /**
     * Builds migration SQL statements from computed schema diffs.
     * @param sourceSchema - The source schema name
     * @param targetSchema - The target schema name
     * @param diffs - The computed table diffs from schema comparison
     * @returns An array of SQL migration statements in the target engine's syntax
     */
    buildMigrationStatements(sourceSchema: string, targetSchema: string, diffs: TableDiff[]): string[];
}
//# sourceMappingURL=MigrationStatementGenerator.d.ts.map