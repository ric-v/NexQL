import type { DbDialect } from '@nexql/core/core/db/DbDialect';
import type { FeatureFlags } from '@nexql/core/core/db/capabilities';
import type { DbEngine } from '@nexql/core/core/db/DbEngine';
import type { IntrospectionProvider } from '@nexql/core/core/db/introspection/IntrospectionProvider';
import { OracleIntrospection } from './introspection';
import { oracleFeatureFlags } from './featureFlags';

/**
 * Oracle dialect implementation.
 * Provides double-quote identifier quoting, FETCH FIRST n ROWS ONLY for limit
 * (Oracle 12c+), EXPLAIN PLAN FOR for explain, and an AI system prompt
 * addendum describing Oracle capabilities.
 */
export class OracleDialect implements DbDialect {
  readonly engine: DbEngine = 'oracle';
  readonly capabilities: FeatureFlags = oracleFeatureFlags;
  readonly introspect: IntrospectionProvider = new OracleIntrospection();

  identifier(name: string): string {
    // Double-quote identifiers, escaping embedded double quotes
    return `"${name.replace(/"/g, '""')}"`;
  }

  limitClause(n: number): string {
    return `FETCH FIRST ${n} ROWS ONLY`;
  }

  explain(sql: string): string {
    return `EXPLAIN PLAN FOR ${sql}`;
  }

  buildSystemPromptAddendum(): string {
    return [
      'You are working with an Oracle Database.',
      'Oracle uses schemas that map to database users (owner-based schema model).',
      'Use double quotes "name" for case-sensitive identifier quoting.',
      'Use :param bind variable placeholders for parameterized queries.',
      'Use FETCH FIRST n ROWS ONLY for row limiting (Oracle 12c+).',
      'For older versions, use ROWNUM in a subquery for pagination.',
      'Oracle supports transactions implicitly — DML auto-begins a transaction.',
      'Use COMMIT and ROLLBACK to end transactions; SAVEPOINT for partial rollback.',
      'Use EXPLAIN PLAN FOR to analyze query execution plans.',
      'Oracle uses sequences with NEXTVAL/CURRVAL for auto-generated keys.',
      'Oracle has no native BOOLEAN type before 23c; use NUMBER(1) with 0/1.',
      'PL/SQL is the procedural extension: supports packages, procedures, functions, triggers.',
      'Use DUAL table for SELECT expressions without a real table.',
      'Common table expressions (CTEs) and window functions are fully supported.',
    ].join('\n');
  }
}
