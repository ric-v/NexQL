import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import type { Pool, Connection } from 'mysql2/promise';
import type {
  DbDriver,
  DbPooledClient,
  DbSessionClient,
  QueryResult,
  PoolMetrics,
} from '@nexql/core/core/db/DbDriver';
import type { ConnectionConfig } from '@nexql/core/common/types';
import type { DbEngine } from '@nexql/core/core/db/DbEngine';

const DEFAULT_CONNECT_TIMEOUT_SECONDS = 15;

/** mysql2/promise mixin typings omit `query` on PoolConnection in some TS setups. */
type MysqlQueryableConn = {
  // Values are forwarded to mysql2; it accepts loosely-typed bind parameters.
  query(sql: string, values?: unknown[] | null): Promise<[unknown, unknown]>;
};

function coercePassword(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.length > 0 ? value : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function fingerprintSecret(value: string | undefined): string {
  if (!value) {
    return 'none';
  }
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

/** Core tree code uses Postgres `$1` placeholders; mysql2 expects `?`. */
function rewritePostgresDollarPlaceholders(sql: string, params?: unknown[]): { sql: string; values: unknown[] } {
  if (!params?.length) {
    return { sql, values: [] };
  }
  const values: unknown[] = [];
  const out = sql.replace(/\$(\d+)/g, (_, n: string) => {
    const idx = parseInt(n, 10) - 1;
    values.push(params[idx]);
    return '?';
  });
  return { sql: out, values };
}

/**
 * MySQL driver using mysql2/promise pools and dedicated connections for sessions.
 */
export class MysqlDriver implements DbDriver {
  readonly engine: DbEngine = 'mysql';

  private pools = new Map<string, Pool>();
  private sessions = new Map<string, Connection>();
  private poolMetricsMap = new Map<string, PoolMetrics>();

  private getPoolKey(config: ConnectionConfig): string {
    const password = coercePassword((config as { password?: unknown }).password);
    const authFingerprint = fingerprintSecret(password);
    return `${config.host}:${config.port ?? 3306}/${config.database ?? ''}:${config.username ?? ''}:${authFingerprint}`;
  }

  private async getOrCreatePool(config: ConnectionConfig): Promise<Pool> {
    const key = this.getPoolKey(config);
    let pool = this.pools.get(key);
    if (!pool) {
      const password = coercePassword((config as { password?: unknown }).password);
      const mysql = await import('mysql2/promise');
      pool = mysql.createPool({
        host: config.host,
        port: config.port ?? 3306,
        user: config.username,
        password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: 10,
        connectTimeout: (config.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT_SECONDS) * 1000,
      });
      pool.on('connection', () => {
        const m = this.poolMetricsMap.get(key);
        if (m) {
          m.lastActivity = Date.now();
        }
      });
      this.pools.set(key, pool);
      this.poolMetricsMap.set(key, {
        connectionId: config.id,
        totalConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      });
    }
    return pool;
  }

  async getPooledClient(config: ConnectionConfig): Promise<DbPooledClient> {
    const pool = await this.getOrCreatePool(config);
    const conn = await pool.getConnection();
    const key = this.getPoolKey(config);
    const metrics = this.poolMetricsMap.get(key);
    if (metrics) {
      metrics.lastActivity = Date.now();
    }
    return {
      async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
        const { sql: sqlOut, values } = rewritePostgresDollarPlaceholders(sql, params);
        const [rows, fields] = await (conn as unknown as MysqlQueryableConn).query(
          sqlOut,
          values.length ? values : undefined
        );
        const rowArray = Array.isArray(rows) ? (rows as T[]) : [];
        const rowCount = Array.isArray(rows) ? rowArray.length : (rows as { affectedRows?: number }).affectedRows ?? 0;
        return { rows: rowArray, rowCount, fields: fields as QueryResult<T>['fields'] };
      },
      release() {
        conn.release();
      },
    };
  }

  async getSessionClient(config: ConnectionConfig, sessionId: string): Promise<DbSessionClient> {
    const sessionKey = `${config.id}:${sessionId}`;
    let conn = this.sessions.get(sessionKey);
    if (!conn) {
      const password = coercePassword((config as { password?: unknown }).password);
      const mysql = await import('mysql2/promise');
      conn = await mysql.createConnection({
        host: config.host,
        port: config.port ?? 3306,
        user: config.username,
        password,
        database: config.database,
        connectTimeout: (config.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT_SECONDS) * 1000,
      });
      this.sessions.set(sessionKey, conn);
    }
    const sessionConn = conn;
    return {
      async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
        const { sql: sqlOut, values } = rewritePostgresDollarPlaceholders(sql, params);
        const [rows, fields] = await (sessionConn as unknown as MysqlQueryableConn).query(
          sqlOut,
          values.length ? values : undefined
        );
        const rowArray = Array.isArray(rows) ? (rows as T[]) : [];
        const rowCount = Array.isArray(rows) ? rowArray.length : (rows as { affectedRows?: number }).affectedRows ?? 0;
        return { rows: rowArray, rowCount, fields: fields as QueryResult<T>['fields'] };
      },
      on(event: string, listener: (...args: unknown[]) => void) {
        (sessionConn as EventEmitter).on(event, listener);
      },
      removeListener(event: string, listener: (...args: unknown[]) => void) {
        (sessionConn as EventEmitter).removeListener(event, listener);
      },
      off(event: string, listener: (...args: unknown[]) => void) {
        (sessionConn as EventEmitter).off(event, listener);
      },
      async end() {
        await sessionConn.end();
      },
    };
  }

  async closeSession(config: ConnectionConfig, sessionId: string): Promise<void> {
    const sessionKey = `${config.id}:${sessionId}`;
    const conn = this.sessions.get(sessionKey);
    if (conn) {
      await conn.end();
      this.sessions.delete(sessionKey);
    }
  }

  async closeConnection(config: ConnectionConfig): Promise<void> {
    const key = this.getPoolKey(config);
    const pool = this.pools.get(key);
    if (pool) {
      await pool.end();
      this.pools.delete(key);
      this.poolMetricsMap.delete(key);
    }
  }

  async closeAllConnectionsById(connectionId: string): Promise<void> {
    const keysToClose: string[] = [];
    for (const [key, metrics] of this.poolMetricsMap.entries()) {
      if (metrics.connectionId === connectionId) {
        keysToClose.push(key);
      }
    }
    for (const key of keysToClose) {
      const pool = this.pools.get(key);
      if (pool) {
        try {
          await pool.end();
        } catch (err) {
          console.warn(`[MysqlDriver] Failed to end pool ${key}:`, err);
        }
      }
      this.pools.delete(key);
      this.poolMetricsMap.delete(key);
    }
    const prefix = `${connectionId}:`;
    for (const [sk, c] of this.sessions.entries()) {
      if (sk.startsWith(prefix)) {
        try {
          await c.end();
        } catch (err) {
          console.warn(`[MysqlDriver] Failed to end session ${sk}:`, err);
        }
        this.sessions.delete(sk);
      }
    }
  }

  async closeAll(): Promise<void> {
    for (const pool of this.pools.values()) {
      await pool.end();
    }
    this.pools.clear();
    this.poolMetricsMap.clear();
    for (const c of this.sessions.values()) {
      await c.end();
    }
    this.sessions.clear();
  }

  getPoolMetrics(key: string): PoolMetrics | undefined {
    return this.poolMetricsMap.get(key);
  }

  getAllPoolMetrics(): PoolMetrics[] {
    return Array.from(this.poolMetricsMap.values());
  }
}
