import * as vscode from 'vscode';
import { IndexStore } from '../../../features/dbindex/IndexStore';
import { IndexQueryService } from '../../../features/dbindex/IndexQueryService';
import { findShortestJoinPath } from '../../../features/dbindex/joinPath';
import { ConnectionManager } from '../../../services/ConnectionManager';
import { ConnectionUtils } from '../../../utils/connectionUtils';
import { debugLog } from '../../../common/logger';

export class ToolExecutor {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly connectionId: string,
    private readonly databaseName: string
  ) {}

  private quoteIdentifier(ident: string): string {
    return `"${ident.replace(/"/g, '""')}"`;
  }

  private quoteRef(ref: string): string {
    const parts = ref.split('.');
    if (parts.length === 2) {
      return `${this.quoteIdentifier(parts[0])}.${this.quoteIdentifier(parts[1])}`;
    }
    return this.quoteIdentifier(ref);
  }

  async executeTool(name: string, args: any): Promise<string> {
    debugLog(`[ToolExecutor] Executing tool ${name} with args:`, JSON.stringify(args));
    try {
      switch (name) {
        case 'search_schema':
          return await this.searchSchema(args.query);
        case 'describe_object':
          return await this.describeObject(args.ref);
        case 'get_join_path':
          return await this.getJoinPath(args.a, args.b);
        case 'sample_values':
          return await this.sampleValues(args.ref, args.col);
        case 'run_select':
          return await this.runSelect(args.sql);
        case 'explain_query':
          return await this.explainQuery(args.sql);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (err: any) {
      debugLog(`[ToolExecutor] Error executing tool ${name}:`, err.message || err);
      return JSON.stringify({ error: err.message || String(err) });
    }
  }

  private async searchSchema(query: string): Promise<string> {
    if (!query || !query.trim()) {
      return JSON.stringify([]);
    }
    const store = new IndexStore(this.context.globalStorageUri);
    const queryService = new IndexQueryService(store);
    const hits = await queryService.search(this.connectionId, this.databaseName, query, 10);
    return JSON.stringify(hits, null, 2);
  }

  private async describeObject(ref: string): Promise<string> {
    if (!ref) {
      throw new Error('Ref parameter is required');
    }
    const store = new IndexStore(this.context.globalStorageUri);
    const queryService = new IndexQueryService(store);
    const entry = await queryService.describe(this.connectionId, this.databaseName, ref);
    if (!entry) {
      return JSON.stringify({ error: `Object "${ref}" not found in index.` });
    }
    return JSON.stringify(entry, null, 2);
  }

  private async getJoinPath(a: string, b: string): Promise<string> {
    if (!a || !b) {
      throw new Error('Parameters "a" and "b" are required');
    }
    const store = new IndexStore(this.context.globalStorageUri);
    const baseDir = store.getBaseDir(this.connectionId, this.databaseName);
    const manifest = await store.readManifest(baseDir);
    if (!manifest) {
      throw new Error(`Index manifest not found for database "${this.databaseName}"`);
    }
    const joinGraph = await store.readJoinGraph(baseDir, manifest);
    if (!joinGraph) {
      throw new Error(`Join graph not found for database "${this.databaseName}"`);
    }
    const path = findShortestJoinPath(a, b, joinGraph);
    if (!path) {
      return JSON.stringify({ message: `No join path found between "${a}" and "${b}" within 3 hops.` });
    }
    return JSON.stringify(path, null, 2);
  }

  private async sampleValues(ref: string, col: string): Promise<string> {
    if (!ref || !col) {
      throw new Error('Parameters "ref" and "col" are required');
    }
    const connConfig = ConnectionUtils.findConnection(this.connectionId);
    if (!connConfig) {
      throw new Error(`Database connection not found for connectionId: ${this.connectionId}`);
    }

    const store = new IndexStore(this.context.globalStorageUri);
    const baseDir = store.getBaseDir(this.connectionId, this.databaseName);
    const overrides = await store.readOverrides(baseDir);
    if (overrides?.objects?.[ref]?.excluded) {
      throw new Error(`Access Denied: Object "${ref}" is excluded from curation and grounding.`);
    }
    if (overrides?.objects?.[ref]?.columns?.[col]?.pii) {
      throw new Error(`Access Denied: Column "${col}" on "${ref}" is flagged as PII.`);
    }

    const quotedTable = this.quoteRef(ref);
    const quotedCol = this.quoteIdentifier(col);
    const sql = `SELECT DISTINCT ${quotedCol} FROM ${quotedTable} WHERE ${quotedCol} IS NOT NULL LIMIT 10`;

    return await this.runSelectInternal(connConfig, sql);
  }

  private async runSelect(sql: string): Promise<string> {
    if (!sql || !sql.trim()) {
      throw new Error('SQL parameter is required');
    }
    const connConfig = ConnectionUtils.findConnection(this.connectionId);
    if (!connConfig) {
      throw new Error(`Database connection not found for connectionId: ${this.connectionId}`);
    }

    // Strict validation: Only SELECT or WITH queries allowed.
    const trimmed = sql.trim().toLowerCase();
    if (!trimmed.startsWith('select') && !trimmed.startsWith('with') && !trimmed.startsWith('explain')) {
      throw new Error('Security Error: Only read-only SELECT, WITH, or EXPLAIN statements are permitted.');
    }

    return await this.runSelectInternal(connConfig, sql);
  }

  private async explainQuery(sql: string): Promise<string> {
    if (!sql || !sql.trim()) {
      throw new Error('SQL parameter is required');
    }
    const connConfig = ConnectionUtils.findConnection(this.connectionId);
    if (!connConfig) {
      throw new Error(`Database connection not found for connectionId: ${this.connectionId}`);
    }

    const trimmed = sql.trim().toLowerCase();
    if (!trimmed.startsWith('select') && !trimmed.startsWith('with') && !trimmed.startsWith('explain')) {
      throw new Error('Security Error: Only SELECT, WITH, or EXPLAIN statements can be analyzed.');
    }

    // Clean up query if it already has EXPLAIN
    const cleanSql = trimmed.startsWith('explain') ? sql : `EXPLAIN ${sql}`;
    return await this.runSelectInternal(connConfig, cleanSql);
  }

  private async runSelectInternal(connConfig: any, sql: string): Promise<string> {
    const client = await ConnectionManager.getInstance().getPooledClient({
      ...connConfig,
      database: this.databaseName
    });

    try {
      // Force read-only transaction mode for maximum safety
      await client.query('SET default_transaction_read_only = ON').catch(() => {});
      const res = await client.query(sql);
      return JSON.stringify(res.rows, null, 2);
    } finally {
      try {
        client.release();
      } catch {}
    }
  }
}
