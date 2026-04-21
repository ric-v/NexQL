import type { TransactionSyntax } from './TransactionSyntax';

/**
 * ANSI SQL default TransactionSyntax implementation.
 * Provides basic BEGIN, COMMIT, ROLLBACK without savepoint support.
 * Used as a fallback when no engine-specific TransactionSyntax is registered.
 */
export class DefaultTransactionSyntax implements TransactionSyntax {
  begin(): string {
    return 'BEGIN';
  }

  commit(): string {
    return 'COMMIT';
  }

  rollback(): string {
    return 'ROLLBACK';
  }

  // No savepoint support in the default ANSI SQL fallback
}
