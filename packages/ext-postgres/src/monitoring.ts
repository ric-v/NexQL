import type { MonitoringProvider } from '@nexql/core/core/db/MonitoringProvider';

/**
 * PostgreSQL monitoring provider.
 * Returns queries for dashboard panels using pg_stat_activity,
 * pg_database, and pg_stat_statements.
 */
export class PostgresMonitoring implements MonitoringProvider {
  getOverviewQuery(): string {
    return `
      SELECT
        d.datname AS database_name,
        pg_catalog.pg_get_userbyid(d.datdba) AS owner,
        pg_catalog.pg_size_pretty(pg_catalog.pg_database_size(d.datname)) AS size,
        s.numbackends AS active_backends,
        s.xact_commit AS commits,
        s.xact_rollback AS rollbacks,
        s.blks_read AS blocks_read,
        s.blks_hit AS blocks_hit,
        s.deadlocks
      FROM pg_catalog.pg_database d
      JOIN pg_catalog.pg_stat_database s ON s.datname = d.datname
      WHERE d.datname = current_database();
    `;
  }

  getActiveConnectionsQuery(): string {
    return `
      SELECT
        pid,
        usename,
        application_name,
        client_addr,
        state,
        wait_event_type,
        wait_event,
        query_start,
        NOW() - query_start AS duration,
        LEFT(query, 200) AS query
      FROM pg_catalog.pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
      ORDER BY query_start DESC NULLS LAST;
    `;
  }

  getDatabaseSizeQuery(): string {
    return `
      SELECT
        pg_catalog.pg_size_pretty(pg_catalog.pg_database_size(current_database())) AS total_size,
        pg_catalog.pg_database_size(current_database()) AS size_bytes;
    `;
  }

  getVersionQuery(): string {
    return `SELECT version();`;
  }

  getTableStatsQuery(): string {
    return `
      SELECT
        schemaname,
        relname AS table_name,
        n_live_tup AS live_rows,
        n_dead_tup AS dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) AS total_size
      FROM pg_catalog.pg_stat_user_tables
      ORDER BY n_live_tup DESC;
    `;
  }

  getIndexHealthQuery(): string {
    return `
      SELECT
        schemaname,
        relname AS table_name,
        indexrelname AS index_name,
        idx_scan AS scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
      FROM pg_catalog.pg_stat_user_indexes
      ORDER BY idx_scan ASC;
    `;
  }

  getLongRunningQueriesQuery(): string {
    return `
      SELECT
        pid,
        usename,
        NOW() - query_start AS duration,
        state,
        LEFT(query, 500) AS query
      FROM pg_catalog.pg_stat_activity
      WHERE datname = current_database()
        AND state = 'active'
        AND NOW() - query_start > interval '5 seconds'
        AND pid <> pg_backend_pid()
      ORDER BY duration DESC;
    `;
  }

  getPerformanceStatsQuery(): string {
    return `
      SELECT
        calls,
        total_exec_time,
        mean_exec_time,
        rows,
        LEFT(query, 200) AS query
      FROM pg_stat_statements
      WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      ORDER BY total_exec_time DESC
      LIMIT 20;
    `;
  }

  getSlowQueriesQuery(): string {
    return `
      SELECT
        calls,
        mean_exec_time,
        max_exec_time,
        rows,
        LEFT(query, 300) AS query
      FROM pg_stat_statements
      WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
        AND mean_exec_time > 100
      ORDER BY mean_exec_time DESC
      LIMIT 20;
    `;
  }
}
