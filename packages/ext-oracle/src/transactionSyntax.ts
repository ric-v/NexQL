import type { TransactionSyntax } from '@nexql/core/core/db/TransactionSyntax';

/**
 * Oracle transaction syntax provider.
 * Oracle auto-begins transactions on the first DML statement.
 * There is no explicit BEGIN TRANSACTION command — transactions are implicit.
 * Use COMMIT, ROLLBACK, SAVEPOINT, and ROLLBACK TO for transaction control.
 */
export class OracleTransactionSyntax implements TransactionSyntax {
  begin(): string {
    // Oracle implicitly begins a transaction on the first DML statement.
    // SET TRANSACTION can be used to set isolation level for the next transaction.
    return 'SET TRANSACTION READ WRITE';
  }

  commit(): string {
    return 'COMMIT';
  }

  rollback(): string {
    return 'ROLLBACK';
  }

  savepoint(name: string): string {
    return `SAVEPOINT ${name}`;
  }

  rollbackToSavepoint(name: string): string {
    return `ROLLBACK TO ${name}`;
  }

  // Oracle does not support releasing savepoints — they are automatically
  // released on COMMIT or overwritten by a new savepoint with the same name.
}
