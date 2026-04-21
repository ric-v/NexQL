import * as vscode from 'vscode';
import type { ProviderAPI } from '@nexql/core/core/api/ProviderAPI';
import { OracleDriver } from './driver';
import { OracleDialect } from './dialect';
import { OracleIntrospection } from './introspection';
import { oracleFeatureFlags } from './featureFlags';
import { OracleSqlTemplates } from './templates';
import { oracleConnectionFormFields } from './formFields';
import { OracleMonitoring } from './monitoring';
import { OracleTypeClassifier } from './typeClassifier';
import { OracleCompletionProvider } from './completionProvider';

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
  const output = vscode.window.createOutputChannel('NexQL - Oracle');
  context.subscriptions.push(output);
  output.appendLine('Activating NexQL - Oracle extension...');

  let api = await getCoreApi();
  if (!api) {
    output.appendLine('Core extension not found on first attempt, retrying in 1s...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    api = await getCoreApi();
  }

  if (!api || typeof api.registerEngine !== 'function') {
    const msg = 'NexQL - Oracle: Could not find the NexQL core extension (ric-v.nexql).';
    output.appendLine(msg);
    vscode.window.showErrorMessage(msg);
    return;
  }

  try {
    const driver = new OracleDriver();
    api.registerEngine({
      engine: 'oracle',
      displayName: 'Oracle Database',
      category: 'sql',
      driver,
      dialect: new OracleDialect(),
      introspection: new OracleIntrospection(),
      featureFlags: oracleFeatureFlags,
      sqlTemplates: new OracleSqlTemplates(),
      connectionFormFields: oracleConnectionFormFields,
      monitoringProvider: new OracleMonitoring(),
      typeClassifier: new OracleTypeClassifier(),
      completionProvider: new OracleCompletionProvider(),
    });
    output.appendLine('Oracle engine registered successfully.');

    context.subscriptions.push({
      dispose: () => {
        driver.closeAll().catch(() => {});
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    output.appendLine(`Failed to register Oracle engine: ${errMsg}`);
    vscode.window.showErrorMessage(`NexQL - Oracle: Registration failed: ${errMsg}`);
  }
}

export function deactivate() {
  // Cleanup handled by disposables registered in activate()
}
