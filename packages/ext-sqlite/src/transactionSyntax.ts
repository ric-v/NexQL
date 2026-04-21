import type { TransactionSyntax } from '@nexql/core/core/db/TransactionSyntax';

/**
 * SQLite transaction syntax provider.
 * Provides SQLite-specific transaction control commands:
 * - BEGIN TRANSACTION
 * - COMMIT
 * - ROLLBACK
 * - SAVEPOINT name (for nested transactions)
 * - RELEASE name (to release a savepoint)
 * - ROLLBACK TO name (to rollback to a savepoint)
 */
export class SqliteTransactionSyntax implements TransactionSyntax {
  begin(): string {
    return 'BEGIN TRANSACTION';
  }

  commit(): string {
    return 'COMMIT';
  }

  rollback(): string {
    return 'ROLLBACK';
  }

  savepoint(name: string): string {
    return `SAVEPOINT ${this.quoteSavepointName(name)}`;
  }

  releaseSavepoint(name: string): string {
    return `RELEASE ${this.quoteSavepointName(name)}`;
  }

  rollbackToSavepoint(name: string): string {
    return `ROLLBACK TO ${this.quoteSavepointName(name)}`;
  }

  private quoteSavepointName(name: string): string {
    // SQLite savepoint names are identifiers — double-quote if needed
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return name;
    }
    return `"${name.replace(/"/g, '""')}"`;
  }
}
