import type { DbDialect } from '@nexql/core/core/db/DbDialect';
import type { FeatureFlags } from '@nexql/core/core/db/capabilities';
import type { DbEngine } from '@nexql/core/core/db/DbEngine';
import type { IntrospectionProvider } from '@nexql/core/core/db/introspection/IntrospectionProvider';
import { PostgresIntrospection } from './introspection';
import { postgresFeatureFlags } from './featureFlags';

/**
 * PostgreSQL dialect implementation.
 * Provides identifier quoting, LIMIT clause generation, EXPLAIN syntax,
 * and an AI system prompt addendum describing PostgreSQL capabilities.
 */
export class PostgresDialect implements DbDialect {
  readonly engine: DbEngine = 'postgres';
  readonly capabilities: FeatureFlags = postgresFeatureFlags;
  readonly introspect: IntrospectionProvider = new PostgresIntrospection();

  identifier(name: string): string {
    // Double-quote identifiers, escaping embedded double quotes
    return `"${name.replace(/"/g, '""')}"`;
  }

  limitClause(n: number): string {
    return `LIMIT ${n}`;
  }

  explain(sql: string): string {
    return `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${sql}`;
  }

  buildSystemPromptAddendum(): string {
    return [
      'You are working with a PostgreSQL database.',
      'PostgreSQL supports schemas, CTEs, window functions, RETURNING clauses, JSONB operators, array types, and full-text search.',
      'Use double quotes for identifiers that need quoting.',
      'Use $1, $2, ... for parameterized queries.',
      'PostgreSQL supports transactions with SAVEPOINT, RELEASE SAVEPOINT, and ROLLBACK TO SAVEPOINT.',
      'Use EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) for query plan analysis.',
    ].join('\n');
  }
}
