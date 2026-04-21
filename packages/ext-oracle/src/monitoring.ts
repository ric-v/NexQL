import type { MonitoringProvider } from '@nexql/core/core/db/MonitoringProvider';

/**
 * Oracle monitoring provider.
 * Returns queries for dashboard panels using V$SESSION, V$DATABASE,
 * V$INSTANCE, V$SQL, and DBA_DATA_FILES dynamic performance views.
 */
export class OracleMonitoring implements MonitoringProvider {
  getOverviewQuery(): string {
    return `
      SELECT
        d.name AS database_name,
        i.instance_name,
        i.host_name,
        i.version AS db_version,
        i.status AS instance_status,
        d.open_mode,
        d.log_mode,
        i.startup_time
      FROM v$database d, v$instance i
    `;
  }

  getActiveConnectionsQuery(): string {
    return `
      SELECT
        s.sid,
        s.serial#,
        s.username,
        s.machine,
        s.program,
        s.status,
        s.logon_time,
        s.sql_id,
        sq.sql_text AS current_query,
        s.wait_class,
        s.event AS wait_event,
        s.seconds_in_wait
      FROM v$session s
      LEFT JOIN v$sql sq ON s.sql_id = sq.sql_id AND s.sql_child_number = sq.child_number
      WHERE s.type = 'USER'
        AND s.username IS NOT NULL
      ORDER BY s.logon_time DESC
    `;
  }

  getDatabaseSizeQuery(): string {
    return `
      SELECT
        (SELECT name FROM v$database) AS database_name,
        ROUND(SUM(bytes) / 1024 / 1024, 2) AS total_size_mb,
        ROUND(SUM(DECODE(f.tablespace_name, 'SYSTEM', bytes, 0)) / 1024 / 1024, 2) AS system_size_mb,
        ROUND(SUM(DECODE(f.tablespace_name, 'SYSAUX', bytes, 0)) / 1024 / 1024, 2) AS sysaux_size_mb
      FROM dba_data_files f
    `;
  }

  getVersionQuery(): string {
    return `SELECT banner AS version FROM v$version WHERE ROWNUM = 1`;
  }

  getTableStatsQuery(): string {
    return `
      SELECT
        t.owner AS schema_name,
        t.table_name,
        t.num_rows AS row_count,
        ROUND(s.bytes / 1024 / 1024, 2) AS total_size_mb,
        t.last_analyzed
      FROM all_tables t
      LEFT JOIN dba_segments s
        ON t.owner = s.owner AND t.table_name = s.segment_name AND s.segment_type = 'TABLE'
      WHERE t.owner NOT IN ('SYS', 'SYSTEM', 'XDB', 'CTXSYS', 'MDSYS', 'ORDDATA', 'ORDSYS', 'WMSYS')
        AND t.num_rows IS NOT NULL
      ORDER BY t.num_rows DESC NULLS LAST
      FETCH FIRST 50 ROWS ONLY
    `;
  }

  getIndexHealthQuery(): string {
    return `
      SELECT
        i.owner AS schema_name,
        i.table_name,
        i.index_name,
        i.index_type,
        i.uniqueness,
        i.status,
        i.num_rows,
        ROUND(s.bytes / 1024 / 1024, 2) AS index_size_mb,
        i.last_analyzed
      FROM all_indexes i
      LEFT JOIN dba_segments s
        ON i.owner = s.owner AND i.index_name = s.segment_name AND s.segment_type = 'INDEX'
      WHERE i.owner NOT IN ('SYS', 'SYSTEM', 'XDB', 'CTXSYS', 'MDSYS', 'ORDDATA', 'ORDSYS', 'WMSYS')
      ORDER BY s.bytes DESC NULLS LAST
      FETCH FIRST 50 ROWS ONLY
    `;
  }

  getLongRunningQueriesQuery(): string {
    return `
      SELECT
        s.sid,
        s.serial#,
        s.username,
        s.sql_id,
        sq.sql_text AS query_text,
        s.status,
        s.last_call_et AS duration_seconds,
        s.machine,
        s.program
      FROM v$session s
      LEFT JOIN v$sql sq ON s.sql_id = sq.sql_id AND s.sql_child_number = sq.child_number
      WHERE s.type = 'USER'
        AND s.username IS NOT NULL
        AND s.status = 'ACTIVE'
        AND s.last_call_et > 5
      ORDER BY s.last_call_et DESC
    `;
  }

  getPerformanceStatsQuery(): string {
    return `
      SELECT
        sql_id,
        executions AS execution_count,
        ROUND(elapsed_time / 1000, 2) AS total_elapsed_ms,
        ROUND(elapsed_time / GREATEST(executions, 1) / 1000, 2) AS avg_elapsed_ms,
        buffer_gets AS total_logical_reads,
        disk_reads AS total_disk_reads,
        SUBSTR(sql_text, 1, 200) AS query_text
      FROM v$sql
      WHERE executions > 0
        AND parsing_schema_name NOT IN ('SYS', 'SYSTEM')
      ORDER BY elapsed_time DESC
      FETCH FIRST 20 ROWS ONLY
    `;
  }

  getSlowQueriesQuery(): string {
    return `
      SELECT
        sql_id,
        executions AS execution_count,
        ROUND(elapsed_time / GREATEST(executions, 1) / 1000, 2) AS avg_elapsed_ms,
        ROUND(elapsed_time / 1000, 2) AS total_elapsed_ms,
        buffer_gets / GREATEST(executions, 1) AS avg_logical_reads,
        SUBSTR(sql_text, 1, 200) AS query_text
      FROM v$sql
      WHERE executions > 0
        AND elapsed_time / GREATEST(executions, 1) > 100000
        AND parsing_schema_name NOT IN ('SYS', 'SYSTEM')
      ORDER BY avg_elapsed_ms DESC
      FETCH FIRST 20 ROWS ONLY
    `;
  }
}
