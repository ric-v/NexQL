import { createHash } from 'node:crypto';
import type { Pool, PoolClient, Client } from 'pg';
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

/** Short, non-reversible fingerprint used to invalidate pools when auth-material changes. */
function fingerprintSecret(value: string | undefined): string {
  if (!value) {
    return 'none';
  }
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

/**
 * PostgreSQL driver implementation wrapping the `pg` library.
 * Manages connection pools and session clients for PostgreSQL databases.
 */
export class PostgresDriver implements DbDriver {
  readonly engine: DbEngine = 'postgres';

  private pools = new Map<string, Pool>();
  private sessions = new Map<string, Client>();
  private poolMetricsMap = new Map<string, PoolMetrics>();

  /**
   * Pool cache key. Includes a fingerprint of the password and other
   * auth-affecting fields so that changing the password (or SSL mode,
   * SSH tunnel, etc.) invalidates the cache instead of reusing a
   * pool created with stale credentials.
   */
  private getPoolKey(config: ConnectionConfig): string {
    const password = coercePassword((config as any).password);
    const authFingerprint = fingerprintSecret(password);
    const sslmode = config.sslmode ?? 'default';
    const sshFingerprint = config.ssh?.enabled
      ? fingerprintSecret(`${config.ssh.host}:${config.ssh.port}:${config.ssh.username}:${config.ssh.privateKeyPath ?? ''}`)
      : 'nossh';
    return `${config.host}:${config.port}/${config.database ?? ''}:${config.username ?? ''}:${sslmode}:${sshFingerprint}:${authFingerprint}`;
  }

  private async getOrCreatePool(config: ConnectionConfig): Promise<Pool> {
    const key = this.getPoolKey(config);
    let pool = this.pools.get(key);
    if (!pool) {
      const password = coercePassword((config as any).password);
      const { Pool: PgPool } = await import('pg');
      pool = new PgPool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password,
        ssl: config.sslmode && config.sslmode !== 'disable' ? { rejectUnauthorized: config.sslmode === 'verify-full' } : undefined,
        statement_timeout: config.statementTimeout,
        connectionTimeoutMillis: (config.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT_SECONDS) * 1000,
        application_name: config.applicationName ?? 'NexQL',
      });
      pool.on('error', (err) => {
        console.error(`[PostgresDriver] Pool error for ${key}:`, err);
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
    const client: PoolClient = await pool.connect();
    const key = this.getPoolKey(config);
    const metrics = this.poolMetricsMap.get(key);
    if (metrics) {
      metrics.lastActivity = Date.now();
      metrics.totalConnections = pool.totalCount;
      metrics.idleConnections = pool.idleCount;
      metrics.waitingRequests = pool.waitingCount;
    }
    return {
      async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        const result = await client.query(sql, params);
        return {
          rows: result.rows as T[],
          rowCount: result.rowCount,
          command: result.command,
          fields: result.fields,
        };
      },
      release() {
        client.release();
      },
    };
  }

  async getSessionClient(config: ConnectionConfig, sessionId: string): Promise<DbSessionClient> {
    const sessionKey = `${this.getPoolKey(config)}:${sessionId}`;
    let client = this.sessions.get(sessionKey);
    if (!client) {
      const password = coercePassword((config as any).password);
      const { Client: PgClient } = await import('pg');
      client = new PgClient({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password,
        ssl: config.sslmode && config.sslmode !== 'disable' ? { rejectUnauthorized: config.sslmode === 'verify-full' } : undefined,
        statement_timeout: config.statementTimeout,
        connectionTimeoutMillis: (config.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT_SECONDS) * 1000,
        application_name: config.applicationName ?? 'NexQL',
      });
      await client.connect();
      this.sessions.set(sessionKey, client);
    }
    const sessionClient = client;
    return {
      async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        const result = await sessionClient.query(sql, params);
        return {
          rows: result.rows as T[],
          rowCount: result.rowCount,
          command: result.command,
          fields: result.fields,
        };
      },
      on(event: string, listener: (...args: any[]) => void) {
        (sessionClient as NodeJS.EventEmitter).on(event, listener);
      },
      removeListener(event: string, listener: (...args: any[]) => void) {
        (sessionClient as NodeJS.EventEmitter).removeListener(event, listener);
      },
      off(event: string, listener: (...args: any[]) => void) {
        (sessionClient as NodeJS.EventEmitter).off(event, listener);
      },
      async end() {
        await sessionClient.end();
      },
    };
  }

  async closeSession(config: ConnectionConfig, sessionId: string): Promise<void> {
    const sessionKey = `${this.getPoolKey(config)}:${sessionId}`;
    const client = this.sessions.get(sessionKey);
    if (client) {
      await client.end();
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
          console.warn(`[PostgresDriver] Failed to end pool ${key}:`, err);
        }
      }
      this.pools.delete(key);
      this.poolMetricsMap.delete(key);
    }
  }

  async closeAll(): Promise<void> {
    for (const pool of this.pools.values()) {
      await pool.end();
    }
    this.pools.clear();
    this.poolMetricsMap.clear();
    for (const client of this.sessions.values()) {
      await client.end();
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
