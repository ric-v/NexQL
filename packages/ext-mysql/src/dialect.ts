import type { DbDialect } from '@nexql/core/core/db/DbDialect';
import type { FeatureFlags } from '@nexql/core/core/db/capabilities';
import type { DbEngine } from '@nexql/core/core/db/DbEngine';
import type { IntrospectionProvider } from '@nexql/core/core/db/introspection/IntrospectionProvider';
import { MysqlIntrospection } from './introspection';
import { mysqlFeatureFlags } from './featureFlags';

/**
 * MySQL dialect implementation.
 * Provides identifier quoting, LIMIT clause generation, EXPLAIN syntax,
 * and an AI system prompt addendum describing MySQL capabilities.
 */
export class MysqlDialect implements DbDialect {
  readonly engine: DbEngine = 'mysql';
  readonly capabilities: FeatureFlags = mysqlFeatureFlags;
  readonly introspect: IntrospectionProvider = new MysqlIntrospection();

  identifier(name: string): string {
    // Backtick-quote identifiers, escaping embedded backticks
    return `\`${name.replace(/`/g, '``')}\``;
  }

  limitClause(n: number): string {
    return `LIMIT ${n}`;
  }

  explain(sql: string): string {
    return `EXPLAIN FORMAT=JSON ${sql}`;
  }

  buildSystemPromptAddendum(): string {
    return [
      'You are working with a MySQL database.',
      'MySQL supports databases (not schemas in the PostgreSQL sense), stored procedures, triggers, and events.',
      'Use backticks for identifier quoting.',
      'Use ? placeholders for parameterized queries.',
      'MySQL supports transactions with SAVEPOINT, RELEASE SAVEPOINT, and ROLLBACK TO SAVEPOINT.',
      'Use EXPLAIN FORMAT=JSON for query plan analysis.',
    ].join('\n');
  }
}
