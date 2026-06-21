import * as vscode from 'vscode';
import { loadPanelTemplate } from '../../../lib/template-loader';
import { IndexStore } from '../IndexStore';
import { IndexBuilder } from '../IndexBuilder';
import { ConnectionUtils } from '../../../utils/connectionUtils';
import { ObjectEntry, JoinEdge, JoinGraph } from '../types';

export class DbIndexPanel {
  public static currentPanel: DbIndexPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _context: vscode.ExtensionContext;
  private readonly _store: IndexStore;
  private readonly _disposables: vscode.Disposable[] = [];

  public static async show(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DbIndexPanel.currentPanel) {
      DbIndexPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'dbIndexGrounding',
      '🔍 Database Index Grounding',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    DbIndexPanel.currentPanel = new DbIndexPanel(panel, extensionUri, context);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._context = context;
    this._store = new IndexStore(context.globalStorageUri);

    void this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'requestState':
            await this._postState();
            return;
          case 'updateConfig':
            await vscode.workspace.getConfiguration().update(
              'postgresExplorer.dbIndex.enableEmbeddings',
              message.enableEmbeddings,
              vscode.ConfigurationTarget.Global
            );
            return;
          case 'buildNew':
            await vscode.commands.executeCommand('postgres-explorer.dbindex.build');
            await this._postState();
            return;
          case 'rebuild':
            await this._handleRebuild(message.connectionId, message.database);
            return;
          case 'export':
            await this._handleExport(message.connectionId, message.database);
            return;
          case 'clear':
            await this._handleClear(message.connectionId, message.database);
            return;
          case 'requestDetails':
            await this._handleRequestDetails(message.connectionId, message.database);
            return;
          case 'saveOverrides':
            await this._handleSaveOverrides(message.connectionId, message.database, message.overrides);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    DbIndexPanel.currentPanel = undefined;
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
    this._panel.dispose();
  }

  private async _update() {
    this._panel.webview.html = await loadPanelTemplate(
      this._panel.webview,
      this._extensionUri,
      'dbindex',
      { PAGE_TITLE: 'Database Index Grounding' }
    );
  }

  private async _postState() {
    const config = vscode.workspace.getConfiguration();
    const enableEmbeddings = config.get<boolean>('postgresExplorer.dbIndex.enableEmbeddings', false);

    const connections: any[] = config.get<any[]>('postgresExplorer.connections') || [];
    const indexes: any[] = [];

    for (const conn of connections) {
      if (!conn.id) continue;
      // We check for databases indexed
      const dbList = conn.databases || [conn.database || 'postgres'];
      for (const database of dbList) {
        const baseDir = this._store.getBaseDir(conn.id, database);
        const manifest = await this._store.readManifest(baseDir);
        if (manifest) {
          // Check drift
          let drift = false;
          try {
            const { AutoRefreshService } = require('../../../services/AutoRefreshService');
            const activeFp = AutoRefreshService.getFingerprint?.(conn.id, database);
            if (activeFp && activeFp !== manifest.schemaFingerprint) {
              drift = true;
            }
          } catch {
            // ignore
          }

          indexes.push({
            connectionId: conn.id,
            connectionName: conn.name || 'Unnamed',
            database,
            indexedAt: manifest.indexedAt,
            tables: manifest.counts.tables,
            views: manifest.counts.views,
            functions: manifest.counts.functions,
            depth: manifest.buildDepth,
            schemas: manifest.scope.includedSchemas,
            piiCount: manifest.scope.piiExcludedColumns.length,
            drift,
          });
        }
      }
    }

    await this._panel.webview.postMessage({
      command: 'state',
      state: {
        enableEmbeddings,
        indexes,
      },
    });
  }

  private async _handleRebuild(connectionId: string, database: string) {
    const baseDir = this._store.getBaseDir(connectionId, database);
    const manifest = await this._store.readManifest(baseDir);
    if (!manifest) return;

    const builder = new IndexBuilder(this._store);
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Rebuilding Index: ${database}`,
        cancellable: true,
      },
      async (progress, token) => {
        try {
          await builder.build(
            connectionId,
            database,
            manifest.scope,
            manifest.buildDepth,
            manifest.buildMode,
            manifest.environment,
            token,
            progress
          );
          vscode.window.showInformationMessage(`Index rebuilt successfully for "${database}"!`);
          await this._postState();
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to rebuild index: ${err.message || err}`);
        }
      }
    );
  }

  private async _handleClear(connectionId: string, database: string) {
    const confirm = await vscode.window.showWarningMessage(
      `Delete local index for database "${database}"?`,
      'Delete'
    );
    if (confirm === 'Delete') {
      await this._store.clearIndex(connectionId, database);
      vscode.window.showInformationMessage(`Index deleted for "${database}".`);
      await this._postState();
    }
  }

  private async _handleExport(connectionId: string, database: string) {
    const baseDir = this._store.getBaseDir(connectionId, database);
    const manifest = await this._store.readManifest(baseDir);
    if (!manifest) {
      vscode.window.showErrorMessage('No index configuration found to export.');
      return;
    }

    const saveUri = await vscode.window.showSaveDialog({
      title: 'Export Schema Data Dictionary',
      saveLabel: 'Export',
      filters: { Markdown: ['md'] },
      defaultUri: vscode.Uri.file(`${database}_data_dictionary.md`),
    });

    if (!saveUri) return;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Compiling Data Dictionary...',
      },
      async () => {
        const mdParts: string[] = [
          `# Data Dictionary: ${database}`,
          `*Generated from PgStudio Local Index on ${new Date(manifest.indexedAt).toLocaleDateString()}*\n`,
          `## Overview`,
          `- **PG Version**: ${manifest.pgVersion}`,
          `- **Build Depth**: ${manifest.buildDepth}`,
          `- **Counts**: ${manifest.counts.tables} tables, ${manifest.counts.views} views, ${manifest.counts.functions} functions\n`,
        ];

        // Gather all schemas and objects
        for (const shard of manifest.shards) {
          mdParts.push(`## Schema: ${shard.schema}\n`);

          const shardUri = vscode.Uri.joinPath(baseDir, shard.file);
          try {
            const data = await vscode.workspace.fs.readFile(shardUri);
            const entries = JSON.parse(Buffer.from(data).toString('utf-8')) as Record<string, ObjectEntry>;
            
            for (const [ref, entry] of Object.entries(entries)) {
              mdParts.push(`### ${entry.kind.toUpperCase()}: ${ref}`);
              if (entry.comment) {
                mdParts.push(`*Description: ${entry.comment}*\n`);
              }

              if (entry.columns && entry.columns.length > 0) {
                mdParts.push('| Column | Type | Nullability | Default | Description |');
                mdParts.push('|--------|------|----------|---------|-------------|');
                for (const col of entry.columns) {
                  mdParts.push(`| ${col.name} | ${col.type} | ${col.notNull ? 'NO' : 'YES'} | ${col.default || '-'} | ${col.comment || '-'} |`);
                }
                mdParts.push('');
              }

              if (entry.definition) {
                mdParts.push('**Definition:**');
                mdParts.push('```sql');
                mdParts.push(entry.definition);
                mdParts.push('```\n');
              }
            }
          } catch {
            // skip shard fail
          }
        }

        await vscode.workspace.fs.writeFile(saveUri, Buffer.from(mdParts.join('\n'), 'utf-8'));
        vscode.window.showInformationMessage('Data Dictionary exported successfully.');
      }
    );
  }

  private async _handleRequestDetails(connectionId: string, database: string) {
    const baseDir = this._store.getBaseDir(connectionId, database);
    const manifest = await this._store.readManifest(baseDir);
    if (!manifest) {
      await this._panel.webview.postMessage({
        command: 'detailsError',
        error: 'Manifest not found.',
      });
      return;
    }

    try {
      const objects: any[] = [];
      const overrides = await this._store.readOverrides(baseDir) || {};

      for (const shard of manifest.shards) {
        const shardUri = vscode.Uri.joinPath(baseDir, shard.file);
        try {
          const data = await vscode.workspace.fs.readFile(shardUri);
          const entries = JSON.parse(Buffer.from(data).toString('utf-8')) as Record<string, ObjectEntry>;
          for (const [ref, entry] of Object.entries(entries)) {
            const objOverride = overrides.objects?.[ref];
            const columns = entry.columns.map(col => {
              const colOverride = objOverride?.columns?.[col.name];
              return {
                name: col.name,
                type: col.type,
                comment: colOverride?.comment !== undefined ? colOverride.comment : col.comment,
                pii: colOverride?.pii !== undefined ? colOverride.pii : false,
              };
            });

            objects.push({
              ref,
              kind: entry.kind,
              comment: objOverride?.comment !== undefined ? objOverride.comment : entry.comment,
              excluded: objOverride?.excluded !== undefined ? objOverride.excluded : false,
              columns,
            });
          }
        } catch {
          // ignore shard read failures
        }
      }

      // Read synonyms and joins
      const tokensIndex = await this._store.readTokens(baseDir, manifest);
      const minedSynonyms = tokensIndex?.synonyms || {};

      let baseJoins: JoinEdge[] = [];
      const jgUri = vscode.Uri.joinPath(baseDir, manifest.derived.joinGraph);
      try {
        const data = await vscode.workspace.fs.readFile(jgUri);
        const graph = JSON.parse(Buffer.from(data).toString('utf-8')) as JoinGraph;
        baseJoins = graph.edges;
      } catch {}

      await this._panel.webview.postMessage({
        command: 'details',
        connectionId,
        database,
        objects,
        minedSynonyms,
        baseJoins,
        overrides,
      });
    } catch (err: any) {
      await this._panel.webview.postMessage({
        command: 'detailsError',
        error: err.message || String(err),
      });
    }
  }

  private async _handleSaveOverrides(connectionId: string, database: string, overrides: any) {
    try {
      const baseDir = this._store.getBaseDir(connectionId, database);
      await this._store.writeOverrides(baseDir, overrides);
      vscode.window.showInformationMessage(`Overrides saved successfully for "${database}".`);
      
      // Post updated state and updated details
      await this._postState();
      await this._handleRequestDetails(connectionId, database);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to save overrides: ${err.message || err}`);
    }
  }
}
