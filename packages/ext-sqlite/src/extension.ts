import * as vscode from 'vscode';
import type { ProviderAPI } from '@nexql/core/core/api/ProviderAPI';
import { SqliteDriver } from './driver';
import { SqliteDialect } from './dialect';
import { SqliteIntrospection } from './introspection';
import { sqliteFeatureFlags } from './featureFlags';
import { SqliteSqlTemplates } from './templates';
import { sqliteConnectionFormFields } from './formFields';
import { SqliteTypeClassifier } from './typeClassifier';
import { SqliteTransactionSyntax } from './transactionSyntax';
import { SqliteCompletionProvider } from './completionProvider';
import { SqliteExplainPlanParser } from './explainPlanParser';
import { SqliteExplainNormalizer } from './explainNormalizer';

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
  const output = vscode.window.createOutputChannel('NexQL - SQLite');
  context.subscriptions.push(output);
  output.appendLine('Activating NexQL - SQLite extension...');

  let api = await getCoreApi();
  if (!api) {
    output.appendLine('Core extension not found on first attempt, retrying in 1s...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    api = await getCoreApi();
  }

  if (!api || typeof api.registerEngine !== 'function') {
    const msg = 'NexQL - SQLite: Could not find the NexQL core extension (ric-v.nexql).';
    output.appendLine(msg);
    vscode.window.showErrorMessage(msg);
    return;
  }

  try {
    const driver = new SqliteDriver();
    api.registerEngine({
      engine: 'sqlite',
      displayName: 'SQLite',
      category: 'sql',
      driver,
      dialect: new SqliteDialect(),
      introspection: new SqliteIntrospection(),
      featureFlags: sqliteFeatureFlags,
      sqlTemplates: new SqliteSqlTemplates(),
      connectionFormFields: sqliteConnectionFormFields,
      explainPlanParser: new SqliteExplainPlanParser(),
      explainNormalizer: new SqliteExplainNormalizer(),
      typeClassifier: new SqliteTypeClassifier(),
      completionProvider: new SqliteCompletionProvider(),
    });
    output.appendLine('SQLite engine registered successfully.');

    context.subscriptions.push({
      dispose: () => {
        driver.closeAll().catch(() => {});
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    output.appendLine(`Failed to register SQLite engine: ${errMsg}`);
    vscode.window.showErrorMessage(`NexQL - SQLite: Registration failed: ${errMsg}`);
  }
}

export function deactivate() {
  // Cleanup handled by disposables registered in activate()
}
