import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fc from 'fast-check';

import { ConnectionManager } from '../../services/ConnectionManager';
import { SecretStorageService } from '../../services/SecretStorageService';
import { DriverRegistry } from '../../core/db/registry';
import * as pgPassUtils from '../../utils/pgPassUtils';

/**
 * Preservation Property Tests — Non-SecretStorage Password Paths Unchanged
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * These tests capture the BASELINE behavior of `enrichConfigWithPassword()` for
 * code paths that do NOT depend on the bug condition (SecretStorage failure).
 * They must PASS on the UNFIXED code, confirming the behavior we need to preserve.
 *
 * Observation-first methodology:
 * - Observed: when config.password is already set, resolvePassword() returns it immediately
 * - Observed: when config.password is undefined AND no password in SecretStorage or .pgpass,
 *   resolvePassword() returns undefined (trust auth case)
 * - Observed: when config.password is undefined AND SecretStorage has no password AND .pgpass
 *   returns a password, resolvePassword() returns the .pgpass password
 * - Observed: when no password source has a value, resolvePassword() returns undefined
 */
describe('Preservation: Non-SecretStorage Password Paths Unchanged', () => {
  let sandbox: sinon.SinonSandbox;
  let capturedConfig: any;
  let manager: ConnectionManager;

  /**
   * Registers a mock postgres driver that captures the enriched config
   * passed to getPooledClient, so we can inspect the resolved password.
   */
  function setupMockDriver(): void {
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
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    capturedConfig = undefined;

    // Reset singletons
    (DriverRegistry as any).instance = undefined;
    (ConnectionManager as any).instance = undefined;
    (SecretStorageService as any).instance = undefined;

    setupMockDriver();
    manager = ConnectionManager.getInstance();
  });

  afterEach(() => {
    sandbox.restore();
    (ConnectionManager as any).instance = undefined;
    (SecretStorageService as any).instance = undefined;
    (DriverRegistry as any).instance = undefined;
  });

  /**
   * **Validates: Requirements 3.5**
   *
   * Property 2a (Inline password preservation): for all { password, id } where
   * password is non-empty, when config.password is set, enrichConfigWithPassword()
   * returns a config with the same inline password, regardless of SecretStorage state.
   *
   * Observed on unfixed code: resolvePassword() returns config.password immediately
   * when it is truthy, without querying SecretStorage.
   */
  it('PBT Property 2a: inline password is preserved for all configs with password set', async () => {
    // Mock SecretStorageService to return an initialized service with a different password
    // to prove that inline password takes priority
    const getInstanceStub = sandbox.stub(SecretStorageService, 'getInstance');
    getInstanceStub.returns({
      getPassword: sandbox.stub().resolves('secret-storage-password-should-not-be-used'),
    } as any);

    // Mock pgpass to also return a different password
    const pgPassStub = sandbox.stub(pgPassUtils, 'resolvePgPassPassword');
    pgPassStub.returns('pgpass-password-should-not-be-used');

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          password: fc.string({ minLength: 1, maxLength: 100 }),
          id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        }),
        async ({ password, id }) => {
          capturedConfig = undefined;

          const config = {
            id: id ?? 'default-id',
            host: 'localhost',
            port: 5432,
            username: 'user',
            database: 'db',
            engine: 'postgres' as const,
            password,
          };

          await manager.getPooledClient(config as any);

          expect(capturedConfig).to.exist;
          expect(capturedConfig.password).to.equal(
            password,
            `Expected inline password '${password}' to be preserved, ` +
            `but got '${capturedConfig?.password}'`
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * Property 2b (Trust auth preservation): for all configs where config.password
   * is undefined and no password exists in SecretStorage or .pgpass,
   * enrichConfigWithPassword() returns a config with password: undefined.
   *
   * Observed on unfixed code: when no password source has a value,
   * resolvePassword() returns undefined.
   */
  it('PBT Property 2b: trust auth configs return undefined password when no password source exists', async () => {
    // Mock SecretStorageService as initialized but returning no password
    const getInstanceStub = sandbox.stub(SecretStorageService, 'getInstance');
    getInstanceStub.returns({
      getPassword: sandbox.stub().resolves(undefined),
    } as any);

    // Mock pgpass to return undefined (no .pgpass entry)
    const pgPassStub = sandbox.stub(pgPassUtils, 'resolvePgPassPassword');
    pgPassStub.returns(undefined);

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          connectionId: fc.string({ minLength: 1, maxLength: 50 }),
          host: fc.string({ minLength: 1, maxLength: 50 }),
          port: fc.integer({ min: 1, max: 65535 }),
          username: fc.string({ minLength: 1, maxLength: 50 }),
          database: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async ({ connectionId, host, port, username, database }) => {
          capturedConfig = undefined;

          const config = {
            id: connectionId,
            host,
            port,
            username,
            database,
            engine: 'postgres' as const,
            // password intentionally omitted — trust auth scenario
            // SecretStorage returns undefined, pgpass returns undefined
          };

          await manager.getPooledClient(config as any);

          expect(capturedConfig).to.exist;
          // In trust auth, no password is set on the config
          // enrichConfigWithPassword returns the original config unchanged
          expect(capturedConfig.password).to.be.undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * Property 2c (PgPass fallback preservation): for all { username, pgpassPassword }
   * where both are non-empty, when config.password is undefined and SecretStorage
   * has no password but .pgpass resolves a password, enrichConfigWithPassword()
   * returns a config with the .pgpass password.
   *
   * Observed on unfixed code: resolvePassword() falls through to .pgpass when
   * SecretStorage has no password, and returns the .pgpass result.
   */
  it('PBT Property 2c: pgpass fallback password is used when SecretStorage has no password', async () => {
    // Mock SecretStorageService as initialized but returning no password
    const getInstanceStub = sandbox.stub(SecretStorageService, 'getInstance');
    getInstanceStub.returns({
      getPassword: sandbox.stub().resolves(undefined),
    } as any);

    // Track the current pgpass password to return — updated per property run
    let currentPgPassPassword: string = '';
    const pgPassStub = sandbox.stub(pgPassUtils, 'resolvePgPassPassword');
    pgPassStub.callsFake(() => currentPgPassPassword);

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 1, maxLength: 50 }),
          pgpassPassword: fc.string({ minLength: 1, maxLength: 100 }),
          connectionId: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async ({ username, pgpassPassword, connectionId }) => {
          capturedConfig = undefined;
          currentPgPassPassword = pgpassPassword;

          const config = {
            id: connectionId,
            host: 'localhost',
            port: 5432,
            username,
            database: 'db',
            engine: 'postgres' as const,
            // password intentionally omitted — must come from pgpass
          };

          await manager.getPooledClient(config as any);

          expect(capturedConfig).to.exist;
          expect(capturedConfig.password).to.equal(
            pgpassPassword,
            `Expected pgpass password '${pgpassPassword}' to be used, ` +
            `but got '${capturedConfig?.password}'`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
