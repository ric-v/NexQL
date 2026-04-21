import { createHash } from 'crypto';
import { EventEmitter } from 'events';
type SqliteDatabase = import('better-sqlite3').Database;
import type {
  DbDriver,
  DbPooledClient,
  DbSessionClient,
  QueryResult,
  PoolMetrics,
} from '@nexql/core/core/db/DbDriver';
import type { ConnectionConfig } from '@nexql/core/common/types';
import type { DbEngine } from '@nexql/core/core/db/DbEngine';

function fingerprintSecret(value: string | undefined): string {
  if (!value) {
    return 'none';
  }
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function getSqlitePath(config: ConnectionConfig): string {
  const path = config.database?.trim();
  if (!path) {
    throw new Error('SQLite requires a database file path (database setting).');
  }
  return path;
}

function getPoolKey(config: ConnectionConfig): string {
  const path = getSqlitePath(config);
  const ro = config.readOnlyMode ? 'ro' : 'rw';
  return `${path}:${ro}:${fingerprintSecret((config as { password?: string }).password)}`;
}

/** Run arbitrary SQL; supports `?` placeholders (SQLite native). */
function runSqliteQuery(db: SqliteDatabase, sql: string, params?: unknown[]): QueryResult {
  const trimmed = sql.trim().toLowerCase();
  const isRead =
    trimmed.startsWith('select') ||
    trimmed.startsWith('pragma') ||
    trimmed.startsWith('explain') ||
    trimmed.startsWith('with');
  if (isRead) {
    const stmt = db.prepare(sql);
    const rows = params?.length ? (stmt.all(...params) as unknown[]) : (stmt.all() as unknown[]);
    return { rows, rowCount: rows.length };
  }
  const stmt = db.prepare(sql);
  const info = params?.length ? stmt.run(...params) : stmt.run();
  return { rows: [], rowCount: info.changes };
}

/**
 * SQLite driver using better-sqlite3 (synchronous API wrapped in async shapes).
 */
export class SqliteDriver implements DbDriver {
  readonly engine: DbEngine = 'sqlite';

  private poolMetricsMap = new Map<string, PoolMetrics>();
  private sessions = new Map<string, SqliteDatabase>();

  async getPooledClient(config: ConnectionConfig): Promise<DbPooledClient> {
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const path = getSqlitePath(config);
    const key = getPoolKey(config);
    if (!this.poolMetricsMap.has(key)) {
      this.poolMetricsMap.set(key, {
        connectionId: config.id,
        totalConnections: 1,
        idleConnections: 1,
        waitingRequests: 0,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      });
    }
    const db = new BetterSqlite3(path, { readonly: Boolean(config.readOnlyMode) });
    const metrics = this.poolMetricsMap.get(key);
    return {
      async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
        if (metrics) {
          metrics.lastActivity = Date.now();
        }
        return await Promise.resolve().then(() => runSqliteQuery(db, sql, params) as QueryResult<T>);
      },
      release() {
        try {
          db.close();
        } catch (err) {
          console.warn('[SqliteDriver] close on release:', err);
        }
      },
    };
  }

  async getSessionClient(config: ConnectionConfig, sessionId: string): Promise<DbSessionClient> {
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const sessionKey = `${config.id}:${sessionId}`;
    let db = this.sessions.get(sessionKey);
    if (!db) {
      db = new BetterSqlite3(getSqlitePath(config), { readonly: Boolean(config.readOnlyMode) });
      this.sessions.set(sessionKey, db);
    }
    const sessionDb = db;
    const emitter = new EventEmitter();
    const sessionsRef = this.sessions;
    return {
      async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
        return await Promise.resolve().then(() => runSqliteQuery(sessionDb, sql, params) as QueryResult<T>);
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
          sessionDb.close();
        } catch (err) {
          console.warn('[SqliteDriver] session close:', err);
        }
        sessionsRef.delete(sessionKey);
      },
    };
  }

  async closeSession(config: ConnectionConfig, sessionId: string): Promise<void> {
    const sessionKey = `${config.id}:${sessionId}`;
    const db = this.sessions.get(sessionKey);
    if (db) {
      try {
        db.close();
      } catch (err) {
        console.warn('[SqliteDriver] closeSession:', err);
      }
      this.sessions.delete(sessionKey);
    }
  }

  async closeConnection(_config: ConnectionConfig): Promise<void> {
    // Per-request DB handles are closed on release; nothing pooled by key.
  }

  async closeAllConnectionsById(connectionId: string): Promise<void> {
    for (const [key, m] of this.poolMetricsMap.entries()) {
      if (m.connectionId === connectionId) {
        this.poolMetricsMap.delete(key);
      }
    }
    const prefix = `${connectionId}:`;
    for (const [sk, db] of this.sessions.entries()) {
      if (sk.startsWith(prefix)) {
        try {
          db.close();
        } catch {
          /* noop */
        }
        this.sessions.delete(sk);
      }
    }
  }

  async closeAll(): Promise<void> {
    for (const db of this.sessions.values()) {
      try {
        db.close();
      } catch {
        /* noop */
      }
    }
    this.sessions.clear();
    this.poolMetricsMap.clear();
  }

  getPoolMetrics(key: string): PoolMetrics | undefined {
    return this.poolMetricsMap.get(key);
  }

  getAllPoolMetrics(): PoolMetrics[] {
    return Array.from(this.poolMetricsMap.values());
  }
}
