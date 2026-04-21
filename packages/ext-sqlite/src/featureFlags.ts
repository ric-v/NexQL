import type { FeatureFlags } from '@nexql/core/core/db/capabilities';

/**
 * SQLite feature flags — limited feature set for embedded database.
 */
export const sqliteFeatureFlags: FeatureFlags = {
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
