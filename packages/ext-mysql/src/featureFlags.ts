import type { FeatureFlags } from '@nexql/core/core/db/capabilities';

/**
 * MySQL feature flags — enables MySQL-supported capabilities.
 */
export const mysqlFeatureFlags: FeatureFlags = {
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
