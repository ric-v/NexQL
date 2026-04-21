import type { MonitoringProvider } from '@nexql/core/core/db/MonitoringProvider';

/**
 * MSSQL monitoring provider.
 * Returns queries for dashboard panels using sys.dm_exec_sessions,
 * sys.dm_exec_requests, sys.databases, and other DMVs.
 */
export class MssqlMonitoring implements MonitoringProvider {
  getOverviewQuery(): string {
    return `
      SELECT
        DB_NAME() AS database_name,
        SUSER_SNAME(d.owner_sid) AS owner,
        CAST(SUM(mf.size) * 8.0 / 1024 AS DECIMAL(10,2)) AS size_mb,
        d.state_desc AS state,
        d.recovery_model_desc AS recovery_model,
        d.compatibility_level
      FROM sys.databases d
      LEFT JOIN sys.master_files mf ON d.database_id = mf.database_id
      WHERE d.name = DB_NAME()
      GROUP BY d.name, d.owner_sid, d.state_desc, d.recovery_model_desc, d.compatibility_level;
    `;
  }

  getActiveConnectionsQuery(): string {
    return `
      SELECT
        s.session_id,
        s.login_name,
        s.host_name,
        s.program_name,
        s.status,
        s.login_time,
        r.start_time AS request_start,
        r.status AS request_status,
        r.wait_type,
        r.wait_time,
        SUBSTRING(t.text, (r.statement_start_offset / 2) + 1,
          CASE
            WHEN r.statement_end_offset = -1 THEN LEN(t.text)
            ELSE (r.statement_end_offset - r.statement_start_offset) / 2 + 1
          END) AS current_query
      FROM sys.dm_exec_sessions s
      LEFT JOIN sys.dm_exec_requests r ON s.session_id = r.session_id
      OUTER APPLY sys.dm_exec_sql_text(r.sql_handle) t
      WHERE s.is_user_process = 1
        AND s.session_id <> @@SPID
      ORDER BY s.login_time DESC;
    `;
  }

  getDatabaseSizeQuery(): string {
    return `
      SELECT
        DB_NAME() AS database_name,
        CAST(SUM(size) * 8.0 / 1024 AS DECIMAL(10,2)) AS total_size_mb,
        CAST(SUM(CASE WHEN type = 0 THEN size ELSE 0 END) * 8.0 / 1024 AS DECIMAL(10,2)) AS data_size_mb,
        CAST(SUM(CASE WHEN type = 1 THEN size ELSE 0 END) * 8.0 / 1024 AS DECIMAL(10,2)) AS log_size_mb
      FROM sys.database_files;
    `;
  }

  getVersionQuery(): string {
    return `SELECT @@VERSION AS version;`;
  }

  getTableStatsQuery(): string {
    return `
      SELECT
        SCHEMA_NAME(t.schema_id) AS schema_name,
        t.name AS table_name,
        p.rows AS row_count,
        CAST(SUM(a.total_pages) * 8.0 / 1024 AS DECIMAL(10,2)) AS total_size_mb,
        CAST(SUM(a.used_pages) * 8.0 / 1024 AS DECIMAL(10,2)) AS used_size_mb
      FROM sys.tables t
      INNER JOIN sys.indexes i ON t.object_id = i.object_id
      INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
      INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
      WHERE i.index_id <= 1
      GROUP BY t.schema_id, t.name, p.rows
      ORDER BY p.rows DESC;
    `;
  }

  getIndexHealthQuery(): string {
    return `
      SELECT
        SCHEMA_NAME(t.schema_id) AS schema_name,
        t.name AS table_name,
        i.name AS index_name,
        i.type_desc AS index_type,
        ius.user_seeks,
        ius.user_scans,
        ius.user_lookups,
        ius.user_updates,
        CAST(SUM(ps.used_page_count) * 8.0 / 1024 AS DECIMAL(10,2)) AS index_size_mb
      FROM sys.indexes i
      INNER JOIN sys.tables t ON i.object_id = t.object_id
      LEFT JOIN sys.dm_db_index_usage_stats ius
        ON i.object_id = ius.object_id AND i.index_id = ius.index_id
        AND ius.database_id = DB_ID()
      LEFT JOIN sys.dm_db_partition_stats ps
        ON i.object_id = ps.object_id AND i.index_id = ps.index_id
      WHERE i.name IS NOT NULL
      GROUP BY t.schema_id, t.name, i.name, i.type_desc,
        ius.user_seeks, ius.user_scans, ius.user_lookups, ius.user_updates
      ORDER BY ius.user_seeks ASC;
    `;
  }

  getLongRunningQueriesQuery(): string {
    return `
      SELECT
        r.session_id,
        s.login_name,
        r.start_time,
        DATEDIFF(SECOND, r.start_time, GETDATE()) AS duration_seconds,
        r.status,
        r.wait_type,
        SUBSTRING(t.text, (r.statement_start_offset / 2) + 1,
          CASE
            WHEN r.statement_end_offset = -1 THEN LEN(t.text)
            ELSE (r.statement_end_offset - r.statement_start_offset) / 2 + 1
          END) AS query_text
      FROM sys.dm_exec_requests r
      INNER JOIN sys.dm_exec_sessions s ON r.session_id = s.session_id
      CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
      WHERE r.session_id <> @@SPID
        AND s.is_user_process = 1
        AND DATEDIFF(SECOND, r.start_time, GETDATE()) > 5
      ORDER BY duration_seconds DESC;
    `;
  }

  getPerformanceStatsQuery(): string {
    return `
      SELECT TOP 20
        qs.execution_count,
        CAST(qs.total_elapsed_time / 1000.0 AS DECIMAL(10,2)) AS total_elapsed_ms,
        CAST(qs.total_elapsed_time / qs.execution_count / 1000.0 AS DECIMAL(10,2)) AS avg_elapsed_ms,
        qs.total_logical_reads,
        qs.total_logical_writes,
        SUBSTRING(t.text, (qs.statement_start_offset / 2) + 1,
          CASE
            WHEN qs.statement_end_offset = -1 THEN LEN(t.text)
            ELSE (qs.statement_end_offset - qs.statement_start_offset) / 2 + 1
          END) AS query_text
      FROM sys.dm_exec_query_stats qs
      CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) t
      ORDER BY qs.total_elapsed_time DESC;
    `;
  }

  getSlowQueriesQuery(): string {
    return `
      SELECT TOP 20
        qs.execution_count,
        CAST(qs.total_elapsed_time / qs.execution_count / 1000.0 AS DECIMAL(10,2)) AS avg_elapsed_ms,
        CAST(qs.max_elapsed_time / 1000.0 AS DECIMAL(10,2)) AS max_elapsed_ms,
        qs.total_logical_reads / qs.execution_count AS avg_logical_reads,
        SUBSTRING(t.text, (qs.statement_start_offset / 2) + 1,
          CASE
            WHEN qs.statement_end_offset = -1 THEN LEN(t.text)
            ELSE (qs.statement_end_offset - qs.statement_start_offset) / 2 + 1
          END) AS query_text
      FROM sys.dm_exec_query_stats qs
      CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) t
      WHERE qs.total_elapsed_time / qs.execution_count > 100000
      ORDER BY avg_elapsed_ms DESC;
    `;
  }
}
