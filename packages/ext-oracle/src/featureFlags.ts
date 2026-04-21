import type { FeatureFlags } from '@nexql/core/core/db/capabilities';

/**
 * Oracle feature flags — enables Oracle-supported capabilities.
 * Oracle supports schemas (owner-based), tablespaces, materialized views,
 * stored procedures, sequences, partitions, and more.
 */
export const oracleFeatureFlags: FeatureFlags = {
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
