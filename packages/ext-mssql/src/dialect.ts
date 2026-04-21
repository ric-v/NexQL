import type { DbDialect } from '@nexql/core/core/db/DbDialect';
import type { FeatureFlags } from '@nexql/core/core/db/capabilities';
import type { DbEngine } from '@nexql/core/core/db/DbEngine';
import type { IntrospectionProvider } from '@nexql/core/core/db/introspection/IntrospectionProvider';
import { MssqlIntrospection } from './introspection';
import { mssqlFeatureFlags } from './featureFlags';

/**
 * MSSQL dialect implementation.
 * Provides bracket identifier quoting, TOP n for limit, SET SHOWPLAN_XML ON
 * for explain, and an AI system prompt addendum describing MSSQL capabilities.
 */
export class MssqlDialect implements DbDialect {
  readonly engine: DbEngine = 'mssql';
  readonly capabilities: FeatureFlags = mssqlFeatureFlags;
  readonly introspect: IntrospectionProvider = new MssqlIntrospection();

  identifier(name: string): string {
    // Bracket-quote identifiers, escaping embedded closing brackets
    return `[${name.replace(/\]/g, ']]')}]`;
  }

  limitClause(n: number): string {
    return `TOP ${n}`;
  }

  explain(sql: string): string {
    return `SET SHOWPLAN_XML ON;\n${sql};\nSET SHOWPLAN_XML OFF;`;
  }

  buildSystemPromptAddendum(): string {
    return [
      'You are working with a Microsoft SQL Server (MSSQL) database.',
      'MSSQL supports schemas, stored procedures, triggers, sequences, and indexed views.',
      'Use square brackets [name] for identifier quoting.',
      'Use @param placeholders for parameterized queries.',
      'Use TOP n instead of LIMIT for row limiting (e.g., SELECT TOP 10 * FROM table).',
      'MSSQL supports transactions with SAVE TRANSACTION for savepoints.',
      'Use SET SHOWPLAN_XML ON for query plan analysis.',
      'MSSQL uses IDENTITY for auto-increment columns instead of SERIAL.',
      'Use OUTPUT clause instead of RETURNING for DML statements.',
      'Common table expressions (CTEs) and window functions are fully supported.',
    ].join('\n');
  }
}
