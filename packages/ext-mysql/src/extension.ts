import * as vscode from 'vscode';
import type { ProviderAPI } from '@nexql/core/core/api/ProviderAPI';
import { MysqlDriver } from './driver';
import { MysqlDialect } from './dialect';
import { MysqlIntrospection } from './introspection';
import { mysqlFeatureFlags } from './featureFlags';
import { MysqlSqlTemplates } from './templates';
import { mysqlConnectionFormFields } from './formFields';
import { MysqlMonitoring } from './monitoring';
import { MysqlTypeClassifier } from './typeClassifier';
import { MysqlTransactionSyntax } from './transactionSyntax';
import { MysqlCompletionProvider } from './completionProvider';
import { MysqlExplainPlanParser } from './explainPlanParser';
import { MysqlExplainNormalizer } from './explainNormalizer';

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
  const output = vscode.window.createOutputChannel('NexQL - MySQL');
  context.subscriptions.push(output);
  output.appendLine('Activating NexQL - MySQL extension...');

  let api = await getCoreApi();
  if (!api) {
    output.appendLine('Core extension not found on first attempt, retrying in 1s...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    api = await getCoreApi();
  }

  if (!api || typeof api.registerEngine !== 'function') {
    const msg = 'NexQL - MySQL: Could not find the NexQL core extension (ric-v.nexql).';
    output.appendLine(msg);
    vscode.window.showErrorMessage(msg);
    return;
  }

  try {
    const driver = new MysqlDriver();
    api.registerEngine({
      engine: 'mysql',
      displayName: 'MySQL',
      category: 'sql',
      driver,
      dialect: new MysqlDialect(),
      introspection: new MysqlIntrospection(),
      featureFlags: mysqlFeatureFlags,
      sqlTemplates: new MysqlSqlTemplates(),
      connectionFormFields: mysqlConnectionFormFields,
      monitoringProvider: new MysqlMonitoring(),
      explainPlanParser: new MysqlExplainPlanParser(),
      explainNormalizer: new MysqlExplainNormalizer(),
      typeClassifier: new MysqlTypeClassifier(),
      completionProvider: new MysqlCompletionProvider(),
    });
    output.appendLine('MySQL engine registered successfully.');

    context.subscriptions.push({
      dispose: () => {
        driver.closeAll().catch(() => {});
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    output.appendLine(`Failed to register MySQL engine: ${errMsg}`);
    vscode.window.showErrorMessage(`NexQL - MySQL: Registration failed: ${errMsg}`);
  }
}

export function deactivate() {
  // Cleanup handled by disposables registered in activate()
}
