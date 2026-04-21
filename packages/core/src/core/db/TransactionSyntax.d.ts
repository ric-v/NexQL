/**
 * Interface for engine-specific transaction commands.
 * Required methods provide basic transaction control; optional methods
 * provide savepoint support for engines that support it.
 */
export interface TransactionSyntax {
    /** Returns the SQL command to begin a transaction */
    begin(): string;
    /** Returns the SQL command to commit a transaction */
    commit(): string;
    /** Returns the SQL command to rollback a transaction */
    rollback(): string;
    /** Returns the SQL command to create a savepoint (if supported) */
    savepoint?(name: string): string;
    /** Returns the SQL command to release a savepoint (if supported) */
    releaseSavepoint?(name: string): string;
    /** Returns the SQL command to rollback to a savepoint (if supported) */
    rollbackToSavepoint?(name: string): string;
}
//# sourceMappingURL=TransactionSyntax.d.ts.map