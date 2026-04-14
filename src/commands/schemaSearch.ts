import * as vscode from 'vscode';
import { ConnectionManager } from '../services/ConnectionManager';
import { NotebookBuilder, MarkdownUtils } from './helper';
import { getConnectionWithPassword } from './connection';

interface SearchRow {
  type: string;
  schema: string;
  name: string;
  definition: string | null;
}

const TYPE_ICONS: Record<string, string> = {
  table: '$(table)',
  view: '$(eye)',
  function: '$(symbol-method)',
  sequence: '$(list-ordered)',
  trigger: '$(zap)',
  domain: '$(symbol-namespace)',
  aggregate: '$(symbol-operator)',
  'materialized-view': '$(symbol-structure)',
};

export async function cmdSearchSchema() {
  const connections = vscode.workspace.getConfiguration().get<any[]>('postgresExplorer.connections') || [];
  if (connections.length === 0) {
    vscode.window.showInformationMessage('No connections configured. Please add a PostgreSQL connection first.');
    return;
  }

  // Ask user to pick a connection if multiple
  let selectedConn = connections[0];
  if (connections.length > 1) {
    const picked = await vscode.window.showQuickPick(
      connections.map(c => ({
        label: c.name || `${c.host}:${c.port}`,
        description: `${c.host}:${c.port}/${c.database}`,
        connection: c
      })),
      { placeHolder: 'Select connection to search' }
    );
    if (!picked) { return; }
    selectedConn = picked.connection;
  }

  const qp = vscode.window.createQuickPick();
  qp.placeholder = 'Search schema objects... (tables, views, functions, triggers, sequences, domains...)';
  qp.matchOnDescription = true;
  qp.matchOnDetail = true;
  qp.busy = true;
  qp.show();

  let client: any;
  try {
    const connection = await getConnectionWithPassword(selectedConn.id, selectedConn.database);
    client = await ConnectionManager.getInstance().getPooledClient({
      id: connection.id,
      host: connection.host,
      port: connection.port,
      username: connection.username,
      database: selectedConn.database || connection.database,
      name: connection.name
    });

    const searchQuery = `
      SELECT 'table' AS type, table_schema AS schema, table_name AS name, NULL::text AS definition
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE'
      UNION ALL
      SELECT 'view', table_schema, table_name, view_definition
      FROM information_schema.views
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      UNION ALL
      SELECT 'function', routine_schema, routine_name, routine_definition
      FROM information_schema.routines
      WHERE routine_schema NOT IN ('pg_catalog', 'information_schema') AND routine_type = 'FUNCTION'
      UNION ALL
      SELECT 'sequence', schemaname, sequencename, NULL::text
      FROM pg_sequences
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      UNION ALL
      SELECT DISTINCT 'trigger', trigger_schema, trigger_name, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema')
      UNION ALL
      SELECT 'domain', n.nspname, t.typname, format_type(t.typbasetype, t.typtypmod)
      FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typtype = 'd' AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      UNION ALL
      SELECT 'aggregate', n.nspname, p.proname, pg_get_function_arguments(p.oid)
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.prokind = 'a' AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      UNION ALL
      SELECT 'materialized-view', schemaname, matviewname, definition
      FROM pg_matviews
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY type, schema, name
    `;

    const result = await client.query(searchQuery);

    const items = result.rows.map((row: SearchRow) => ({
      label: `${TYPE_ICONS[row.type] || '$(symbol-misc)'}  ${row.name}`,
      description: `${row.schema}  ·  ${row.type}`,
      detail: row.definition
        ? row.definition.slice(0, 120).replace(/\s+/g, ' ').trim()
        : undefined,
      row,
    }));

    qp.items = items;
    qp.busy = false;

    qp.onDidAccept(async () => {
      const selected = qp.selectedItems[0] as any;
      qp.hide();
      if (!selected?.row) { return; }

      const { row } = selected;

      const metadata = {
        connectionId: connection.id,
        databaseName: selectedConn.database || connection.database,
        host: connection.host,
        port: connection.port,
        username: connection.username,
        name: connection.name,
      };

      let sql = '';
      switch (row.type) {
        case 'table':
          sql = `-- Table structure: ${row.schema}.${row.name}
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = '${row.schema}' AND table_name = '${row.name}'
ORDER BY ordinal_position;`;
          break;
        case 'view':
          sql = `-- View definition: ${row.schema}.${row.name}
SELECT pg_get_viewdef('"${row.schema}"."${row.name}"'::regclass, true) AS definition;`;
          break;
        case 'materialized-view':
          sql = `-- Materialized view definition: ${row.schema}.${row.name}
SELECT definition FROM pg_matviews WHERE schemaname = '${row.schema}' AND matviewname = '${row.name}';`;
          break;
        case 'function':
          sql = `-- Function source: ${row.schema}.${row.name}
SELECT pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = '${row.schema}' AND p.proname = '${row.name}';`;
          break;
        case 'sequence':
          sql = `-- Sequence properties: ${row.schema}.${row.name}
SELECT * FROM pg_sequences WHERE schemaname = '${row.schema}' AND sequencename = '${row.name}';`;
          break;
        case 'trigger':
          sql = `-- Trigger definition: ${row.schema}.${row.name}
SELECT pg_get_triggerdef(t.oid, true) AS definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = '${row.schema}' AND t.tgname = '${row.name}';`;
          break;
        case 'domain':
          sql = `-- Domain definition: ${row.schema}.${row.name}
SELECT t.typname, format_type(t.typbasetype, t.typtypmod) AS base_type,
       t.typnotnull, pg_get_expr(t.typdefaultbin, 0) AS default_value,
       c.conname, pg_get_constraintdef(c.oid) AS constraint
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
LEFT JOIN pg_constraint c ON c.contypid = t.oid
WHERE t.typtype = 'd' AND n.nspname = '${row.schema}' AND t.typname = '${row.name}';`;
          break;
        case 'aggregate':
          sql = `-- Aggregate definition: ${row.schema}.${row.name}
SELECT p.proname, pg_get_function_arguments(p.oid) AS arguments,
       format_type(p.prorettype, NULL) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prokind = 'a' AND n.nspname = '${row.schema}' AND p.proname = '${row.name}';`;
          break;
        default:
          sql = `SELECT '${row.name}' AS object_name, '${row.type}' AS object_type, '${row.schema}' AS schema;`;
      }

      await new NotebookBuilder(metadata as any)
        .addMarkdown(
          MarkdownUtils.header(`${row.type}: ${row.schema}.${row.name}`) +
          MarkdownUtils.infoBox(`Object type: ${row.type} | Schema: ${row.schema}`)
        )
        .addSql(sql)
        .show();
    });

    qp.onDidHide(() => {
      qp.dispose();
    });

  } catch (err: any) {
    qp.busy = false;
    qp.hide();
    qp.dispose();
    vscode.window.showErrorMessage(`Schema search failed: ${err.message}`);
  } finally {
    if (client) {
      try { client.release(); } catch { /* ignore */ }
    }
  }
}
