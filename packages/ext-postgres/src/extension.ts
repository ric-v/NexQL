import * as vscode from 'vscode';
import { PostgresDriver } from './driver';
import { PostgresDialect } from './dialect';
import { PostgresIntrospection } from './introspection';
import { postgresFeatureFlags } from './featureFlags';
import { PostgresSqlTemplates } from './templates';
import { PostgresMonitoring } from './monitoring';
import { postgresConnectionFormFields } from './formFields';
import { PostgresDdlProvider } from './ddlProvider';
import { PostgresMigrationGenerator } from './migrationGenerator';
import { PostgresExplainPlanParser } from './explainPlanParser';
import { PostgresExplainNormalizer } from './explainNormalizer';
import { PostgresTypeClassifier } from './typeClassifier';
import { PostgresTransactionSyntax } from './transactionSyntax';
import { PostgresCompletionProvider } from './completionProvider';
import { PostgresIndexAdvisor } from './indexAdvisor';

const CORE_EXTENSION_ID = 'ric-v.nexql';

interface ProviderAPI {
  registerEngine(registration: any): void;
  unregisterEngine(engine: string): void;
  getRegisteredEngines(): string[];
  onDidChangeEngines: vscode.Event<any>;
}

async function getCoreApi(): Promise<ProviderAPI | undefined> {
  // Try the exact ID first
  let coreExt = vscode.extensions.getExtension<ProviderAPI>(CORE_EXTENSION_ID);

  // In dev host, the ID might just be the package name without publisher
  if (!coreExt) {
    coreExt = vscode.extensions.getExtension<ProviderAPI>('nexql');
  }

  if (!coreExt) {
    // Search all extensions for one that looks like the core
    const allExts = vscode.extensions.all;
    for (const ext of allExts) {
      if (ext.id.endsWith('.nexql') || ext.id === 'nexql') {
        coreExt = ext as vscode.Extension<ProviderAPI>;
        break;
      }
    }
  }

  if (!coreExt) {
    return undefined;
  }

  if (coreExt.isActive) {
    return coreExt.exports;
  }

  return coreExt.activate();
}

export async function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('NexQL - PostgreSQL');
  output.appendLine('Activating NexQL - PostgreSQL extension...');

  let api = await getCoreApi();

  // Retry once after a short delay (dev host timing issue)
  if (!api) {
    output.appendLine('Core extension not found on first attempt, retrying in 1s...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    api = await getCoreApi();
  }

  if (!api || typeof api.registerEngine !== 'function') {
    const msg = 'NexQL - PostgreSQL: Could not find the NexQL core extension (ric-v.nexql). Please install it.';
    output.appendLine(msg);
    vscode.window.showErrorMessage(msg);
    return;
  }

  output.appendLine('Core extension found, registering PostgreSQL engine...');

  const driver = new PostgresDriver();

  try {
    api.registerEngine({
      engine: 'postgres',
      displayName: 'PostgreSQL',
      category: 'sql',
      driver,
      dialect: new PostgresDialect(),
      introspection: new PostgresIntrospection(),
      featureFlags: postgresFeatureFlags,
      sqlTemplates: new PostgresSqlTemplates(),
      connectionFormFields: postgresConnectionFormFields,
      monitoringProvider: new PostgresMonitoring(),
      ddlProvider: new PostgresDdlProvider(),
      migrationGenerator: new PostgresMigrationGenerator(),
      explainPlanParser: new PostgresExplainPlanParser(),
      explainNormalizer: new PostgresExplainNormalizer(),
      typeClassifier: new PostgresTypeClassifier(),
      completionProvider: new PostgresCompletionProvider(),
      indexAdvisor: new PostgresIndexAdvisor(),
    });

    output.appendLine('PostgreSQL engine registered successfully.');
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    output.appendLine(`Failed to register PostgreSQL engine: ${errMsg}`);
    vscode.window.showErrorMessage(`NexQL - PostgreSQL: Registration failed: ${errMsg}`);
  }

  context.subscriptions.push({
    dispose: () => {
      driver.closeAll().catch(() => {});
      output.dispose();
    },
  });
}

export function deactivate() {
  // Cleanup handled by disposables registered in activate()
}
