import type { TransactionSyntax } from '@nexql/core/core/db/TransactionSyntax';

/**
 * MySQL transaction syntax provider.
 * Provides MySQL-specific transaction control commands:
 * - START TRANSACTION (not just BEGIN)
 * - SAVEPOINT for named savepoints
 * - RELEASE SAVEPOINT to release a savepoint
 * - ROLLBACK TO SAVEPOINT for savepoint rollback
 */
export class MysqlTransactionSyntax implements TransactionSyntax {
  begin(): string {
    return 'START TRANSACTION';
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
    // MySQL savepoint names are identifiers — backtick-quote if needed
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return name;
    }
    return `\`${name.replace(/`/g, '``')}\``;
  }
}
