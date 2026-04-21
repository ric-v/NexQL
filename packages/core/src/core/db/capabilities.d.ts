export interface FeatureFlags {
    supportsSchemas: boolean;
    supportsListenNotify: boolean;
    supportsLogicalReplication: boolean;
    supportsTablespaces: boolean;
    supportsEventTriggers: boolean;
    supportsPgCron: boolean;
    supportsForeignDataWrappers: boolean;
    supportsMaterializedViews: boolean;
    supportsStoredProcedures: boolean;
    supportsTriggers: boolean;
    supportsSequences: boolean;
    supportsDomains: boolean;
    supportsCustomTypes: boolean;
    supportsPartitions: boolean;
    supportsRlsPolicies: boolean;
    supportsRules: boolean;
    supportsAggregates: boolean;
    supportsVacuum: boolean;
    supportsExplain: boolean;
    supportsTransactions: boolean;
    supportsSavepoints: boolean;
    supportsRoles: boolean;
    supportsTabularResults: boolean;
    supportsDocumentResults: boolean;
    supportsGraphResults: boolean;
}
export declare const POSTGRES_FEATURE_FLAGS: FeatureFlags;
export declare const MYSQL_FEATURE_FLAGS: FeatureFlags;
export declare const SQLITE_FEATURE_FLAGS: FeatureFlags;
export declare const MSSQL_FEATURE_FLAGS: FeatureFlags;
export declare const ORACLE_FEATURE_FLAGS: FeatureFlags;
//# sourceMappingURL=capabilities.d.ts.map