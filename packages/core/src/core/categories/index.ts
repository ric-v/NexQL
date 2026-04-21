/**
 * Category-specific abstractions organized by database paradigm.
 *
 * - sql/    : Relational database abstractions (DbDialect, SqlTemplateProvider, IntrospectionProvider)
 * - nosql/  : Document database abstractions (future)
 * - graph/  : Graph database abstractions (future)
 */
export * from './sql';
