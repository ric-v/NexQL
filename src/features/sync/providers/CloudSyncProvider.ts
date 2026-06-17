import * as vscode from 'vscode';
import type {
  CloudQuotaView,
  PushResult,
  SyncDelta,
  SyncDeviceView,
  SyncOp,
  SyncProviderV2,
} from '../types';
import { AccountService } from '../AccountService';
import { getDeviceName, getOrCreateDeviceId } from '../deviceId';
import { httpRequest } from './httpUtils';
import { DEFAULT_SYNC_API_ENDPOINT } from '../constants';

interface RawDelta {
  cursor: number;
  upserts: Array<{
    item_id: string;
    kind: 'connection' | 'query' | 'notebook';
    content_hash: string;
    version: number;
    device_id: string;
    blob: string;
    updated_at: string;
  }>;
  deletes: string[];
}

/** NexQL Cloud sync backend (nexql.astrx.dev) — git-like v2 protocol. */
export class CloudSyncProvider implements SyncProviderV2 {
  readonly id = 'cloud' as const;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly spaceId?: string,
  ) {}

  private baseUrl(): string {
    const configured = vscode.workspace.getConfiguration().get<string>('postgresExplorer.sync.apiEndpoint');
    return configured?.trim() || DEFAULT_SYNC_API_ENDPOINT;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    let token = await AccountService.getInstance().getAccessToken();
    if (!token) {
      token = await AccountService.getInstance().refreshAccessToken();
    }
    if (!token) {
      throw new Error('Not signed in to NexQL account');
    }
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    headers['X-Device-Id'] = getOrCreateDeviceId(this.context);
    const deviceName = getDeviceName(this.context);
    if (deviceName) {
      headers['X-Device-Name'] = deviceName;
    }
    return headers;
  }

  async testConnection(): Promise<{ ok: boolean; account?: string; error?: string }> {
    try {
      const headers = await this.authHeaders();
      const res = await httpRequest(`${this.baseUrl()}/sync/v2/pull?since=0${this.spaceQuery()}`, { headers });
      if (res.statusCode >= 400) {
        return { ok: false, error: `API ${res.statusCode}` };
      }
      return { ok: true, account: await AccountService.getInstance().getAccountEmail() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  private spaceQuery(): string {
    return this.spaceId ? `&space=${encodeURIComponent(this.spaceId)}` : '';
  }

  async pullDelta(since: number): Promise<SyncDelta> {
    const headers = await this.authHeaders();
    const res = await httpRequest(
      `${this.baseUrl()}/sync/v2/pull?since=${since}${this.spaceQuery()}`,
      { headers },
    );
    if (res.statusCode >= 400) {
      throw new Error(`Pull failed: API ${res.statusCode}`);
    }
    const raw = JSON.parse(res.body.toString()) as RawDelta;
    return {
      cursor: Number(raw.cursor) || 0,
      upserts: raw.upserts.map((u) => ({
        meta: {
          id: u.item_id,
          kind: u.kind,
          contentHash: u.content_hash,
          version: Number(u.version),
          deviceId: u.device_id,
          updatedAt: new Date(u.updated_at).getTime(),
        },
        blob: Buffer.from(u.blob, 'base64'),
      })),
      deletes: raw.deletes ?? [],
    };
  }

  async pushBatch(ops: SyncOp[]): Promise<PushResult> {
    const headers = { ...(await this.authHeaders()), 'Content-Type': 'application/json' };
    const body = JSON.stringify({
      space: this.spaceId,
      ops: ops.map((op) => ({
        op: op.op,
        item_id: op.itemId,
        kind: op.kind,
        base_version: op.baseVersion,
        content_hash: op.contentHash,
        blob: op.blob ? op.blob.toString('base64') : undefined,
      })),
    });
    const res = await httpRequest(`${this.baseUrl()}/sync/v2/push`, { method: 'POST', headers, body });
    if (res.statusCode >= 400) {
      throw new Error(`Push failed: API ${res.statusCode}`);
    }
    const raw = JSON.parse(res.body.toString()) as {
      cursor: number;
      accepted: Array<{ item_id: string; version: number }>;
      rejected: Array<{ item_id: string; remote_version: number | null; remote_hash: string | null }>;
    };
    return {
      cursor: Number(raw.cursor) || 0,
      accepted: raw.accepted.map((a) => ({ itemId: a.item_id, version: Number(a.version) })),
      rejected: raw.rejected.map((r) => ({
        itemId: r.item_id,
        remoteVersion: r.remote_version == null ? null : Number(r.remote_version),
        remoteHash: r.remote_hash,
      })),
    };
  }

  async resetSpace(): Promise<void> {
    const headers = { ...(await this.authHeaders()), 'Content-Type': 'application/json' };
    const res = await httpRequest(`${this.baseUrl()}/sync/v2/reset`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ space: this.spaceId }),
    });
    if (res.statusCode >= 400) {
      throw new Error(`Reset failed: API ${res.statusCode}`);
    }
  }

  async getQuota(): Promise<CloudQuotaView | undefined> {
    try {
      const headers = await this.authHeaders();
      const res = await httpRequest(`${this.baseUrl()}/sync/quota`, { headers });
      if (res.statusCode >= 400) {
        return undefined;
      }
      const data = JSON.parse(res.body.toString()) as {
        tier: string;
        bytes_used: number;
        bytes_limit: number;
        item_count: number;
      };
      return {
        tier: data.tier,
        bytesUsed: data.bytes_used,
        bytesLimit: data.bytes_limit,
        itemCount: data.item_count,
      };
    } catch {
      return undefined;
    }
  }

  async listDevices(): Promise<SyncDeviceView[]> {
    const headers = await this.authHeaders();
    const res = await httpRequest(`${this.baseUrl()}/sync/devices`, { headers });
    if (res.statusCode >= 400) {
      return [];
    }
    const rows = JSON.parse(res.body.toString()) as Array<{
      device_id: string;
      device_name?: string;
      last_seen: string;
    }>;
    const thisId = getOrCreateDeviceId(this.context);
    return rows.map((r) => ({
      deviceId: r.device_id,
      deviceName: r.device_name,
      lastSeen: r.last_seen,
      isThisDevice: r.device_id === thisId,
    }));
  }

  async revokeDevice(deviceId: string): Promise<boolean> {
    const headers = await this.authHeaders();
    const res = await httpRequest(`${this.baseUrl()}/sync/devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
      headers,
    });
    return res.statusCode === 204;
  }
}
