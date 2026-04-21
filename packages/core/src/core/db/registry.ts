import * as vscode from 'vscode';
import type { DbDriver } from './DbDriver';
import type { DbDialect } from './DbDialect';
import type { IntrospectionProvider } from './introspection/IntrospectionProvider';
import type { FeatureFlags } from './capabilities';
import type { SqlTemplateProvider } from './SqlTemplateProvider';
import type { ConnectionFormFieldDefinition } from '../types/connectionForm';
import type { MonitoringProvider } from './MonitoringProvider';
import type { DdlProvider } from './DdlProvider';
import type { MigrationStatementGenerator } from './MigrationStatementGenerator';
import type { ExplainPlanParser } from './ExplainPlanParser';
import type { ExplainPlanNormalizer } from './ExplainPlanNormalizer';
import type { TypeClassifier } from './TypeClassifier';
import type { CompletionProvider } from './CompletionProvider';
import type { IndexAdvisor } from './IndexAdvisor';
import type {
  ProviderAPI,
  EngineRegistration,
  EngineChangeEvent,
  DatabaseCategory,
} from '../api/ProviderAPI';

/**
 * Dynamic driver registry that replaces the former static registry.
 * Maintains a Map of engine identifiers to their full EngineRegistration
 * and emits events when engines are added or removed.
 *
 * Implements the ProviderAPI interface so it can be returned directly
 * from the Core Extension's activate() method.
 */
export class DriverRegistry implements ProviderAPI {
  private static instance: DriverRegistry;

  private engines: Map<string, EngineRegistration> = new Map();
  private _onDidChangeEngines = new vscode.EventEmitter<EngineChangeEvent>();
  readonly onDidChangeEngines: vscode.Event<EngineChangeEvent> = this._onDidChangeEngines.event;

  private constructor() {}

  /**
   * Returns the singleton DriverRegistry instance.
   */
  static getInstance(): DriverRegistry {
    if (!DriverRegistry.instance) {
      DriverRegistry.instance = new DriverRegistry();
    }
    return DriverRegistry.instance;
  }

  /**
   * Resets the singleton instance. Intended for testing only.
   */
  static reset(): void {
    if (DriverRegistry.instance) {
      DriverRegistry.instance._onDidChangeEngines.dispose();
    }
    DriverRegistry.instance = undefined as unknown as DriverRegistry;
  }

  // ─── Registration ───────────────────────────────────────────────────

  /**
   * Registers a database engine with the registry.
   * @throws Error if an engine with the same identifier is already registered.
   */
  registerEngine(registration: EngineRegistration): void {
    const { engine } = registration;
    if (this.engines.has(engine)) {
      throw new Error(
        `Engine "${engine}" is already registered. Each engine identifier must be unique. ` +
          `If you are developing a Database Extension, ensure it uses a distinct engine identifier.`
      );
    }
    this.engines.set(engine, registration);
    this._onDidChangeEngines.fire({ engine, action: 'registered' });
  }

  /**
   * Removes all registrations for the given engine and fires a change event.
   * If the engine is not registered, this is a no-op.
   */
  unregisterEngine(engine: string): void {
    if (!this.engines.has(engine)) {
      return;
    }
    this.engines.delete(engine);
    this._onDidChangeEngines.fire({ engine, action: 'unregistered' });
  }

  // ─── Query Methods ──────────────────────────────────────────────────

  /**
   * Returns the list of all currently registered engine identifiers.
   */
  getRegisteredEngines(): string[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Returns true if the given engine identifier is currently registered.
   */
  isRegistered(engine: string): boolean {
    return this.engines.has(engine);
  }

  // ─── Required Provider Getters ──────────────────────────────────────

  /**
   * Returns the DbDriver for the given engine.
   * @throws Error if the engine is not registered.
   */
  getDriver(engine: string): DbDriver {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.driver;
  }

  /**
   * Returns the DbDialect for the given engine.
   * @throws Error if the engine is not registered.
   */
  getDialect(engine: string): DbDialect {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.dialect;
  }

  /**
   * Returns the IntrospectionProvider for the given engine.
   * @throws Error if the engine is not registered.
   */
  getIntrospection(engine: string): IntrospectionProvider {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.introspection;
  }

  /**
   * Returns the FeatureFlags for the given engine.
   * @throws Error if the engine is not registered.
   */
  getFeatureFlags(engine: string): FeatureFlags {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.featureFlags;
  }

  /**
   * Returns the DatabaseCategory for the given engine.
   * @throws Error if the engine is not registered.
   */
  getCategory(engine: string): DatabaseCategory {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.category;
  }

  // ─── Optional Provider Getters ──────────────────────────────────────

  /**
   * Returns the SqlTemplateProvider for the given engine, or undefined if not provided.
   * @throws Error if the engine is not registered.
   */
  getSqlTemplates(engine: string): SqlTemplateProvider | undefined {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.sqlTemplates;
  }

  /**
   * Returns the ConnectionFormFieldDefinition array for the given engine.
   * Returns an empty array if the engine did not provide custom form fields.
   * @throws Error if the engine is not registered.
   */
  getConnectionFormFields(engine: string): ConnectionFormFieldDefinition[] {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.connectionFormFields ?? [];
  }

  /**
   * Returns the MonitoringProvider for the given engine, or undefined if not provided.
   * @throws Error if the engine is not registered.
   */
  getMonitoringProvider(engine: string): MonitoringProvider | undefined {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.monitoringProvider;
  }

  /**
   * Returns the DdlProvider for the given engine, or undefined if not provided.
   * @throws Error if the engine is not registered.
   */
  getDdlProvider(engine: string): DdlProvider | undefined {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.ddlProvider;
  }

  /**
   * Returns the MigrationStatementGenerator for the given engine, or undefined if not provided.
   * @throws Error if the engine is not registered.
   */
  getMigrationGenerator(engine: string): MigrationStatementGenerator | undefined {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.migrationGenerator;
  }

  /**
   * Returns the ExplainPlanParser for the given engine, or undefined if not provided.
   * @throws Error if the engine is not registered.
   */
  getExplainPlanParser(engine: string): ExplainPlanParser | undefined {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.explainPlanParser;
  }

  /**
   * Returns the ExplainPlanNormalizer for the given engine, or undefined if not provided.
   * @throws Error if the engine is not registered.
   */
  getExplainNormalizer(engine: string): ExplainPlanNormalizer | undefined {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.explainNormalizer;
  }

  /**
   * Returns the TypeClassifier for the given engine, or undefined if not provided.
   * @throws Error if the engine is not registered.
   */
  getTypeClassifier(engine: string): TypeClassifier | undefined {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.typeClassifier;
  }

  /**
   * Returns the CompletionProvider for the given engine, or undefined if not provided.
   * @throws Error if the engine is not registered.
   */
  getCompletionProvider(engine: string): CompletionProvider | undefined {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.completionProvider;
  }

  /**
   * Returns the IndexAdvisor for the given engine, or undefined if not provided.
   * @throws Error if the engine is not registered.
   */
  getIndexAdvisor(engine: string): IndexAdvisor | undefined {
    const registration = this.getRegistrationOrThrow(engine);
    return registration.indexAdvisor;
  }

  // ─── Internal Helpers ───────────────────────────────────────────────

  /**
   * Retrieves the full EngineRegistration for the given engine identifier.
   * @throws Error with a descriptive message if the engine is not registered.
   */
  private getRegistrationOrThrow(engine: string): EngineRegistration {
    const registration = this.engines.get(engine);
    if (!registration) {
      throw new Error(
        `Engine "${engine}" is not registered. ` +
          `Please install and activate the Database Extension for "${engine}" ` +
          `(e.g., the "NexQL - ${engine}" extension from the VS Code marketplace).`
      );
    }
    return registration;
  }
}

// ─── Backward-Compatible Exports ────────────────────────────────────────
// These functions preserve the old static registry API so that existing
// consumers (ConnectionManager, TreeProvider, etc.) continue to work until
// they are migrated to use DriverRegistry.getInstance() directly.

import type { DbEngine } from './DbEngine';
import { resolveDbEngine } from './DbEngine';

/**
 * @deprecated Use `DriverRegistry.getInstance().getDriver(engine)` instead.
 * Resolves a driver from the dynamic registry, falling back to the legacy
 * static drivers for engines that have not yet been registered dynamically.
 */
export function getDriver(engine?: DbEngine | string): DbDriver {
  const resolved = resolveDbEngine(engine);
  const registry = DriverRegistry.getInstance();
  if (registry.isRegistered(resolved)) {
    return registry.getDriver(resolved);
  }
  // Lazy-load legacy drivers to avoid circular imports and allow
  // the dynamic registry to take precedence once engines register.
  const { getLegacyDriver } = require('./legacyDrivers');
  return getLegacyDriver(resolved);
}

/**
 * @deprecated Use `DriverRegistry.getInstance().getDialect(engine)` instead.
 * Resolves a dialect from the dynamic registry, falling back to the legacy
 * static dialects for engines that have not yet been registered dynamically.
 */
export function getDialect(engine?: DbEngine | string): DbDialect {
  const resolved = resolveDbEngine(engine);
  const registry = DriverRegistry.getInstance();
  if (registry.isRegistered(resolved)) {
    return registry.getDialect(resolved);
  }
  const { getLegacyDialect } = require('./legacyDialects');
  return getLegacyDialect(resolved);
}
