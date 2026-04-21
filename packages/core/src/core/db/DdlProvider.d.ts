import type { DbClient } from './DbDriver';
/**
 * Interface for engine-specific DDL generation.
 * The Core Extension's DDL viewer delegates to this provider
 * to generate CREATE statements for database objects.
 */
export interface DdlProvider {
    /**
     * Generates the complete DDL (CREATE statement) for the specified object.
     * @param objectType - The type of object (e.g., 'table', 'view', 'function')
     * @param schema - The schema containing the object
     * @param name - The object name
     * @param client - A database client for querying metadata
     */
    generateDdl(objectType: string, schema: string, name: string, client: DbClient): Promise<string>;
    /**
     * Returns the list of object types this provider can generate DDL for.
     * (e.g., ['table', 'view', 'function', 'index', 'trigger'])
     */
    supportedObjectTypes(): string[];
}
//# sourceMappingURL=DdlProvider.d.ts.map