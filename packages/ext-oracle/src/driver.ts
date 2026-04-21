import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import type {
  DbDriver,
  DbPooledClient,
  DbSessionClient,
  QueryResult,
  PoolMetrics,
} from '@nexql/core/core/db/DbDriver';
import type { ConnectionConfig } from '@nexql/core/common/types';
import type { DbEngine } from '@nexql/core/core/db/DbEngine';

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

function buildConnectString(config: ConnectionConfig): string {
  const port = config.port ?? 1521;
  const service = config.database?.trim();
  if (!service) {
    throw new Error('Oracle requires a service name (or SID) in the database field, e.g. ORCL or XEPDB1.');
  }
  return `${config.host}:${port}/${service}`;
}

/** Map Postgres `$1` style binds to named `:b1` binds for node-oracledb. */
function buildOracleBinds(
  sqlText: string,
  params?: unknown[]
): { sql: string; bind?: Record<string, unknown> } {
  if (!params?.length) {
    return { sql: sqlText };
  }
  const bind: Record<string, unknown> = {};
  const sql = sqlText.replace(/\$(\d+)/g, (_, n: string) => {
    const idx = parseInt(n, 10);
    const name = `b${idx}`;
    bind[name] = params[idx - 1];
    return `:${name}`;
  });
  return { sql, bind };
}

type OraclePool = import('oracledb').Pool;
type OracleConnection = import('oracledb').Connection;

/**
 * Oracle driver using node-oracledb pools.
 */
export class OracleDriver implements DbDriver {
  readonly engine: DbEngine = 'oracle';

  private pools = new Map<string, OraclePool>();
  private sessionPools = new Map<string, OraclePool>();
  private poolMetricsMap = new Map<string, PoolMetrics>();

  private getPoolKey(config: ConnectionConfig): string {
    const password = coercePassword((config as { password?: unknown }).password);
    const authFingerprint = fingerprintSecret(password);
    return `${buildConnectString(config)}:${config.username ?? ''}:${authFingerprint}`;
  }

  private async loadOracledb(): Promise<typeof import('oracledb')> {
    return await import('oracledb');
  }

  private async getOrCreatePool(config: ConnectionConfig): Promise<OraclePool> {
    const key = this.getPoolKey(config);
    let pool = this.pools.get(key);
    if (!pool) {
      const oracledb = await this.loadOracledb();
      const password = coercePassword((config as { password?: unknown }).password);
      pool = await oracledb.createPool({
        user: config.username,
        password,
        connectString: buildConnectString(config),
        poolMin: 0,
        poolMax: 10,
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
    const oracledb = await this.loadOracledb();
    const pool = await this.getOrCreatePool(config);
    const key = this.getPoolKey(config);
    const metrics = this.poolMetricsMap.get(key);
    if (metrics) {
      metrics.lastActivity = Date.now();
    }
    const conn: OracleConnection = await pool.getConnection();
    return {
      async query<T = unknown>(queryText: string, params?: unknown[]): Promise<QueryResult<T>> {
        const { sql: sqlOut, bind } = buildOracleBinds(queryText, params);
        const result = await conn.execute(sqlOut, bind, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          autoCommit: true,
        });
        const rows = (result.rows as T[]) ?? [];
        return { rows, rowCount: rows.length };
      },
      release() {
        conn.close().catch((err: unknown) => console.warn('[OracleDriver] pooled release:', err));
      },
    };
  }

  async getSessionClient(config: ConnectionConfig, sessionId: string): Promise<DbSessionClient> {
    const oracledb = await this.loadOracledb();
    const sessionKey = `${config.id}:${sessionId}`;
    let pool = this.sessionPools.get(sessionKey);
    if (!pool) {
      const password = coercePassword((config as { password?: unknown }).password);
      pool = await oracledb.createPool({
        user: config.username,
        password,
        connectString: buildConnectString(config),
        poolMin: 1,
        poolMax: 1,
      });
      this.sessionPools.set(sessionKey, pool);
    }
    const sessionPool = pool;
    const conn = await sessionPool.getConnection();
    const emitter = new EventEmitter();
    const sessionPoolsRef = this.sessionPools;
    return {
      async query<T = unknown>(queryText: string, params?: unknown[]): Promise<QueryResult<T>> {
        const { sql: sqlOut, bind } = buildOracleBinds(queryText, params);
        const result = await conn.execute(sqlOut, bind, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          autoCommit: true,
        });
        const rows = (result.rows as T[]) ?? [];
        return { rows, rowCount: rows.length };
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
        try {
          await conn.close();
        } catch (err) {
          console.warn('[OracleDriver] session conn close:', err);
        }
        const p = sessionPoolsRef.get(sessionKey);
        if (p) {
          try {
            await p.close(0);
          } catch (err) {
            console.warn('[OracleDriver] session pool close:', err);
          }
          sessionPoolsRef.delete(sessionKey);
        }
      },
    };
  }

  async closeSession(config: ConnectionConfig, sessionId: string): Promise<void> {
    const sessionKey = `${config.id}:${sessionId}`;
    const p = this.sessionPools.get(sessionKey);
    if (p) {
      await p.close(0);
      this.sessionPools.delete(sessionKey);
    }
  }

  async closeConnection(config: ConnectionConfig): Promise<void> {
    const key = this.getPoolKey(config);
    const pool = this.pools.get(key);
    if (pool) {
      await pool.close(0);
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
          await pool.close(0);
        } catch (err) {
          console.warn(`[OracleDriver] Failed to close pool ${key}:`, err);
        }
      }
      this.pools.delete(key);
      this.poolMetricsMap.delete(key);
    }
    const prefix = `${connectionId}:`;
    for (const [sk, p] of this.sessionPools.entries()) {
      if (sk.startsWith(prefix)) {
        try {
          await p.close(0);
        } catch (err) {
          console.warn(`[OracleDriver] Failed to close session pool ${sk}:`, err);
        }
        this.sessionPools.delete(sk);
      }
    }
  }

  async closeAll(): Promise<void> {
    for (const pool of this.pools.values()) {
      await pool.close(0);
    }
    this.pools.clear();
    this.poolMetricsMap.clear();
    for (const p of this.sessionPools.values()) {
      await p.close(0);
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
