import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fc from 'fast-check';

import { ConnectionManager } from '../../services/ConnectionManager';
import { SecretStorageService } from '../../services/SecretStorageService';
import { DriverRegistry } from '../../core/db/registry';

/**
 * Bug Condition Exploration Test — Silent SecretStorage Failure Returns Undefined Password
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 *
 * This test encodes the EXPECTED (correct) behavior: when a connection config has
 * no inline password but SecretStorage holds a password for that connection ID,
 * `enrichConfigWithPassword()` must resolve the password from SecretStorage and
 * pass it to the driver.
 *
 * After the fix, SecretStorageService is properly initialized and `resolvePassword()`
 * successfully retrieves the stored password. This test verifies the positive path:
 * an initialized SecretStorageService with a stored password results in the driver
 * receiving the correct password.
 */
describe('Bug Condition: Silent SecretStorage Failure Returns Undefined Password', () => {
  beforeEach(() => {
    // Reset DriverRegistry by clearing the instance directly
    // (DriverRegistry.reset() calls dispose() on the EventEmitter which
    // may not exist on the mock vscode EventEmitter)
    (DriverRegistry as any).instance = undefined;
  });

  afterEach(() => {
    sinon.restore();
    // Reset singletons
    (ConnectionManager as any).instance = undefined;
    (SecretStorageService as any).instance = undefined;
    (DriverRegistry as any).instance = undefined;
  });

  /**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   *
   * Property 1: Expected Behavior — For all { connectionId, storedPassword } where
   * storedPassword is non-empty, calling `getPooledClient()` with a config that
   * has no inline password should pass a config with `password === storedPassword`
   * to the underlying driver.
   *
   * After the fix, SecretStorageService is initialized and `resolvePassword()`
   * successfully retrieves the stored password from SecretStorage.
   */
  it('PBT: resolvePassword retrieves stored password from SecretStorage for all connection IDs', async () => {
    // --- Arrange (shared across all property runs) ---

    // Track passwords stored per connection ID so the mock service can return them
    const passwordStore = new Map<string, string>();

    // Create a mock SecretStorageService that behaves like an initialized service
    const mockSecretService = {
      getPassword: async (connectionId: string): Promise<string | undefined> => {
        return passwordStore.get(`postgres-password-${connectionId}`);
      },
    };

    // Mock getInstance() to return the working mock service (simulating initialized state)
    const getInstanceStub = sinon.stub(SecretStorageService, 'getInstance');
    getInstanceStub.returns(mockSecretService as any);

    // Register a mock postgres driver that captures the config it receives
    let capturedConfig: any = undefined;
    const mockDriver = {
      engine: 'postgres' as const,
      getPooledClient: async (config: any) => {
        capturedConfig = config;
        return { query: async () => ({ rows: [] }), release: () => {} };
      },
      getSessionClient: async () => ({
        query: async () => ({ rows: [] }),
        on: () => {},
        end: async () => {},
      }),
      closeSession: async () => {},
      closeConnection: async () => {},
      closeAllConnectionsById: async () => {},
      closeAll: async () => {},
    };

    const registry = DriverRegistry.getInstance();
    registry.registerEngine({
      engine: 'postgres',
      displayName: 'PostgreSQL',
      category: 'sql',
      driver: mockDriver as any,
      dialect: {
        engine: 'postgres' as any,
        capabilities: {} as any,
        introspect: {} as any,
        identifier: (n: string) => `"${n}"`,
        limitClause: (n: number) => `LIMIT ${n}`,
        explain: (sql: string) => `EXPLAIN ${sql}`,
      } as any,
      introspection: { listSchemas: () => '', listTables: () => '' } as any,
      featureFlags: {
        supportsSchemas: true,
        supportsListenNotify: false,
        supportsLogicalReplication: false,
        supportsTablespaces: false,
        supportsEventTriggers: false,
        supportsPgCron: false,
        supportsForeignDataWrappers: false,
        supportsMaterializedViews: false,
        supportsStoredProcedures: false,
        supportsTriggers: false,
        supportsSequences: false,
        supportsDomains: false,
        supportsCustomTypes: false,
        supportsPartitions: false,
        supportsRlsPolicies: false,
        supportsRules: false,
        supportsAggregates: false,
        supportsVacuum: false,
        supportsExplain: true,
        supportsTransactions: true,
        supportsSavepoints: false,
        supportsRoles: false,
        supportsTabularResults: true,
        supportsDocumentResults: false,
        supportsGraphResults: false,
      },
    });

    const manager = ConnectionManager.getInstance();

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          connectionId: fc.string({ minLength: 1, maxLength: 50 }),
          storedPassword: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ connectionId, storedPassword }) => {
          // Reset captured config for each run
          capturedConfig = undefined;

          // Store the password in the mock SecretStorage for this connection ID
          passwordStore.set(`postgres-password-${connectionId}`, storedPassword);

          // Config with NO inline password — password must come from SecretStorage
          const config = {
            id: connectionId,
            host: 'localhost',
            port: 5432,
            username: 'user',
            database: 'db',
            engine: 'postgres' as const,
          };

          // --- Act ---
          await manager.getPooledClient(config as any);

          // --- Assert ---
          // The driver should have received a config with the stored password.
          // After the fix, resolvePassword() successfully retrieves the password
          // from the initialized SecretStorageService.
          expect(capturedConfig).to.exist;
          expect(capturedConfig.password).to.equal(
            storedPassword,
            `Expected driver to receive password '${storedPassword}' for connectionId '${connectionId}', ` +
            `but got '${capturedConfig?.password}'. resolvePassword() should retrieve the password ` +
            `from an initialized SecretStorageService.`
          );

          // Clean up the password store for this run
          passwordStore.delete(`postgres-password-${connectionId}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});
