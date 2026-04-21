import type { MonitoringProvider } from '@nexql/core/core/db/MonitoringProvider';

/**
 * MySQL monitoring provider.
 * Returns queries for dashboard panels using SHOW PROCESSLIST,
 * information_schema.TABLES, SHOW GLOBAL STATUS, and performance_schema.
 */
export class MysqlMonitoring implements MonitoringProvider {
  getOverviewQuery(): string {
    return `
      SELECT
        @@hostname AS hostname,
        @@version AS version,
        @@version_comment AS version_comment,
        DATABASE() AS current_database,
        USER() AS current_user,
        @@innodb_buffer_pool_size AS buffer_pool_size,
        @@max_connections AS max_connections
    `;
  }

  getActiveConnectionsQuery(): string {
    return `
      SELECT
        ID AS id,
        USER AS user,
        HOST AS host,
        DB AS database_name,
        COMMAND AS command,
        TIME AS time_seconds,
        STATE AS state,
        LEFT(INFO, 200) AS query
      FROM information_schema.PROCESSLIST
      WHERE ID <> CONNECTION_ID()
      ORDER BY TIME DESC
    `;
  }

  getDatabaseSizeQuery(): string {
    return `
      SELECT
        table_schema AS database_name,
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS total_size_mb,
        ROUND(SUM(data_length) / 1024 / 1024, 2) AS data_size_mb,
        ROUND(SUM(index_length) / 1024 / 1024, 2) AS index_size_mb
      FROM information_schema.TABLES
      WHERE table_schema = DATABASE()
      GROUP BY table_schema
    `;
  }

  getVersionQuery(): string {
    return `SELECT VERSION() AS version`;
  }

  getTableStatsQuery(): string {
    return `
      SELECT
        TABLE_NAME AS table_name,
        ENGINE AS engine,
        TABLE_ROWS AS estimated_rows,
        ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_size_mb,
        ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_size_mb,
        ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS total_size_mb,
        AUTO_INCREMENT AS auto_increment,
        UPDATE_TIME AS last_update
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
    `;
  }

  getIndexHealthQuery(): string {
    return `
      SELECT
        TABLE_NAME AS table_name,
        INDEX_NAME AS index_name,
        NON_UNIQUE AS non_unique,
        SEQ_IN_INDEX AS seq_in_index,
        COLUMN_NAME AS column_name,
        CARDINALITY AS cardinality,
        INDEX_TYPE AS index_type
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `;
  }

  getLongRunningQueriesQuery(): string {
    return `
      SELECT
        ID AS id,
        USER AS user,
        HOST AS host,
        DB AS database_name,
        COMMAND AS command,
        TIME AS time_seconds,
        STATE AS state,
        LEFT(INFO, 500) AS query
      FROM information_schema.PROCESSLIST
      WHERE COMMAND <> 'Sleep'
        AND TIME > 5
        AND ID <> CONNECTION_ID()
      ORDER BY TIME DESC
    `;
  }

  getPerformanceStatsQuery(): string {
    return `
      SELECT
        DIGEST_TEXT AS query_digest,
        COUNT_STAR AS execution_count,
        ROUND(SUM_TIMER_WAIT / 1000000000000, 4) AS total_time_sec,
        ROUND(AVG_TIMER_WAIT / 1000000000000, 4) AS avg_time_sec,
        SUM_ROWS_EXAMINED AS rows_examined,
        SUM_ROWS_SENT AS rows_sent
      FROM performance_schema.events_statements_summary_by_digest
      WHERE SCHEMA_NAME = DATABASE()
        AND DIGEST_TEXT IS NOT NULL
      ORDER BY SUM_TIMER_WAIT DESC
      LIMIT 20
    `;
  }

  getSlowQueriesQuery(): string {
    return `
      SELECT
        DIGEST_TEXT AS query_digest,
        COUNT_STAR AS execution_count,
        ROUND(AVG_TIMER_WAIT / 1000000000000, 4) AS avg_time_sec,
        ROUND(MAX_TIMER_WAIT / 1000000000000, 4) AS max_time_sec,
        SUM_ROWS_EXAMINED AS rows_examined,
        SUM_ROWS_SENT AS rows_sent
      FROM performance_schema.events_statements_summary_by_digest
      WHERE SCHEMA_NAME = DATABASE()
        AND DIGEST_TEXT IS NOT NULL
        AND AVG_TIMER_WAIT > 100000000000
      ORDER BY AVG_TIMER_WAIT DESC
      LIMIT 20
    `;
  }
}
