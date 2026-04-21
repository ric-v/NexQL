import type { DbEngine } from '../core/db/DbEngine';
export interface ConnectionConfig {
    id: string;
    name?: string;
    engine: DbEngine;
    host: string;
    port: number;
    username?: string;
    password?: string;
    database?: string;
    sslmode?: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
    sslCertPath?: string;
    sslKeyPath?: string;
    sslRootCertPath?: string;
    statementTimeout?: number;
    connectTimeout?: number;
    applicationName?: string;
    options?: string;
    environment?: 'production' | 'staging' | 'development';
    readOnlyMode?: boolean;
    ssh?: {
        enabled: boolean;
        host: string;
        port: number;
        username: string;
        privateKeyPath?: string;
    };
}
export interface PostgresMetadata {
    connectionId: string;
    engine?: DbEngine;
    databaseName: string | undefined;
    host: string;
    port: number;
    username?: string;
    password?: string;
    activeProfileId?: string;
    readOnlyMode?: boolean;
    autoLimitSelectResults?: number;
    autoApplySafetyCheck?: boolean;
    transactionSettings?: {
        autoRollback: boolean;
        isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
        readOnly?: boolean;
        deferrable?: boolean;
    };
    custom?: {
        cells: any[];
        metadata: {
            connectionId: string;
            databaseName: string | undefined;
            host: string;
            port: number;
            username?: string;
            password?: string;
            enableScripts: boolean;
        };
    };
}
export interface FkColumnInfo {
    column: string;
    refSchema: string;
    refTable: string;
    refColumn: string;
}
export interface TableInfo {
    schema?: string;
    table?: string;
    primaryKeys?: string[];
    uniqueKeys?: string[];
    foreignKeys?: FkColumnInfo[];
}
export interface BreadcrumbContext {
    connectionId: string;
    connectionName: string;
    database?: string;
    schema?: string;
    object?: {
        name: string;
        type: 'table' | 'view' | 'function';
    };
}
export interface QueryResults {
    rows: any[];
    columns: string[];
    rowCount?: number | null;
    command?: string;
    query?: string;
    notices?: string[];
    executionTime?: number;
    tableInfo?: TableInfo;
    columnTypes?: Record<string, string>;
    success?: boolean;
    backendPid?: number | null;
    explainPlan?: any;
    performanceAnalysis?: any;
    slowQuery?: boolean;
    breadcrumb?: BreadcrumbContext;
    errorCode?: string;
    errorExplanation?: string;
    transactionState?: {
        isActive: boolean;
        statementCount: number;
    };
    pendingCommit?: boolean;
    /** True when SqlExecutor appended LIMIT (auto-limit / profile / read-only). */
    autoLimitApplied?: boolean;
    /** Effective LIMIT value when autoLimitApplied is true. */
    autoLimitValue?: number;
}
export interface TableRenderOptions {
    columns: string[];
    rows: any[];
    originalRows: any[];
    columnTypes?: Record<string, string>;
    tableInfo?: TableInfo;
    initialSelectedIndices?: Set<number>;
    modifiedCells?: Map<string, {
        originalValue: any;
        newValue: any;
    }>;
    rowsMarkedForDeletion?: Set<number>;
    pendingInserts?: PendingInsert[];
    rowStatusMap?: RowStatusMap;
    sortState?: SortState;
    filterState?: FilterState;
    foreignKeys?: FkColumnInfo[];
    onInsertRow?: (values: Record<string, any>, tempId: string) => void;
    onFkLookup?: (req: FkLookupRequest) => void;
    onFilterChange?: (filterState: FilterState) => void;
    onSortChange?: (sortState: SortState) => void;
}
export interface ChartRenderOptions {
    type: string;
    xAxisCol: string;
    yAxisCols: string[];
    numericCols: string[];
    sortBy?: string;
    limitRows?: number;
    dateFormat?: string;
    useLogScale?: boolean;
    showGridX?: boolean;
    showGridY?: boolean;
    showDataLabels?: boolean;
    showLabels?: boolean;
    chartTitle?: string;
    legendPosition?: string;
    horizontalBars?: boolean;
    curveTension?: number;
    lineStyle?: string;
    pointStyle?: string;
    blurEffect?: boolean;
    hiddenSlices?: Set<string>;
    selectedPieValueCol?: string;
    seriesColors?: Map<string, string>;
    sliceColors?: Map<string, string>;
    textColor?: string;
}
export interface DashboardStats {
    dbName: string;
    owner: string;
    size: string;
    objectCounts: {
        tables: number;
        views: number;
        functions: number;
    };
    metrics: {
        xact_commit: number;
        xact_rollback: number;
        blks_read: number;
        blks_hit: number;
        deadlocks: number;
        conflicts: number;
    };
    activeConnections: number;
    idleConnections: number;
    waitingConnections: number;
    maxConnections: number;
    longRunningQueries: number;
    waitEvents: Array<{
        type: string;
        count: number;
    }>;
    blockingLocks: Array<{
        blocking_pid: number;
        blocked_pid: number;
        locked_object: string;
        lock_mode: string;
    }>;
    activeQueries: Array<{
        pid: number;
        usename: string;
        duration: string;
        query: string;
    }>;
}
export type RowChangeStatus = 'unchanged' | 'inserted' | 'modified' | 'deleted';
export interface PendingInsert {
    tempId: string;
    values: Record<string, any>;
}
export type RowStatusMap = Map<number | string, RowChangeStatus>;
export interface SortState {
    column: string | null;
    direction: 'asc' | 'desc' | 'none';
}
export type FilterOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith';
export interface FilterClause {
    id: string;
    column: string;
    operator: FilterOperator;
    value: string;
}
export interface FilterState {
    globalQuery: string;
    clauses: FilterClause[];
}
export interface ColumnStatsData {
    column: string;
    nullCount: number;
    nullPct: number;
    distinctCount: number;
    min: any;
    max: any;
    avgLength?: number;
    totalRows: number;
}
export interface SqlFormatterConfig {
    keywordCase: 'upper' | 'lower' | 'preserve';
    indentStyle: 'standard' | 'tabularLeft' | 'tabularRight';
    tabWidth: number;
    useTabs: boolean;
    linesBetweenQueries: number;
    formatOnSave: boolean;
}
export interface FkLookupRequest {
    type: 'fkLookup';
    requestId: string;
    fkSchema: string;
    fkTable: string;
    fkColumn: string;
    searchText: string;
    limit: number;
}
export interface FkLookupResponse {
    type: 'fkLookupResponse';
    requestId: string;
    rows: Record<string, any>[];
    columns: string[];
}
export interface InsertRowMessage {
    type: 'insertRow';
    tableInfo: TableInfo & {
        foreignKeys?: FkColumnInfo[];
    };
    values: Record<string, any>;
    tempId: string;
}
export interface ResultHistoryEntry {
    columns: string[];
    rows: any[];
    columnTypes?: Record<string, string>;
    tableInfo?: TableInfo;
    command?: string;
    rowCount?: number | null;
    executionTime?: number;
    query?: string;
    timestamp: number;
}
//# sourceMappingURL=types.d.ts.map