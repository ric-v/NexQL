import * as vscode from 'vscode';
import { AccountService } from './AccountService';
import { getDeviceName, getOrCreateDeviceId } from './deviceId';
import { httpRequest } from './providers/httpUtils';
import { DEFAULT_SYNC_API_ENDPOINT } from './constants';
import type { WorkspaceMemberView, WorkspaceRole, WorkspaceView } from './types';

/**
 * Team workspaces (server-ACL sharing — pass 1, no client crypto).
 *
 * A shared workspace is a sync space with a member roster. Items are shared by
 * syncing them into the workspace's space; the server enforces who may read or
 * write. O(1) to add a member, no per-item re-encryption.
 */
export class WorkspaceSharingService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private baseUrl(): string {
    const configured = vscode.workspace.getConfiguration().get<string>('postgresExplorer.sync.apiEndpoint');
    return configured?.trim() || DEFAULT_SYNC_API_ENDPOINT;
  }

  private async headers(): Promise<Record<string, string>> {
    let token = await AccountService.getInstance(this.context).getAccessToken();
    if (!token) {
      token = await AccountService.getInstance(this.context).refreshAccessToken();
    }
    if (!token) {
      throw new Error('Sign in to NexQL Cloud first.');
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Device-Id': getOrCreateDeviceId(this.context),
    };
    const name = getDeviceName(this.context);
    if (name) {
      headers['X-Device-Name'] = name;
    }
    return headers;
  }

  async listWorkspaces(): Promise<WorkspaceView[]> {
    const res = await httpRequest(`${this.baseUrl()}/sync/v2/spaces`, { headers: await this.headers() });
    if (res.statusCode >= 400) {
      return [];
    }
    const data = JSON.parse(res.body.toString()) as {
      spaces: Array<{ space_id: string; name: string; owner_email: string; role: WorkspaceRole }>;
    };
    return (data.spaces ?? []).map((s) => ({
      spaceId: s.space_id,
      name: s.name,
      ownerEmail: s.owner_email,
      role: s.role,
    }));
  }

  async createWorkspace(name: string): Promise<WorkspaceView> {
    const res = await httpRequest(`${this.baseUrl()}/sync/v2/spaces`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ action: 'create', name }),
    });
    if (res.statusCode >= 400) {
      throw new Error(this.errorOf(res.body, 'Failed to create workspace'));
    }
    const data = JSON.parse(res.body.toString()) as { space_id: string; name: string };
    const email = (await AccountService.getInstance(this.context).getAccountEmail()) ?? '';
    return { spaceId: data.space_id, name: data.name, ownerEmail: email, role: 'owner' };
  }

  async listMembers(spaceId: string): Promise<WorkspaceMemberView[]> {
    const res = await httpRequest(
      `${this.baseUrl()}/sync/v2/spaces?space=${encodeURIComponent(spaceId)}`,
      { headers: await this.headers() },
    );
    if (res.statusCode >= 400) {
      return [];
    }
    const data = JSON.parse(res.body.toString()) as {
      members: Array<{ email: string; role: WorkspaceRole; added_at: string }>;
    };
    return (data.members ?? []).map((m) => ({ email: m.email, role: m.role, addedAt: m.added_at }));
  }

  async addMember(spaceId: string, email: string, role: 'editor' | 'viewer'): Promise<void> {
    const res = await httpRequest(`${this.baseUrl()}/sync/v2/spaces`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ action: 'addMember', space: spaceId, email, role }),
    });
    if (res.statusCode >= 400) {
      throw new Error(this.errorOf(res.body, 'Failed to add member'));
    }
  }

  async removeMember(spaceId: string, email: string): Promise<void> {
    const res = await httpRequest(`${this.baseUrl()}/sync/v2/spaces`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ action: 'removeMember', space: spaceId, email }),
    });
    if (res.statusCode >= 400) {
      throw new Error(this.errorOf(res.body, 'Failed to remove member'));
    }
  }

  private errorOf(body: Buffer, fallback: string): string {
    try {
      return (JSON.parse(body.toString()) as { error?: string }).error ?? fallback;
    } catch {
      return fallback;
    }
  }
}
