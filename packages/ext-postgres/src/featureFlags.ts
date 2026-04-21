import type { FeatureFlags } from '@nexql/core/core/db/capabilities';

/**
 * PostgreSQL feature flags — enables all PG-supported capabilities.
 */
export const postgresFeatureFlags: FeatureFlags = {
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
