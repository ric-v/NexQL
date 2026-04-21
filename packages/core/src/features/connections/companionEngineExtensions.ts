import * as vscode from 'vscode';
import { DriverRegistry } from '../../core/db/registry';

/** Fallback if package.json lacks extensionPack (should not happen in production). */
const DEFAULT_EXTENSION_PACK: readonly string[] = [
    'ric-v.postgres-explorer',
    'ric-v.nexql-mysql',
    'ric-v.nexql-sqlite',
    'ric-v.nexql-mssql',
    'ric-v.nexql-oracle',
] as const;

/** Maps NexQL extensionPack entries to engine id and a stable label when the extension is not loaded. */
const EXTENSION_PACK_META: Readonly<Record<string, { engine: string; fallbackLabel: string }>> = {
    'ric-v.postgres-explorer': { engine: 'postgres', fallbackLabel: 'NexQL - PostgreSQL' },
    'ric-v.nexql-mysql': { engine: 'mysql', fallbackLabel: 'NexQL - MySQL' },
    'ric-v.nexql-sqlite': { engine: 'sqlite', fallbackLabel: 'NexQL - SQLite' },
    'ric-v.nexql-mssql': { engine: 'mssql', fallbackLabel: 'NexQL - Microsoft SQL Server' },
    'ric-v.nexql-oracle': { engine: 'oracle', fallbackLabel: 'NexQL - Oracle' },
};

/**
 * Marketplace / extensionPack ids vs local package.json `name` (runtime id = publisher.name).
 * In Extension Development Host, companions are often `ric-v.nexql-ext-*` while the pack lists published ids.
 */
const EXTENSION_PACK_RUNTIME_ALIASES: Readonly<Record<string, readonly string[]>> = {
    'ric-v.postgres-explorer': ['ric-v.postgres-explorer', 'ric-v.nexql-ext-postgres'],
    'ric-v.nexql-mysql': ['ric-v.nexql-mysql', 'ric-v.nexql-ext-mysql'],
    'ric-v.nexql-sqlite': ['ric-v.nexql-sqlite', 'ric-v.nexql-ext-sqlite'],
    'ric-v.nexql-mssql': ['ric-v.nexql-mssql', 'ric-v.nexql-ext-mssql'],
    'ric-v.nexql-oracle': ['ric-v.nexql-oracle'],
};

function getExtensionForPackEntry(packExtensionId: string): vscode.Extension<unknown> | undefined {
    const candidates = EXTENSION_PACK_RUNTIME_ALIASES[packExtensionId] ?? [packExtensionId];
    for (const id of candidates) {
        const ext = vscode.extensions.getExtension(id);
        if (ext) {
            return ext;
        }
    }
    return undefined;
}

export interface CompanionEngineExtensionStatus {
    extensionId: string;
    label: string;
    engine: string;
    installed: boolean;
    /** True when this session has a driver registered for the engine (companion activated). */
    engineRegistered: boolean;
}

/**
 * Rows for the Connection Management webview: extensionPack from the core extension manifest,
 * install state from the VS Code extension host, and runtime registration from DriverRegistry.
 */
export function getCompanionEngineExtensionStatuses(
    extensionContext: vscode.ExtensionContext
): CompanionEngineExtensionStatus[] {
    const rawPack = extensionContext.extension.packageJSON.extensionPack;
    const packIds: string[] = Array.isArray(rawPack)
        ? rawPack.filter((id): id is string => typeof id === 'string' && id.length > 0)
        : [...DEFAULT_EXTENSION_PACK];

    const registry = DriverRegistry.getInstance();

    return packIds.map((extensionId) => {
        const meta = EXTENSION_PACK_META[extensionId];
        const engine = meta?.engine ?? 'unknown';
        const installedExt = getExtensionForPackEntry(extensionId);
        const label =
            (installedExt?.packageJSON as { displayName?: string } | undefined)?.displayName ??
            meta?.fallbackLabel ??
            extensionId;

        return {
            extensionId,
            label,
            engine,
            installed: !!installedExt,
            engineRegistered: engine !== 'unknown' && registry.isRegistered(engine),
        };
    });
}
