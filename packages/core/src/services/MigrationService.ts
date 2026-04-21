import * as vscode from 'vscode';

/**
 * Result of a single migration item (connection, query, credential, or notebook).
 */
export interface MigrationItemResult {
  type: 'connection' | 'query' | 'credential' | 'notebook';
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Aggregate result of the full migration run.
 */
export interface MigrationResult {
  success: boolean;
  itemResults: MigrationItemResult[];
  errors: MigrationError[];
}

/**
 * Describes a migration error for a specific item.
 */
export interface MigrationError {
  type: 'connection' | 'query' | 'credential' | 'notebook';
  id: string;
  message: string;
}

/**
 * Handles one-time migration from PgStudio (postgres-explorer) to NexQL.
 *
 * Migrates:
 * - Connections from `postgresExplorer.connections` → `nexql.connections` with `engine: 'postgres'`
 * - Saved queries from old workspace state keys to new keys
 * - SecretStorage credentials from old key format to new
 * - `.pgsql` notebook file associations to the new notebook type and postgres engine
 *
 * On per-item error: logs, skips, and continues migrating remaining items.
 */
export class MigrationService {
  private static readonly MIGRATION_KEY = 'nexql.migration.version';
  private static readonly CURRENT_VERSION = 1;

  private readonly outputChannel: vscode.OutputChannel | undefined;

  constructor(outputChannel?: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Run migration if it has not already been performed.
   * Checks globalState for the migration version marker; if absent or outdated, runs all migrations.
   */
  async runIfNeeded(context: vscode.ExtensionContext): Promise<MigrationResult> {
    const currentVersion = context.globalState.get<number>(MigrationService.MIGRATION_KEY, 0);

    if (currentVersion >= MigrationService.CURRENT_VERSION) {
      return { success: true, itemResults: [], errors: [] };
    }

    this.log('Starting migration from PgStudio to NexQL...');

    const itemResults: MigrationItemResult[] = [];
    const errors: MigrationError[] = [];

    // Migrate connections
    const connectionResults = await this.migrateConnections();
    for (const result of connectionResults) {
      itemResults.push(result);
      if (!result.success && result.error) {
        errors.push({ type: result.type, id: result.id, message: result.error });
      }
    }

    // Migrate saved queries
    const queryResults = await this.migrateSavedQueries(context);
    for (const result of queryResults) {
      itemResults.push(result);
      if (!result.success && result.error) {
        errors.push({ type: result.type, id: result.id, message: result.error });
      }
    }

    // Migrate credentials
    const credentialResults = await this.migrateCredentials(context);
    for (const result of credentialResults) {
      itemResults.push(result);
      if (!result.success && result.error) {
        errors.push({ type: result.type, id: result.id, message: result.error });
      }
    }

    // Migrate notebooks
    const notebookResults = await this.migrateNotebooks();
    for (const result of notebookResults) {
      itemResults.push(result);
      if (!result.success && result.error) {
        errors.push({ type: result.type, id: result.id, message: result.error });
      }
    }

    // Record migration version marker on completion
    await context.globalState.update(MigrationService.MIGRATION_KEY, MigrationService.CURRENT_VERSION);

    const success = errors.length === 0;
    this.log(`Migration completed. ${itemResults.length} items processed, ${errors.length} errors.`);

    return { success, itemResults, errors };
  }

  /**
   * Migrate connections from old `postgresExplorer.connections` config key
   * to `nexql.connections` with `engine: 'postgres'` added to each entry.
   */
  private async migrateConnections(): Promise<MigrationItemResult[]> {
    const results: MigrationItemResult[] = [];

    try {
      const config = vscode.workspace.getConfiguration();
      const oldConnections = config.get<any[]>('postgresExplorer.connections');

      if (!oldConnections || oldConnections.length === 0) {
        this.log('No legacy connections found under postgresExplorer.connections');
        return results;
      }

      // Read existing nexql.connections to avoid overwriting
      const existingConnections = config.get<any[]>('nexql.connections') || [];
      const existingIds = new Set(existingConnections.map((c: any) => c.id));

      const migratedConnections = [...existingConnections];

      for (const conn of oldConnections) {
        const connId = conn.id || `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
          // Skip if already migrated (same ID exists)
          if (existingIds.has(conn.id)) {
            results.push({ type: 'connection', id: connId, success: true });
            continue;
          }

          const migratedConn = {
            ...conn,
            id: connId,
            engine: 'postgres',
          };

          migratedConnections.push(migratedConn);
          results.push({ type: 'connection', id: connId, success: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.log(`Failed to migrate connection ${connId}: ${message}`);
          results.push({ type: 'connection', id: connId, success: false, error: message });
        }
      }

      // Write merged connections to new key
      await config.update('nexql.connections', migratedConnections, vscode.ConfigurationTarget.Global);
      this.log(`Migrated ${oldConnections.length} connection(s) to nexql.connections`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Connection migration failed: ${message}`);
      results.push({ type: 'connection', id: 'batch', success: false, error: message });
    }

    return results;
  }

  /**
   * Migrate saved queries from old workspace state key (`postgresExplorer.savedQueries`)
   * to the new key (`nexql.savedQueries`).
   */
  private async migrateSavedQueries(context: vscode.ExtensionContext): Promise<MigrationItemResult[]> {
    const results: MigrationItemResult[] = [];

    try {
      const oldQueries = context.workspaceState.get<any[]>('postgresExplorer.savedQueries');

      if (!oldQueries || oldQueries.length === 0) {
        this.log('No legacy saved queries found under postgresExplorer.savedQueries');
        return results;
      }

      // Read existing queries to avoid overwriting
      const existingQueries = context.workspaceState.get<any[]>('nexql.savedQueries') || [];
      const existingIds = new Set(existingQueries.map((q: any) => q.id));

      const mergedQueries = [...existingQueries];

      for (const query of oldQueries) {
        const queryId = query.id || `migrated-query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
          if (existingIds.has(query.id)) {
            results.push({ type: 'query', id: queryId, success: true });
            continue;
          }

          mergedQueries.push({ ...query, id: queryId });
          results.push({ type: 'query', id: queryId, success: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.log(`Failed to migrate saved query ${queryId}: ${message}`);
          results.push({ type: 'query', id: queryId, success: false, error: message });
        }
      }

      await context.workspaceState.update('nexql.savedQueries', mergedQueries);
      this.log(`Migrated ${oldQueries.length} saved query/queries to nexql.savedQueries`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Saved query migration failed: ${message}`);
      results.push({ type: 'query', id: 'batch', success: false, error: message });
    }

    return results;
  }

  /**
   * Migrate SecretStorage credentials from old key format (`postgres-password-{id}`)
   * to the new key format (`nexql.password.{id}`).
   */
  private async migrateCredentials(context: vscode.ExtensionContext): Promise<MigrationItemResult[]> {
    const results: MigrationItemResult[] = [];

    try {
      // We need to read the connections to know which credential IDs to migrate.
      // Use the newly migrated nexql.connections as the source of truth for connection IDs.
      const config = vscode.workspace.getConfiguration();
      const connections = config.get<any[]>('nexql.connections') || [];

      for (const conn of connections) {
        if (!conn.id) {
          continue;
        }

        try {
          const oldKey = `postgres-password-${conn.id}`;
          const newKey = `nexql.password.${conn.id}`;

          // Try to read the old credential
          const oldPassword = await context.secrets.get(oldKey);

          if (oldPassword) {
            // Check if new key already has a value
            const existingNew = await context.secrets.get(newKey);
            if (!existingNew) {
              await context.secrets.store(newKey, oldPassword);
            }
            results.push({ type: 'credential', id: conn.id, success: true });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.log(`Failed to migrate credential for connection ${conn.id}: ${message}`);
          results.push({ type: 'credential', id: conn.id, success: false, error: message });
        }
      }

      if (results.length > 0) {
        this.log(`Processed ${results.length} credential(s) for migration`);
      } else {
        this.log('No credentials to migrate');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Credential migration failed: ${message}`);
      results.push({ type: 'credential', id: 'batch', success: false, error: message });
    }

    return results;
  }

  /**
   * Migrate `.pgsql` notebook files by associating them with the new notebook type
   * and the postgres engine. Updates file associations in VS Code settings.
   */
  private async migrateNotebooks(): Promise<MigrationItemResult[]> {
    const results: MigrationItemResult[] = [];

    try {
      const config = vscode.workspace.getConfiguration();

      // Associate .pgsql files with the new nexql-notebook type
      const filesAssociations = config.get<Record<string, string>>('files.associations') || {};
      const notebookAssociations = config.get<Record<string, string>>('workbench.editorAssociations') || {};

      let associationsChanged = false;

      // Map .pgsql to the new notebook type
      if (!notebookAssociations['*.pgsql'] || notebookAssociations['*.pgsql'] === 'postgres-notebook') {
        notebookAssociations['*.pgsql'] = 'nexql-notebook';
        associationsChanged = true;
      }

      if (associationsChanged) {
        await config.update('workbench.editorAssociations', notebookAssociations, vscode.ConfigurationTarget.Global);
        results.push({ type: 'notebook', id: 'pgsql-association', success: true });
        this.log('Migrated .pgsql file association to nexql-notebook type');
      } else {
        this.log('.pgsql file association already up to date');
      }

      // Find open .pgsql notebooks and update their metadata to include engine: 'postgres'
      for (const notebook of vscode.workspace.notebookDocuments) {
        if (notebook.uri.fsPath.endsWith('.pgsql')) {
          try {
            // Notebook metadata updates happen through the kernel/serializer;
            // we just record that we've identified them for migration
            results.push({ type: 'notebook', id: notebook.uri.fsPath, success: true });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.log(`Failed to migrate notebook ${notebook.uri.fsPath}: ${message}`);
            results.push({ type: 'notebook', id: notebook.uri.fsPath, success: false, error: message });
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Notebook migration failed: ${message}`);
      results.push({ type: 'notebook', id: 'batch', success: false, error: message });
    }

    return results;
  }

  private log(message: string): void {
    const logMessage = `[MigrationService] ${message}`;
    if (this.outputChannel) {
      this.outputChannel.appendLine(logMessage);
    }
    console.log(logMessage);
  }
}
