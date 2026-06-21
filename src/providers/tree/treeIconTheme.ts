import * as vscode from 'vscode';

/** Centralized tree icon + color palette for database and notebook trees. */
export type DatabaseTreeIconType =
  | 'connection'
  | 'database'
  | 'databases-group'
  | 'system-databases-group'
  | 'favorites-group'
  | 'recent-group'
  | 'schema'
  | 'table'
  | 'view'
  | 'function'
  | 'procedure'
  | 'column'
  | 'category'
  | 'materialized-view'
  | 'type'
  | 'foreign-table'
  | 'extension'
  | 'role'
  | 'constraint'
  | 'index'
  | 'foreign-data-wrapper'
  | 'foreign-server'
  | 'user-mapping'
  | 'connection-group'
  | 'trigger'
  | 'sequence'
  | 'partition'
  | 'domain'
  | 'aggregate'
  | 'event-trigger'
  | 'rule'
  | 'tablespace'
  | 'publication'
  | 'subscription'
  | 'cron-job'
  | 'policy'
  | 'sponsor-badge'
  | 'team-badge';

export type NotebookTreeIconType =
  | 'folder'
  | 'notebook-file'
  | 'shared-team-root'
  | 'workspace-folder'
  | 'shared-notebook-file';

const ACCENT = new vscode.ThemeColor('postgres.accent');
const ENV_PROD = new vscode.ThemeColor('postgres.envProd');
const ENV_STAGING = new vscode.ThemeColor('postgres.envStaging');
const ENV_DEV = new vscode.ThemeColor('postgres.envDev');

const CHART = {
  blue: new vscode.ThemeColor('charts.blue'),
  purple: new vscode.ThemeColor('charts.purple'),
  green: new vscode.ThemeColor('charts.green'),
  yellow: new vscode.ThemeColor('charts.yellow'),
  orange: new vscode.ThemeColor('charts.orange'),
  red: new vscode.ThemeColor('charts.red'),
  gray: new vscode.ThemeColor('charts.gray'),
} as const;

export interface DatabaseTreeIconOptions {
  isDisconnected?: boolean;
  isInstalled?: boolean;
}

export function getDatabaseTreeIcon(
  type: DatabaseTreeIconType,
  options: DatabaseTreeIconOptions = {},
): vscode.ThemeIcon | undefined {
  const { isDisconnected, isInstalled } = options;
  const map: Record<DatabaseTreeIconType, vscode.ThemeIcon> = {
    connection: new vscode.ThemeIcon(
      'plug',
      isDisconnected ? new vscode.ThemeColor('disabledForeground') : ACCENT,
    ),
    database: new vscode.ThemeIcon('database', CHART.purple),
    'databases-group': new vscode.ThemeIcon('database', CHART.purple),
    'system-databases-group': new vscode.ThemeIcon('folder-library', CHART.gray),
    'favorites-group': new vscode.ThemeIcon('star-full', CHART.yellow),
    'recent-group': new vscode.ThemeIcon('history', CHART.green),
    schema: new vscode.ThemeIcon('symbol-namespace', CHART.yellow),
    table: new vscode.ThemeIcon('table', CHART.blue),
    view: new vscode.ThemeIcon('eye', CHART.green),
    function: new vscode.ThemeIcon('symbol-method', CHART.orange),
    procedure: new vscode.ThemeIcon('symbol-method', CHART.red),
    column: new vscode.ThemeIcon('symbol-field', CHART.blue),
    category: new vscode.ThemeIcon('list-tree'),
    'materialized-view': new vscode.ThemeIcon('symbol-structure', CHART.green),
    type: new vscode.ThemeIcon('symbol-type-parameter', CHART.red),
    'foreign-table': new vscode.ThemeIcon('symbol-interface', CHART.blue),
    extension: new vscode.ThemeIcon(
      isInstalled ? 'extensions-installed' : 'extensions',
      isInstalled ? CHART.green : undefined,
    ),
    role: new vscode.ThemeIcon('person', CHART.yellow),
    constraint: new vscode.ThemeIcon('lock', CHART.orange),
    index: new vscode.ThemeIcon('search', CHART.purple),
    'foreign-data-wrapper': new vscode.ThemeIcon('extensions', CHART.blue),
    'foreign-server': new vscode.ThemeIcon('server', CHART.green),
    'user-mapping': new vscode.ThemeIcon('account', CHART.yellow),
    'connection-group': new vscode.ThemeIcon('folder', ACCENT),
    trigger: new vscode.ThemeIcon('zap', CHART.orange),
    sequence: new vscode.ThemeIcon('list-ordered', CHART.blue),
    partition: new vscode.ThemeIcon('symbol-array', CHART.purple),
    domain: new vscode.ThemeIcon('symbol-namespace', CHART.red),
    aggregate: new vscode.ThemeIcon('symbol-operator', CHART.green),
    'event-trigger': new vscode.ThemeIcon('broadcast', CHART.orange),
    rule: new vscode.ThemeIcon('law', CHART.yellow),
    tablespace: new vscode.ThemeIcon('folder-library', CHART.blue),
    publication: new vscode.ThemeIcon('rss', CHART.green),
    subscription: new vscode.ThemeIcon('inbox', CHART.purple),
    'cron-job': new vscode.ThemeIcon('clock', CHART.orange),
    policy: new vscode.ThemeIcon('shield', CHART.green),
    'sponsor-badge': new vscode.ThemeIcon('heart', CHART.green),
    'team-badge': new vscode.ThemeIcon('verified', CHART.purple),
  };
  return map[type];
}

export function getNotebookTreeIcon(
  itemType: NotebookTreeIconType,
  folderDepth = 0,
): vscode.ThemeIcon {
  switch (itemType) {
    case 'folder':
      if (folderDepth === 1) {
        return new vscode.ThemeIcon('server', ACCENT);
      }
      if (folderDepth === 2) {
        return new vscode.ThemeIcon('database', CHART.purple);
      }
      return new vscode.ThemeIcon('folder');
    case 'notebook-file':
      return new vscode.ThemeIcon('notebook', CHART.yellow);
    case 'shared-team-root':
      return new vscode.ThemeIcon('organization', ACCENT);
    case 'workspace-folder':
      return new vscode.ThemeIcon('folder-library');
    case 'shared-notebook-file':
      return new vscode.ThemeIcon('notebook', CHART.orange);
    default:
      return new vscode.ThemeIcon('file');
  }
}

/** Environment badge text for connection tree descriptions. */
export function formatConnectionEnvBadge(
  environment?: 'production' | 'staging' | 'development',
  readOnlyMode?: boolean,
): string | undefined {
  const badges: string[] = [];
  if (environment === 'production') {
    badges.push('🔴 PROD');
  } else if (environment === 'staging') {
    badges.push('🟡 STAGING');
  } else if (environment === 'development') {
    badges.push('🟢 DEV');
  }
  if (readOnlyMode) {
    badges.push('🔒');
  }
  return badges.length > 0 ? badges.join(' ') : undefined;
}

/** ThemeColor ids for environment (for future programmatic use). */
export const TREE_ENV_COLORS = {
  production: ENV_PROD,
  staging: ENV_STAGING,
  development: ENV_DEV,
} as const;
