import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import sql from 'mssql';
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

function buildPoolConfig(config: ConnectionConfig) {
  const password = coercePassword((config as { password?: unknown }).password);
  return {
    user: config.username,
    password,
    server: config.host,
    port: config.port ?? 1433,
    database: config.database,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: (config.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT_SECONDS) * 1000,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };
}

/** Map Postgres `$1` placeholders to `@nexql_N` and bind on the request. */
function prepareMssqlQuery(request: sql.Request, queryText: string, params?: unknown[]): string {
  if (!params?.length) {
    return queryText;
  }
  const namesByIndex = new Map<number, string>();
  for (let i = 1; i <= params.length; i++) {
    namesByIndex.set(i, `nexql_${i}`);
  }
  for (let i = 1; i <= params.length; i++) {
    const name = namesByIndex.get(i)!;
    const val = params[i - 1];
    if (val === null || val === undefined) {
      request.input(name, sql.NVarChar(sql.MAX), val as string | null);
    } else if (typeof val === 'number') {
      if (Number.isInteger(val) && Math.abs(val) <= 2147483647) {
        request.input(name, sql.Int, val);
      } else {
        request.input(name, sql.Float, val);
      }
    } else if (typeof val === 'boolean') {
      request.input(name, sql.Bit, val);
    } else if (Buffer.isBuffer(val)) {
      request.input(name, sql.VarBinary(sql.MAX), val);
    } else {
      request.input(name, sql.NVarChar(sql.MAX), String(val));
    }
  }
  return queryText.replace(/\$(\d+)/g, (_, n: string) => {
    const idx = parseInt(n, 10);
    const name = namesByIndex.get(idx);
    if (!name) {
      throw new Error(`MssqlDriver: placeholder $${n} has no bound parameter (only ${params.length} params)`);
    }
    return `@${name}`;
  });
}

/**
 * Microsoft SQL Server driver using the `mssql` package (Tedious).
 */
export class MssqlDriver implements DbDriver {
  readonly engine: DbEngine = 'mssql';

  private pools = new Map<string, sql.ConnectionPool>();
  /** One small pool per logical notebook/session (max 1 connection). */
  private sessionPools = new Map<string, sql.ConnectionPool>();
  private poolMetricsMap = new Map<string, PoolMetrics>();

  private getPoolKey(config: ConnectionConfig): string {
    const password = coercePassword((config as { password?: unknown }).password);
    const authFingerprint = fingerprintSecret(password);
    return `${config.host}:${config.port ?? 1433}/${config.database ?? ''}:${config.username ?? ''}:${authFingerprint}`;
  }

  private async getOrCreatePool(config: ConnectionConfig): Promise<sql.ConnectionPool> {
    const key = this.getPoolKey(config);
    let pool = this.pools.get(key);
    if (!pool) {
      pool = new sql.ConnectionPool(buildPoolConfig(config));
      await pool.connect();
      pool.on('error', (err: unknown) => {
        console.error(`[MssqlDriver] Pool error for ${key}:`, err);
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
    const key = this.getPoolKey(config);
    const metrics = this.poolMetricsMap.get(key);
    if (metrics) {
      metrics.lastActivity = Date.now();
    }
    return {
      async query<T = unknown>(queryText: string, params?: unknown[]): Promise<QueryResult<T>> {
        const request = pool.request();
        const sqlText = prepareMssqlQuery(request, queryText, params);
        const result = await request.query<T>(sqlText);
        const rows = (result.recordset as T[]) ?? [];
        const rowCount =
          Array.isArray(result.rowsAffected) && result.rowsAffected.length > 0
            ? (result.rowsAffected[0] as number)
            : rows.length;
        return { rows, rowCount };
      },
      release() {
        /* request-scoped; pool retains connections */
      },
    };
  }

  async getSessionClient(config: ConnectionConfig, sessionId: string): Promise<DbSessionClient> {
    const sessionKey = `${config.id}:${sessionId}`;
    let sessionPool = this.sessionPools.get(sessionKey);
    if (!sessionPool) {
      const cfg = buildPoolConfig(config);
      sessionPool = new sql.ConnectionPool({ ...cfg, pool: { max: 1, min: 1, idleTimeoutMillis: 60000 } });
      await sessionPool.connect();
      this.sessionPools.set(sessionKey, sessionPool);
    }
    const emitter = new EventEmitter();
    const pool = sessionPool;
    const sessionPoolsRef = this.sessionPools;
    return {
      async query<T = unknown>(queryText: string, params?: unknown[]): Promise<QueryResult<T>> {
        const request = pool.request();
        const sqlText = prepareMssqlQuery(request, queryText, params);
        const result = await request.query<T>(sqlText);
        const rows = (result.recordset as T[]) ?? [];
        const rowCount =
          Array.isArray(result.rowsAffected) && result.rowsAffected.length > 0
            ? (result.rowsAffected[0] as number)
            : rows.length;
        return { rows, rowCount };
      },
      on(event: string, listener: (...args: unknown[]) => void) {
        emitter.on(event, listener);
      },
      removeListener(event: string, listener: (...args: unknown[]) => void) {
        emitter.removeListener(event, listener);
      },
      off(event: string, listener: (...args: unknown[]) => void) {
        emitter.off(event, listener);
      },
      async end() {
        const p = sessionPoolsRef.get(sessionKey);
        if (p) {
          await p.close();
          sessionPoolsRef.delete(sessionKey);
        }
      },
    };
  }

  async closeSession(config: ConnectionConfig, sessionId: string): Promise<void> {
    const sessionKey = `${config.id}:${sessionId}`;
    const p = this.sessionPools.get(sessionKey);
    if (p) {
      await p.close();
      this.sessionPools.delete(sessionKey);
    }
  }

  async closeConnection(config: ConnectionConfig): Promise<void> {
    const key = this.getPoolKey(config);
    const pool = this.pools.get(key);
    if (pool) {
      await pool.close();
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
          await pool.close();
        } catch (err) {
          console.warn(`[MssqlDriver] Failed to close pool ${key}:`, err);
        }
      }
      this.pools.delete(key);
      this.poolMetricsMap.delete(key);
    }
    const prefix = `${connectionId}:`;
    for (const [sk, p] of this.sessionPools.entries()) {
      if (sk.startsWith(prefix)) {
        try {
          await p.close();
        } catch (err) {
          console.warn(`[MssqlDriver] Failed to close session pool ${sk}:`, err);
        }
        this.sessionPools.delete(sk);
      }
    }
  }

  async closeAll(): Promise<void> {
    for (const pool of this.pools.values()) {
      await pool.close();
    }
    this.pools.clear();
    this.poolMetricsMap.clear();
    for (const p of this.sessionPools.values()) {
      await p.close();
    }
    this.sessionPools.clear();
  }

  getPoolMetrics(key: string): PoolMetrics | undefined {
    return this.poolMetricsMap.get(key);
  }

  getAllPoolMetrics(): PoolMetrics[] {
    return Array.from(this.poolMetricsMap.values());
  }
}
