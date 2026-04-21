import type { TransactionSyntax } from '@nexql/core/core/db/TransactionSyntax';

/**
 * PostgreSQL transaction syntax provider.
 * Provides PG-specific transaction control commands including savepoint support.
 */
export class PostgresTransactionSyntax implements TransactionSyntax {
  begin(): string {
    return 'BEGIN';
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
    return `RELEASE SAVEPOINT ${this.quoteSavepointName(name)}`;
  }

  rollbackToSavepoint(name: string): string {
    return `ROLLBACK TO SAVEPOINT ${this.quoteSavepointName(name)}`;
  }

  private quoteSavepointName(name: string): string {
    // Savepoint names in PG are identifiers — quote if needed
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return name;
    }
    return `"${name.replace(/"/g, '""')}"`;
  }
}
