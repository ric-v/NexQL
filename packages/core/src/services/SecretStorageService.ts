import * as vscode from 'vscode';
import { coerceConnectionPassword } from '../utils/coerceConnectionPassword';

/** Legacy VS Code secret key (pre–multi-database rebrand). */
const CONNECTION_PASSWORD_SECRET_PREFIX_LEGACY = 'postgres-password-';
/** Credential key written by MigrationService.migrateCredentials (NexQL rebrand). */
const CONNECTION_PASSWORD_SECRET_PREFIX_NEXQL = 'nexql.password.';

function connectionPasswordSecretKeyLegacy(connectionId: string): string {
  return `${CONNECTION_PASSWORD_SECRET_PREFIX_LEGACY}${connectionId}`;
}

function connectionPasswordSecretKeyNexql(connectionId: string): string {
  return `${CONNECTION_PASSWORD_SECRET_PREFIX_NEXQL}${connectionId}`;
}

function normalizeStoredPassword(value: string | undefined): string | undefined {
  return coerceConnectionPassword(value);
}

export class SecretStorageService {
  private static instance: SecretStorageService;
  private constructor(private readonly context: vscode.ExtensionContext) { }

  public static isInitialized(): boolean {
    return !!SecretStorageService.instance;
  }

  public static getInstance(context?: vscode.ExtensionContext): SecretStorageService {
    if (!SecretStorageService.instance) {
      if (!context) {
        throw new Error('SecretStorageService not initialized. Call getInstance(context) during extension activation first.');
      }
      SecretStorageService.instance = new SecretStorageService(context);
    }
    return SecretStorageService.instance;
  }

  public async getPassword(connectionId: string): Promise<string | undefined> {
    const legacyRaw = await this.context.secrets.get(connectionPasswordSecretKeyLegacy(connectionId));
    const legacy = normalizeStoredPassword(legacyRaw);
    if (legacy !== undefined) {
      return legacy;
    }
    const nexqlRaw = await this.context.secrets.get(connectionPasswordSecretKeyNexql(connectionId));
    return normalizeStoredPassword(nexqlRaw);
  }

  public async getAiApiKey(): Promise<string | undefined> {
    return await this.context.secrets.get('nexql.aiApiKey');
  }

  public async setPassword(connectionId: string, password: string): Promise<void> {
    await this.context.secrets.store(connectionPasswordSecretKeyLegacy(connectionId), password);
    await this.context.secrets.store(connectionPasswordSecretKeyNexql(connectionId), password);
  }

  public async setAiApiKey(apiKey: string): Promise<void> {
    await this.context.secrets.store('nexql.aiApiKey', apiKey);
  }

  public async deletePassword(connectionId: string): Promise<void> {
    await this.context.secrets.delete(connectionPasswordSecretKeyLegacy(connectionId));
    await this.context.secrets.delete(connectionPasswordSecretKeyNexql(connectionId));
  }

  public async deleteAiApiKey(): Promise<void> {
    await this.context.secrets.delete('nexql.aiApiKey');
  }

  /** GitHub PAT with `gist` scope — used only for “Publish notebook to Gist”. */
  public async getGithubGistToken(): Promise<string | undefined> {
    return await this.context.secrets.get('nexql.githubGistToken');
  }

  public async setGithubGistToken(token: string): Promise<void> {
    await this.context.secrets.store('nexql.githubGistToken', token);
  }

  public async deleteGithubGistToken(): Promise<void> {
    await this.context.secrets.delete('nexql.githubGistToken');
  }
}

/**
 * Migration helper to move passwords from globalState to SecretStorage
 * This keeps the logic isolated but accessible to extension.ts
 */
export async function migrateExistingPasswords(context: vscode.ExtensionContext): Promise<void> {
  const connections = context.globalState.get<any[]>('postgresql.connections') || [];
  let migratedCount = 0;

  for (const conn of connections) {
    if (conn.password) {
      try {
        // Store in secret storage
        await SecretStorageService.getInstance(context).setPassword(conn.id, conn.password);

        // Remove from connection object and update globalState
        delete conn.password;
        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate password for connection ${conn.name}:`, error);
      }
    }
  }

  if (migratedCount > 0) {
    await context.globalState.update('postgresql.connections', connections);
    console.log(`Migrated ${migratedCount} passwords to Secret Storage`);
  }
}
