/**
 * Interface for engine-specific dashboard monitoring queries.
 * Required methods provide essential dashboard data; optional methods
 * enable additional monitoring panels when supported by the engine.
 */
export interface MonitoringProvider {
    /** Returns a query for the dashboard overview panel */
    getOverviewQuery(): string;
    /** Returns a query to list active connections */
    getActiveConnectionsQuery(): string;
    /** Returns a query to get the database size */
    getDatabaseSizeQuery(): string;
    /** Returns a query to get the database version */
    getVersionQuery(): string;
    /** Returns a query for table-level statistics */
    getTableStatsQuery?(): string;
    /** Returns a query for index health information */
    getIndexHealthQuery?(): string;
    /** Returns a query for long-running queries */
    getLongRunningQueriesQuery?(): string;
    /** Returns a query for performance statistics */
    getPerformanceStatsQuery?(): string;
    /** Returns a query for slow queries */
    getSlowQueriesQuery?(): string;
}
//# sourceMappingURL=MonitoringProvider.d.ts.map