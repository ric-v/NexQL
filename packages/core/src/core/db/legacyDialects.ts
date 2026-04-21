/**
 * Legacy static dialect instances used for backward compatibility.
 * These will be removed once all consumers migrate to DriverRegistry.
 * @deprecated
 */
import type { DbDialect } from './DbDialect';
import type { DbEngine } from './DbEngine';

import { PostgresDialect } from './dialects/postgres/PostgresDialect';
import { MySqlDialect } from './dialects/mysql/MySqlDialect';
import { SqliteDialect } from './dialects/sqlite/SqliteDialect';
import { MssqlDialect } from './dialects/mssql/MssqlDialect';
import { OracleDialect } from './dialects/oracle/OracleDialect';

const dialects: Record<DbEngine, DbDialect> = {
  postgres: PostgresDialect,
  mysql: MySqlDialect,
  sqlite: SqliteDialect,
  mssql: MssqlDialect,
  oracle: OracleDialect,
};

export function getLegacyDialect(engine: DbEngine): DbDialect {
  return dialects[engine];
}
