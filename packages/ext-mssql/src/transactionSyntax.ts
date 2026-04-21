import type { TransactionSyntax } from '@nexql/core/core/db/TransactionSyntax';

/**
 * MSSQL transaction syntax provider.
 * Provides T-SQL-specific transaction control commands:
 * - BEGIN TRANSACTION (not just BEGIN)
 * - SAVE TRANSACTION for savepoints (not SAVEPOINT)
 * - ROLLBACK TRANSACTION for savepoint rollback
 */
export class MssqlTransactionSyntax implements TransactionSyntax {
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
    return `SAVE TRANSACTION ${this.quoteSavepointName(name)}`;
  }

  releaseSavepoint(_name: string): string {
    // MSSQL does not support releasing savepoints — they are automatically
    // released on COMMIT. Return empty string as a no-op.
    return '';
  }

  rollbackToSavepoint(name: string): string {
    return `ROLLBACK TRANSACTION ${this.quoteSavepointName(name)}`;
  }

  private quoteSavepointName(name: string): string {
    // MSSQL savepoint names are identifiers — bracket-quote if needed
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return name;
    }
    return `[${name.replace(/\]/g, ']]')}]`;
  }
}
