import * as vscode from 'vscode';
import type { DbDriver } from '../db/DbDriver';
import type { DbDialect } from '../db/DbDialect';
import type { IntrospectionProvider } from '../db/introspection/IntrospectionProvider';
import type { FeatureFlags } from '../db/capabilities';
import type { SqlTemplateProvider } from '../db/SqlTemplateProvider';
import type { ConnectionFormFieldDefinition } from '../types/connectionForm';
import type { MonitoringProvider } from '../db/MonitoringProvider';
import type { DdlProvider } from '../db/DdlProvider';
import type { MigrationStatementGenerator } from '../db/MigrationStatementGenerator';
import type { ExplainPlanParser } from '../db/ExplainPlanParser';
import type { ExplainPlanNormalizer } from '../db/ExplainPlanNormalizer';
import type { TypeClassifier } from '../db/TypeClassifier';
import type { CompletionProvider } from '../db/CompletionProvider';
import type { IndexAdvisor } from '../db/IndexAdvisor';
/**
 * Database category classifying engines by paradigm.
 */
export type DatabaseCategory = 'sql' | 'nosql' | 'graph' | 'timeseries' | 'keyvalue';
/**
 * The public API surface exposed to Database Extensions.
 * Returned from the Core Extension's `activate()` method.
 */
export interface ProviderAPI {
    registerEngine(registration: EngineRegistration): void;
    unregisterEngine(engine: string): void;
    getRegisteredEngines(): string[];
    onDidChangeEngines: vscode.Event<EngineChangeEvent>;
}
/**
 * Registration payload provided by a Database Extension when it registers
 * its engine with the Core Extension.
 */
export interface EngineRegistration {
    /** Unique engine identifier (e.g., 'postgres', 'mysql', 'sqlite') */
    engine: string;
    /** Human-readable display name (e.g., 'PostgreSQL', 'MySQL') */
    displayName: string;
    /** Database category (sql, nosql, graph, timeseries, keyvalue) */
    category: DatabaseCategory;
    /** The database driver implementation */
    driver: DbDriver;
    /** The SQL dialect implementation */
    dialect: DbDialect;
    /** The introspection provider for schema discovery */
    introspection: IntrospectionProvider;
    /** Feature flags controlling UI capabilities */
    featureFlags: FeatureFlags;
    /** Optional SQL template provider for engine-specific SQL generation */
    sqlTemplates?: SqlTemplateProvider;
    /** Optional custom connection form field definitions */
    connectionFormFields?: ConnectionFormFieldDefinition[];
    /** Optional monitoring/dashboard query provider */
    monitoringProvider?: MonitoringProvider;
    /** Optional DDL generation provider */
    ddlProvider?: DdlProvider;
    /** Optional migration statement generator */
    migrationGenerator?: MigrationStatementGenerator;
    /** Optional EXPLAIN plan parser */
    explainPlanParser?: ExplainPlanParser;
    /** Optional EXPLAIN plan normalizer for visualization */
    explainNormalizer?: ExplainPlanNormalizer;
    /** Optional type classifier for column type categorization */
    typeClassifier?: TypeClassifier;
    /** Optional completion provider for IntelliSense */
    completionProvider?: CompletionProvider;
    /** Optional index advisor for index recommendations */
    indexAdvisor?: IndexAdvisor;
    /** Placeholder for future NoSQL document provider */
    documentProvider?: unknown;
    /** Optional path to the engine icon */
    iconPath?: string;
}
/**
 * Event fired when an engine is registered or unregistered.
 */
export interface EngineChangeEvent {
    engine: string;
    action: 'registered' | 'unregistered';
}
//# sourceMappingURL=ProviderAPI.d.ts.map