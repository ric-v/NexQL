import * as vscode from 'vscode';
import type { ProviderAPI } from '@nexql/core/core/api/ProviderAPI';
import { MssqlDriver } from './driver';
import { MssqlDialect } from './dialect';
import { MssqlIntrospection } from './introspection';
import { mssqlFeatureFlags } from './featureFlags';
import { MssqlSqlTemplates } from './templates';
import { mssqlConnectionFormFields } from './formFields';
import { MssqlMonitoring } from './monitoring';
import { MssqlTypeClassifier } from './typeClassifier';
import { MssqlCompletionProvider } from './completionProvider';

const CORE_EXTENSION_ID = 'ric-v.nexql';

async function getCoreApi(): Promise<ProviderAPI | undefined> {
  let coreExt = vscode.extensions.getExtension<ProviderAPI>(CORE_EXTENSION_ID);
  if (!coreExt) {
    coreExt = vscode.extensions.getExtension<ProviderAPI>('nexql');
  }
  if (!coreExt) {
    for (const ext of vscode.extensions.all) {
      if (ext.id.endsWith('.nexql') || ext.id === 'nexql') {
        coreExt = ext as vscode.Extension<ProviderAPI>;
        break;
      }
    }
  }
  if (!coreExt) {
    return undefined;
  }
  return coreExt.isActive ? coreExt.exports : coreExt.activate();
}

export async function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('NexQL - MSSQL');
  context.subscriptions.push(output);
  output.appendLine('Activating NexQL - MSSQL extension...');

  let api = await getCoreApi();
  if (!api) {
    output.appendLine('Core extension not found on first attempt, retrying in 1s...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    api = await getCoreApi();
  }

  if (!api || typeof api.registerEngine !== 'function') {
    const msg = 'NexQL - MSSQL: Could not find the NexQL core extension (ric-v.nexql).';
    output.appendLine(msg);
    vscode.window.showErrorMessage(msg);
    return;
  }

  try {
    const driver = new MssqlDriver();
    api.registerEngine({
      engine: 'mssql',
      displayName: 'Microsoft SQL Server',
      category: 'sql',
      driver,
      dialect: new MssqlDialect(),
      introspection: new MssqlIntrospection(),
      featureFlags: mssqlFeatureFlags,
      sqlTemplates: new MssqlSqlTemplates(),
      connectionFormFields: mssqlConnectionFormFields,
      monitoringProvider: new MssqlMonitoring(),
      typeClassifier: new MssqlTypeClassifier(),
      completionProvider: new MssqlCompletionProvider(),
    });
    output.appendLine('MSSQL engine registered successfully.');

    context.subscriptions.push({
      dispose: () => {
        driver.closeAll().catch(() => {});
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    output.appendLine(`Failed to register MSSQL engine: ${errMsg}`);
    vscode.window.showErrorMessage(`NexQL - MSSQL: Registration failed: ${errMsg}`);
  }
}

export function deactivate() {
  // Cleanup handled by disposables registered in activate()
}
