import * as vscode from 'vscode';
import { DatabaseTreeItem } from '../../providers/DatabaseTreeProvider';
import { CommandBase } from '../../common/commands/CommandBase';
import { NotebookBuilder, MarkdownUtils } from '../helper';
import { TableSQL } from '../sql';
import { cmdInsertTable, cmdUpdateTable, cmdEditTable } from './operations';
import { DriverRegistry } from '../../core/db/registry';
import { resolveDbEngine, DEFAULT_DB_ENGINE } from '../../core/db/DbEngine';

/**
 * Resolves the SqlTemplateProvider for the active connection's engine.
 * Falls back to the static TableSQL templates if no provider is registered.
 */
function getTemplateMethod(item: DatabaseTreeItem, method: string): ((...args: any[]) => string) | undefined {
  const engine = resolveDbEngine((item as any).engine || DEFAULT_DB_ENGINE);
  const registry = DriverRegistry.getInstance();
  if (registry.isRegistered(engine)) {
    const provider = registry.getSqlTemplates(engine);
    if (provider && typeof (provider as any)[method] === 'function') {
      return (provider as any)[method].bind(provider);
    }
  }
  return undefined;
}

export async function cmdScriptSelect(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  await CommandBase.run(context, item, 'create SELECT script', async (conn, client, metadata) => {
    const templateFn = getTemplateMethod(item, 'selectAll');
    const sql = templateFn
      ? templateFn(item.schema!, item.label)
      : TableSQL.select(item.schema!, item.label);

    await new NotebookBuilder(metadata)
      .addMarkdown(
        MarkdownUtils.header(`📖 SELECT Script: \`${item.schema}.${item.label}\``) +
        MarkdownUtils.infoBox('Execute the query below to retrieve data from the table.')
      )
      .addSql(sql)
      .show();
  });
}

export async function cmdScriptInsert(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  await cmdInsertTable(item, context);
}

export async function cmdScriptUpdate(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  await cmdUpdateTable(item, context);
}

export async function cmdScriptDelete(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  const templateFn = getTemplateMethod(item, 'delete');
  if (templateFn === undefined && !TableSQL.delete) {
    vscode.window.showInformationMessage('DELETE script generation is not available for this engine.');
    return;
  }

  await CommandBase.run(context, item, 'create DELETE script', async (conn, client, metadata) => {
    const sql = templateFn
      ? templateFn(item.schema!, item.label)
      : TableSQL.delete(item.schema!, item.label);

    await new NotebookBuilder(metadata)
      .addMarkdown(
        MarkdownUtils.header(`🗑️ DELETE Script: \`${item.schema}.${item.label}\``) +
        MarkdownUtils.warningBox('This will delete rows from the table. Always use a WHERE clause!')
      )
      .addSql(sql)
      .show();
  });
}

export async function cmdScriptCreate(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  await cmdEditTable(item, context);
}
