/**
 * Legacy static driver instances used for backward compatibility.
 * These will be removed once all consumers migrate to DriverRegistry.
 * @deprecated
 */
import type { DbDriver } from './DbDriver';
import type { DbEngine } from './DbEngine';

import { PostgresDriver } from './drivers/postgres/PostgresDriver';
import { MySqlDriver } from './drivers/mysql/MySqlDriver';
import { SqliteDriver } from './drivers/sqlite/SqliteDriver';
import { UnsupportedDriver } from './drivers/UnsupportedDriver';

const postgresDriver = new PostgresDriver();
const mysqlDriver = new MySqlDriver();
const sqliteDriver = new SqliteDriver();
const mssqlDriver = new UnsupportedDriver('mssql');
const oracleDriver = new UnsupportedDriver('oracle');

const drivers: Record<DbEngine, DbDriver> = {
  postgres: postgresDriver,
  mysql: mysqlDriver,
  sqlite: sqliteDriver,
  mssql: mssqlDriver,
  oracle: oracleDriver,
};

export function getLegacyDriver(engine: DbEngine): DbDriver {
  return drivers[engine];
}
