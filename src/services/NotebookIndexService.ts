import * as vscode from 'vscode';
import * as path from 'path';

export interface NotebookInfo {
  uri: vscode.Uri;
  name: string;
  connectionId?: string;
  databaseName?: string;
  sectionCount: number;
  mtime: number;
}

export class NotebookIndexService {
  private static instance: NotebookIndexService;
  private cache: Map<string, NotebookInfo> = new Map(); // fsPath -> NotebookInfo
  private initialized = false;

  private constructor(private readonly globalStorageUri: vscode.Uri) {}

  public static initialize(globalStorageUri: vscode.Uri): NotebookIndexService {
    if (!NotebookIndexService.instance) {
      NotebookIndexService.instance = new NotebookIndexService(globalStorageUri);
    }
    return NotebookIndexService.instance;
  }

  public static getInstance(): NotebookIndexService {
    if (!NotebookIndexService.instance) {
      throw new Error('NotebookIndexService not initialized');
    }
    return NotebookIndexService.instance;
  }

  public async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.rebuildIndex();
    this.initialized = true;
  }

  public async rebuildIndex(): Promise<void> {
    const newCache = new Map<string, NotebookInfo>();
    await this.scanDir(this.globalStorageUri, newCache);
    this.cache = newCache;
  }

  private async scanDir(dirUri: vscode.Uri, newCache: Map<string, NotebookInfo>): Promise<void> {
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(dirUri);
    } catch {
      return;
    }

    for (const [name, type] of entries) {
      const childUri = vscode.Uri.joinPath(dirUri, name);
      if (type === vscode.FileType.Directory) {
        await this.scanDir(childUri, newCache);
      } else if (type === vscode.FileType.File && name.endsWith('.pgsql')) {
        const info = await this.readNotebookInfo(childUri);
        if (info) {
          newCache.set(childUri.fsPath, info);
        }
      }
    }
  }

  public async updateNotebook(uri: vscode.Uri): Promise<void> {
    try {
      const info = await this.readNotebookInfo(uri);
      if (info) {
        this.cache.set(uri.fsPath, info);
      } else {
        this.cache.delete(uri.fsPath);
      }
    } catch {
      this.cache.delete(uri.fsPath);
    }
  }

  public removeNotebook(uri: vscode.Uri): void {
    this.cache.delete(uri.fsPath);
  }

  private async readNotebookInfo(uri: vscode.Uri): Promise<NotebookInfo | undefined> {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      const raw = await vscode.workspace.fs.readFile(uri);
      const contentStr = Buffer.from(raw).toString();
      let connectionId: string | undefined;
      let databaseName: string | undefined;
      let sectionCount = 0;

      try {
        const data = JSON.parse(contentStr);
        if (data.metadata) {
          connectionId = data.metadata.connectionId;
          databaseName = data.metadata.databaseName || data.metadata.database;
        }
        if (Array.isArray(data.cells)) {
          sectionCount = data.cells.filter((c: { kind?: string; value?: string }) =>
            c.kind === 'markdown' && /^#{1,3}\s/.test(c.value ?? ''),
          ).length;
        }
      } catch {
        // Not a JSON notebook or malformed
      }

      // If connectionId/databaseName are not present in JSON, try to infer from path
      if (!connectionId) {
        const relative = path.relative(this.globalStorageUri.fsPath, uri.fsPath);
        const parts = relative.split(path.sep);
        if (parts.length >= 3) {
          const connections = vscode.workspace.getConfiguration().get<any[]>('postgresExplorer.connections') || [];
          const matchedConn = connections.find(c => {
            const safeName = (c.name || c.id).replace(/[^a-zA-Z0-9_-]/g, '_');
            return safeName === parts[0];
          });
          if (matchedConn) {
            connectionId = matchedConn.id;
            databaseName = parts[1];
          }
        }
      }

      return {
        uri,
        name: path.basename(uri.fsPath, '.pgsql'),
        connectionId,
        databaseName,
        sectionCount,
        mtime: stat.mtime
      };
    } catch {
      return undefined;
    }
  }

  public getNotebooksForConnection(connectionId: string): NotebookInfo[] {
    const list: NotebookInfo[] = [];
    for (const info of this.cache.values()) {
      if (info.connectionId === connectionId) {
        list.push(info);
      }
    }
    return list;
  }

  public getAllNotebooks(): NotebookInfo[] {
    return Array.from(this.cache.values());
  }
}
