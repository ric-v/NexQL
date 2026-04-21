/**
 * Minimal typings for `mssql` (v11 ships JS only). Expand as needed.
 */
declare module 'mssql' {
  import type { EventEmitter } from 'events';

  export interface IConfig {
    user?: string;
    password?: string | undefined;
    server: string;
    port?: number;
    database?: string;
    pool?: { max?: number; min?: number; idleTimeoutMillis?: number };
    connectionTimeout?: number;
    options?: { encrypt?: boolean; trustServerCertificate?: boolean };
  }

  export class Request {
    input(name: string, type: unknown, value: unknown): this;
    query<T = Record<string, unknown>>(command: string): Promise<{
      recordset?: T[];
      rowsAffected?: number[];
    }>;
  }

  export class ConnectionPool extends EventEmitter {
    constructor(config: IConfig);
    connect(): Promise<this>;
    close(): Promise<void>;
    request(): Request;
  }

  const sql: {
    ConnectionPool: typeof ConnectionPool;
    Request: typeof Request;
    Int: unknown;
    Float: unknown;
    Bit: unknown;
    /** Sentinel for `NVarChar(sql.MAX)` etc. */
    MAX: number;
    NVarChar: (n: number) => unknown;
    VarBinary: (n: number) => unknown;
  };

  export = sql;
}
