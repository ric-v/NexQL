import * as vscode from 'vscode';
import type { SettingsHubHostContext, SettingsHubMessage, SettingsSectionHandler } from '../types';
import { IndexStore } from '../../dbindex/IndexStore';
import { getDbIndexesState, handleRebuildIndex, handleClearIndex, handleExportIndex } from '../../dbindex/panel/indexActions';

export class DbIndexSectionHandler implements SettingsSectionHandler {
  readonly section = 'dbindex';
  private readonly store: IndexStore;

  constructor(private readonly host: SettingsHubHostContext) {
    this.store = new IndexStore(this.host.extensionContext.globalStorageUri);
  }

  async handle(action: string, message: SettingsHubMessage): Promise<void> {
    try {
      switch (action) {
        case 'load':
          await this.sendState();
          break;
        case 'build':
          await vscode.commands.executeCommand('postgres-explorer.dbindex.build');
          await this.sendState();
          break;
        case 'rebuild': {
          const connectionId = String(message.connectionId || '');
          const database = String(message.database || '');
          await handleRebuildIndex(this.store, connectionId, database, () => this.sendState());
          break;
        }
        case 'clear': {
          const connectionId = String(message.connectionId || '');
          const database = String(message.database || '');
          await handleClearIndex(this.store, connectionId, database, () => this.sendState());
          break;
        }
        case 'export': {
          const connectionId = String(message.connectionId || '');
          const database = String(message.database || '');
          await handleExportIndex(this.store, connectionId, database);
          break;
        }
        case 'curate':
          await vscode.commands.executeCommand('postgres-explorer.dbindex.openPanel');
          break;
        case 'setEmbeddings':
          await vscode.workspace.getConfiguration().update(
            'postgresExplorer.dbIndex.enableEmbeddings',
            !!message.enableEmbeddings,
            vscode.ConfigurationTarget.Global
          );
          await this.sendState();
          break;
        default:
          this.host.post({ type: 'dbindex/error', error: `Unknown action: ${action}` });
      }
    } catch (err: any) {
      this.host.post({
        type: 'dbindex/error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async sendState(): Promise<void> {
    const state = await getDbIndexesState(this.store);
    this.host.post({
      type: 'dbindex/state',
      state,
    });
  }
}
