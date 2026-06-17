import * as vscode from 'vscode';
import { LicenseService } from '../../services/LicenseService';
import { TIER_DISPLAY, allowedSyncProviders, syncProviderMinTier } from '../../services/featureGates';
import { SyncController } from './SyncController';
import { AccountService } from './AccountService';
import { CloudSyncProvider } from './providers/CloudSyncProvider';
import { PostgresSyncProvider } from './providers/PostgresSyncProvider';
import { ensureDeviceName } from './deviceId';
import type { SyncProviderId } from './types';

export interface WizardCompleteResult {
  ok: boolean;
  error?: string;
  pushed?: number;
  pulled?: number;
}

export type CloudSignInMode = 'license' | 'browser';

/**
 * Settings-hub onboarding wizard. Pass 1 has no vault step — sign in, pick a
 * backend (Cloud or self-hosted Postgres), and run the first sync. Empty remote
 * pushes local; existing remote pulls.
 */
export class SyncSetupWizard {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getWelcomeState(): { tier: string; tierLabel: string; cloudAllowed: boolean } {
    const tier = LicenseService.getInstance().getTier();
    return {
      tier,
      tierLabel: TIER_DISPLAY[tier],
      cloudAllowed: allowedSyncProviders().includes('cloud'),
    };
  }

  async signInCloud(
    mode: CloudSignInMode = 'license',
    onStatus?: (message: string) => void,
  ): Promise<{ ok: boolean; email?: string; error?: string }> {
    try {
      const account = AccountService.getInstance(this.context);
      const result = mode === 'browser'
        ? await account.signInWithDeviceFlow(onStatus)
        : await account.signInWithLicense();
      return { ok: true, email: result.email ?? undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async testBackend(providerId: SyncProviderId): Promise<{ ok: boolean; error?: string }> {
    if (providerId === 'cloud') {
      const signedIn = await AccountService.getInstance(this.context).isSignedIn();
      if (!signedIn) {
        return { ok: false, error: 'Sign in to NexQL Cloud first.' };
      }
    }
    const provider = this.createProvider(providerId);
    const test = await provider.testConnection();
    return test.ok ? { ok: true } : { ok: false, error: test.error ?? 'Connection failed' };
  }

  async completeSetup(
    providerId: SyncProviderId,
    flags: { syncConnections: boolean; syncQueries: boolean; syncNotebooks: boolean },
    postgresConnectionId?: string,
  ): Promise<WizardCompleteResult> {
    if (!allowedSyncProviders().includes(providerId)) {
      const tier = syncProviderMinTier(providerId);
      return { ok: false, error: `Requires NexQL ${TIER_DISPLAY[tier]}.` };
    }

    if (providerId === 'postgres' && postgresConnectionId) {
      await vscode.workspace
        .getConfiguration()
        .update('postgresExplorer.sync.postgresConnectionId', postgresConnectionId, vscode.ConfigurationTarget.Global);
    }

    await ensureDeviceName(this.context);

    const controller = SyncController.getInstance();
    const accountEmail = await AccountService.getInstance(this.context).getAccountEmail();

    await controller.saveConfig({
      providerId,
      syncConnections: flags.syncConnections,
      syncQueries: flags.syncQueries,
      syncNotebooks: flags.syncNotebooks,
      paused: false,
      accountEmail: accountEmail?.trim(),
    });

    const result = await controller.runSync();
    return {
      ok: true,
      pushed: result && 'pushed' in result ? result.pushed : undefined,
      pulled: result && 'pulled' in result ? result.pulled : undefined,
    };
  }

  private createProvider(id: SyncProviderId) {
    switch (id) {
      case 'cloud':
        return new CloudSyncProvider(this.context);
      case 'postgres':
        return new PostgresSyncProvider(this.context);
    }
  }
}
