export interface FeatureFlags {
  // Existing SQL flags
  supportsSchemas: boolean;
  supportsListenNotify: boolean;
  supportsLogicalReplication: boolean;
  supportsTablespaces: boolean;
  supportsEventTriggers: boolean;
  supportsPgCron: boolean;
  supportsForeignDataWrappers: boolean;
  // New flags for broader feature coverage
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
  // Category-level flags
  supportsTabularResults: boolean;
  supportsDocumentResults: boolean;
  supportsGraphResults: boolean;
}

export const POSTGRES_FEATURE_FLAGS: FeatureFlags = {
  supportsSchemas: true,
  supportsListenNotify: true,
  supportsLogicalReplication: true,
  supportsTablespaces: true,
  supportsEventTriggers: true,
  supportsPgCron: true,
  supportsForeignDataWrappers: true,
  supportsMaterializedViews: true,
  supportsStoredProcedures: true,
  supportsTriggers: true,
  supportsSequences: true,
  supportsDomains: true,
  supportsCustomTypes: true,
  supportsPartitions: true,
  supportsRlsPolicies: true,
  supportsRules: true,
  supportsAggregates: true,
  supportsVacuum: true,
  supportsExplain: true,
  supportsTransactions: true,
  supportsSavepoints: true,
  supportsRoles: true,
  supportsTabularResults: true,
  supportsDocumentResults: false,
  supportsGraphResults: false,
};

export const MYSQL_FEATURE_FLAGS: FeatureFlags = {
  supportsSchemas: false,
  supportsListenNotify: false,
  supportsLogicalReplication: false,
  supportsTablespaces: false,
  supportsEventTriggers: false,
  supportsPgCron: false,
  supportsForeignDataWrappers: false,
  supportsMaterializedViews: false,
  supportsStoredProcedures: true,
  supportsTriggers: true,
  supportsSequences: false,
  supportsDomains: false,
  supportsCustomTypes: false,
  supportsPartitions: true,
  supportsRlsPolicies: false,
  supportsRules: false,
  supportsAggregates: false,
  supportsVacuum: true,
  supportsExplain: true,
  supportsTransactions: true,
  supportsSavepoints: true,
  supportsRoles: true,
  supportsTabularResults: true,
  supportsDocumentResults: false,
  supportsGraphResults: false,
};

export const SQLITE_FEATURE_FLAGS: FeatureFlags = {
  supportsSchemas: false,
  supportsListenNotify: false,
  supportsLogicalReplication: false,
  supportsTablespaces: false,
  supportsEventTriggers: false,
  supportsPgCron: false,
  supportsForeignDataWrappers: false,
  supportsMaterializedViews: false,
  supportsStoredProcedures: false,
  supportsTriggers: true,
  supportsSequences: false,
  supportsDomains: false,
  supportsCustomTypes: false,
  supportsPartitions: false,
  supportsRlsPolicies: false,
  supportsRules: false,
  supportsAggregates: false,
  supportsVacuum: true,
  supportsExplain: true,
  supportsTransactions: true,
  supportsSavepoints: true,
  supportsRoles: false,
  supportsTabularResults: true,
  supportsDocumentResults: false,
  supportsGraphResults: false,
};

export const MSSQL_FEATURE_FLAGS: FeatureFlags = {
  supportsSchemas: true,
  supportsListenNotify: false,
  supportsLogicalReplication: false,
  supportsTablespaces: false,
  supportsEventTriggers: false,
  supportsPgCron: false,
  supportsForeignDataWrappers: false,
  supportsMaterializedViews: true,
  supportsStoredProcedures: true,
  supportsTriggers: true,
  supportsSequences: true,
  supportsDomains: false,
  supportsCustomTypes: true,
  supportsPartitions: true,
  supportsRlsPolicies: true,
  supportsRules: false,
  supportsAggregates: true,
  supportsVacuum: false,
  supportsExplain: true,
  supportsTransactions: true,
  supportsSavepoints: true,
  supportsRoles: true,
  supportsTabularResults: true,
  supportsDocumentResults: false,
  supportsGraphResults: false,
};

export const ORACLE_FEATURE_FLAGS: FeatureFlags = {
  supportsSchemas: true,
  supportsListenNotify: false,
  supportsLogicalReplication: false,
  supportsTablespaces: true,
  supportsEventTriggers: false,
  supportsPgCron: false,
  supportsForeignDataWrappers: false,
  supportsMaterializedViews: true,
  supportsStoredProcedures: true,
  supportsTriggers: true,
  supportsSequences: true,
  supportsDomains: false,
  supportsCustomTypes: true,
  supportsPartitions: true,
  supportsRlsPolicies: true,
  supportsRules: false,
  supportsAggregates: true,
  supportsVacuum: false,
  supportsExplain: true,
  supportsTransactions: true,
  supportsSavepoints: true,
  supportsRoles: true,
  supportsTabularResults: true,
  supportsDocumentResults: false,
  supportsGraphResults: false,
};
