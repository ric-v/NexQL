import * as vscode from 'vscode';
import { ConnectionConfig } from '../common/types';
import { PoolMetrics } from '../core/db/DbDriver';
import { DriverRegistry } from '../core/db/registry';
import { coerceConnectionPassword } from '../utils/coerceConnectionPassword';
import { SecretStorageService } from './SecretStorageService';
import type { Client, PoolClient } from 'pg';

export class ConnectionManager {
  private static instance: ConnectionManager;

  private constructor() {}

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Resolves the engine from the config, defaulting to 'postgres' for backward compatibility.
   */
  private resolveEngine(config: ConnectionConfig): string {
    return config.engine || 'postgres';
  }

  /**
   * Resolves the password for a connection config.
   * Priority: config.password > SecretStorage > .pgpass
   */
  private async resolvePassword(config: ConnectionConfig): Promise<string | undefined> {
    // Inline password (form, tests, or legacy JSON where digits became a number)
    const inline = coerceConnectionPassword((config as any).password);
    if (inline !== undefined) {
      return inline;
    }

    // Try SecretStorage
    if (config.id) {
      try {
        const secretService = SecretStorageService.getInstance();
        const password = await secretService.getPassword(config.id);
        if (password) {
          return password;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[ConnectionManager] Failed to retrieve password from SecretStorage for connection ${config.id}: ${message}`);
      }
    }

    // Try .pgpass file as last resort
    if (config.username) {
      try {
        const { resolvePgPassPassword } = require('../utils/pgPassUtils');
        const db = config.database || 'postgres';
        const pgpassPwd = resolvePgPassPassword(config.host, config.port, db, config.username);
        if (pgpassPwd !== undefined) {
          return pgpassPwd;
        }
        // Try with 'postgres' database as fallback
        if (db !== 'postgres') {
          const fallback = resolvePgPassPassword(config.host, config.port, 'postgres', config.username);
          if (fallback !== undefined) {
            return fallback;
          }
        }
      } catch {
        // pgPassUtils might not be available
      }
    }

    return undefined;
  }

  /**
   * Enriches a ConnectionConfig with the resolved password from SecretStorage.
   */
  private async enrichConfigWithPassword(config: ConnectionConfig): Promise<ConnectionConfig> {
    const password = await this.resolvePassword(config);
    const { password: _removed, ...base } = config as any;
    if (password) {
      return { ...base, password } as ConnectionConfig;
    }
    return base as ConnectionConfig;
  }

  /**
   * Validates that the engine is registered in the DriverRegistry.
   * If not registered, shows an error message with an option to open the marketplace.
   * @returns true if the engine is registered, false otherwise.
   */
  public async validateEngine(engine: string): Promise<boolean> {
    const registry = DriverRegistry.getInstance();
    if (registry.isRegistered(engine)) {
      return true;
    }

    const extensionName = `NexQL - ${engine.charAt(0).toUpperCase() + engine.slice(1)}`;
    const action = await vscode.window.showErrorMessage(
      `The database engine "${engine}" is not available. ` +
        `Please install the "${extensionName}" extension to connect to ${engine} databases.`,
      'Open Marketplace'
    );

    if (action === 'Open Marketplace') {
      await vscode.commands.executeCommand(
        'workbench.extensions.search',
        `nexql ${engine}`
      );
    }

    return false;
  }

  public getPoolMetrics(connectionId: string): PoolMetrics | undefined {
    const registry = DriverRegistry.getInstance();
    for (const engine of registry.getRegisteredEngines()) {
      const metrics = registry.getDriver(engine).getPoolMetrics?.(connectionId);
      if (metrics) {
        return metrics;
      }
    }
    return undefined;
  }

  public getAllPoolMetrics(): PoolMetrics[] {
    const registry = DriverRegistry.getInstance();
    return registry.getRegisteredEngines().flatMap(
      (engine) => registry.getDriver(engine).getAllPoolMetrics?.() || []
    );
  }

  /**
   * Get a pooled client for ephemeral operations.
   * Caller must release() when done.
   */
  public async getPooledClient(config: ConnectionConfig): Promise<PoolClient> {
    const engine = this.resolveEngine(config);
    const enrichedConfig = await this.enrichConfigWithPassword(config);
    const driver = DriverRegistry.getInstance().getDriver(engine);
    return (await driver.getPooledClient(enrichedConfig)) as unknown as PoolClient;
  }

  /**
   * Get a persistent session client for notebooks and long-running workflows.
   */
  public async getSessionClient(config: ConnectionConfig, sessionId: string): Promise<Client> {
    const engine = this.resolveEngine(config);
    const enrichedConfig = await this.enrichConfigWithPassword(config);
    const driver = DriverRegistry.getInstance().getDriver(engine);
    return (await driver.getSessionClient(enrichedConfig, sessionId)) as unknown as Client;
  }

  public async closeSession(config: ConnectionConfig, sessionId: string): Promise<void> {
    const engine = this.resolveEngine(config);
    const driver = DriverRegistry.getInstance().getDriver(engine);
    await driver.closeSession(config, sessionId);
  }

  /**
   * Close all pools and sessions for a single logical connection config.
   */
  public async closeConnection(config: ConnectionConfig): Promise<void> {
    const engine = this.resolveEngine(config);
    const driver = DriverRegistry.getInstance().getDriver(engine);
    await driver.closeConnection(config);
  }

  /**
   * Close all pools/sessions for a connection ID, regardless of selected database.
   * Iterates over all registered engines to ensure complete cleanup.
   */
  public async closeAllConnectionsById(connectionId: string): Promise<void> {
    const registry = DriverRegistry.getInstance();
    await Promise.all(
      registry.getRegisteredEngines().map((engine) =>
        registry.getDriver(engine).closeAllConnectionsById(connectionId)
      )
    );
  }

  /**
   * Close all pools and sessions across all registered engines.
   */
  public async closeAll(): Promise<void> {
    const registry = DriverRegistry.getInstance();
    await Promise.all(
      registry.getRegisteredEngines().map((engine) =>
        registry.getDriver(engine).closeAll()
      )
    );
  }
}
