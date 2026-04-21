/**
 * Minimal typings for `oracledb` (native addon; no bundled .d.ts in some installs).
 */
declare module 'oracledb' {
  export interface Connection {
    execute(
      sql: string,
      bind?: Record<string, unknown>,
      options?: { outFormat?: number; autoCommit?: boolean }
    ): Promise<{ rows?: unknown[]; rowsAffected?: number }>;
    close(): Promise<void>;
  }

  export interface Pool {
    getConnection(): Promise<Connection>;
    close(drainTime?: number): Promise<void>;
  }

  interface OracledbStatic {
    createPool(poolAttributes: Record<string, unknown>): Promise<Pool>;
    readonly OUT_FORMAT_OBJECT: number;
  }

  const oracledb: OracledbStatic;
  export = oracledb;
}
