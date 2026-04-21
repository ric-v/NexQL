import type { FeatureFlags } from '@nexql/core/core/db/capabilities';

/**
 * MSSQL feature flags — enables MSSQL-supported capabilities.
 */
export const mssqlFeatureFlags: FeatureFlags = {
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
