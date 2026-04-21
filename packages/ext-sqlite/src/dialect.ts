import type { DbDialect } from '@nexql/core/core/db/DbDialect';
import type { FeatureFlags } from '@nexql/core/core/db/capabilities';
import type { DbEngine } from '@nexql/core/core/db/DbEngine';
import type { IntrospectionProvider } from '@nexql/core/core/db/introspection/IntrospectionProvider';
import { SqliteIntrospection } from './introspection';
import { sqliteFeatureFlags } from './featureFlags';

/**
 * SQLite dialect implementation.
 * Provides identifier quoting, LIMIT clause generation, EXPLAIN syntax,
 * and an AI system prompt addendum describing SQLite capabilities.
 */
export class SqliteDialect implements DbDialect {
  readonly engine: DbEngine = 'sqlite';
  readonly capabilities: FeatureFlags = sqliteFeatureFlags;
  readonly introspect: IntrospectionProvider = new SqliteIntrospection();

  identifier(name: string): string {
    // Double-quote identifiers, escaping embedded double quotes
    return `"${name.replace(/"/g, '""')}"`;
  }

  limitClause(n: number): string {
    return `LIMIT ${n}`;
  }

  explain(sql: string): string {
    return `EXPLAIN QUERY PLAN ${sql}`;
  }

  buildSystemPromptAddendum(): string {
    return [
      'You are working with a SQLite database.',
      'SQLite is a serverless, file-based database with limited type system (TEXT, INTEGER, REAL, BLOB, NULL).',
      'SQLite does not support schemas, stored procedures, or user roles.',
      'Use double quotes for identifier quoting.',
      'Use ? placeholders for parameterized queries.',
      'SQLite supports transactions with SAVEPOINT, RELEASE, and ROLLBACK TO.',
      'Use EXPLAIN QUERY PLAN for query plan analysis.',
      'SQLite has limited ALTER TABLE support (no DROP COLUMN before 3.35.0).',
    ].join('\n');
  }
}
