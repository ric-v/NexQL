import { expect } from 'chai';
import * as fc from 'fast-check';
import { DriverRegistry } from '../../core/db/registry';
import type { EngineRegistration, EngineChangeEvent } from '../../core/api/ProviderAPI';
import type { DbDriver, DbPooledClient, DbSessionClient } from '../../core/db/DbDriver';
import type { DbDialect } from '../../core/db/DbDialect';
import type { IntrospectionProvider } from '../../core/db/introspection/IntrospectionProvider';
import type { FeatureFlags } from '../../core/db/capabilities';

// ─── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDriver(engine: string): DbDriver {
  return {
    engine: engine as any,
    getPooledClient: async () => ({ query: async () => ({ rows: [] }), release: () => {} }) as unknown as DbPooledClient,
    getSessionClient: async () => ({ query: async () => ({ rows: [] }), on: () => {}, end: async () => {} }) as unknown as DbSessionClient,
    closeSession: async () => {},
    closeConnection: async () => {},
    closeAllConnectionsById: async () => {},
    closeAll: async () => {},
  };
}

function createMockDialect(engine: string): DbDialect {
  return {
    engine: engine as any,
    capabilities: createMockFeatureFlags(),
    introspect: createMockIntrospection(),
    identifier: (name: string) => `"${name}"`,
    limitClause: (n: number) => `LIMIT ${n}`,
    explain: (sql: string) => `EXPLAIN ${sql}`,
  };
}

function createMockIntrospection(): IntrospectionProvider {
  return {
    listSchemas: () => 'SELECT schema_name FROM information_schema.schemata',
    listTables: (schema?: string) => `SELECT * FROM tables WHERE schema='${schema}'`,
  };
}

function createMockFeatureFlags(): FeatureFlags {
  return {
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
  };
}

function createMockRegistration(engine: string): EngineRegistration {
  return {
    engine,
    displayName: engine.charAt(0).toUpperCase() + engine.slice(1),
    category: 'sql',
    driver: createMockDriver(engine),
    dialect: createMockDialect(engine),
    introspection: createMockIntrospection(),
    featureFlags: createMockFeatureFlags(),
  };
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('DriverRegistry', () => {
  beforeEach(() => {
    DriverRegistry.reset();
  });

  describe('registerEngine', () => {
    it('succeeds with a valid registration', () => {
      const registry = DriverRegistry.getInstance();
      const registration = createMockRegistration('testdb');

      expect(() => registry.registerEngine(registration)).to.not.throw();
      expect(registry.isRegistered('testdb')).to.be.true;
    });

    it('throws on duplicate engine ID', () => {
      const registry = DriverRegistry.getInstance();
      const registration = createMockRegistration('testdb');

      registry.registerEngine(registration);
      expect(() => registry.registerEngine(registration)).to.throw(/already registered/);
    });
  });

  describe('getDriver / getDialect / getIntrospection / getFeatureFlags', () => {
    it('returns correct implementations after registration', () => {
      const registry = DriverRegistry.getInstance();
      const registration = createMockRegistration('myengine');
      registry.registerEngine(registration);

      expect(registry.getDriver('myengine')).to.equal(registration.driver);
      expect(registry.getDialect('myengine')).to.equal(registration.dialect);
      expect(registry.getIntrospection('myengine')).to.equal(registration.introspection);
      expect(registry.getFeatureFlags('myengine')).to.equal(registration.featureFlags);
    });
  });

  describe('getDriver throws for unregistered engine', () => {
    it('throws a descriptive error for an unregistered engine', () => {
      const registry = DriverRegistry.getInstance();

      expect(() => registry.getDriver('nonexistent')).to.throw(/not registered/);
      expect(() => registry.getDriver('nonexistent')).to.throw(/nonexistent/);
    });
  });

  describe('unregisterEngine', () => {
    it('removes engine and fires event', () => {
      const registry = DriverRegistry.getInstance();
      const registration = createMockRegistration('removeme');
      registry.registerEngine(registration);

      const events: EngineChangeEvent[] = [];
      registry.onDidChangeEngines((e) => events.push(e));

      registry.unregisterEngine('removeme');

      expect(registry.isRegistered('removeme')).to.be.false;
      expect(events).to.have.lengthOf(1);
      expect(events[0].engine).to.equal('removeme');
      expect(events[0].action).to.equal('unregistered');
    });

    it('is a no-op for non-existent engine', () => {
      const registry = DriverRegistry.getInstance();
      const events: EngineChangeEvent[] = [];
      registry.onDidChangeEngines((e) => events.push(e));

      // Should not throw and should not fire event
      expect(() => registry.unregisterEngine('ghost')).to.not.throw();
      expect(events).to.have.lengthOf(0);
    });
  });

  describe('getRegisteredEngines', () => {
    it('returns all registered engines', () => {
      const registry = DriverRegistry.getInstance();
      registry.registerEngine(createMockRegistration('alpha'));
      registry.registerEngine(createMockRegistration('beta'));
      registry.registerEngine(createMockRegistration('gamma'));

      const engines = registry.getRegisteredEngines();
      expect(engines).to.include('alpha');
      expect(engines).to.include('beta');
      expect(engines).to.include('gamma');
      expect(engines).to.have.lengthOf(3);
    });
  });

  describe('isRegistered', () => {
    it('returns true for registered engines and false for unregistered', () => {
      const registry = DriverRegistry.getInstance();
      registry.registerEngine(createMockRegistration('present'));

      expect(registry.isRegistered('present')).to.be.true;
      expect(registry.isRegistered('absent')).to.be.false;
    });
  });

  describe('onDidChangeEngines', () => {
    it('fires on register and unregister', () => {
      const registry = DriverRegistry.getInstance();
      const events: EngineChangeEvent[] = [];
      registry.onDidChangeEngines((e) => events.push(e));

      registry.registerEngine(createMockRegistration('eng1'));
      registry.unregisterEngine('eng1');

      expect(events).to.have.lengthOf(2);
      expect(events[0]).to.deep.equal({ engine: 'eng1', action: 'registered' });
      expect(events[1]).to.deep.equal({ engine: 'eng1', action: 'unregistered' });
    });
  });

  // ─── Property-Based Tests ─────────────────────────────────────────────────

  describe('Property-Based Tests', () => {
    /**
     * **Validates: Requirements 1.2**
     * Registry resolution consistency — random engine registrations always resolve correctly.
     */
    it('PBT: registry resolution consistency — random registrations always resolve correctly', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(
            fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 20 }
          ),
          (engineIds) => {
            DriverRegistry.reset();
            const registry = DriverRegistry.getInstance();

            // Register all engines
            for (const id of engineIds) {
              registry.registerEngine(createMockRegistration(id));
            }

            // Verify each engine resolves correctly
            for (const id of engineIds) {
              expect(registry.isRegistered(id)).to.be.true;
              expect(registry.getDriver(id)).to.exist;
              expect(registry.getDialect(id)).to.exist;
              expect(registry.getIntrospection(id)).to.exist;
              expect(registry.getFeatureFlags(id)).to.exist;
            }

            // Verify getRegisteredEngines returns all
            const registered = registry.getRegisteredEngines();
            expect(registered).to.have.lengthOf(engineIds.length);
            for (const id of engineIds) {
              expect(registered).to.include(id);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * **Validates: Requirements 1.2**
     * Duplicate registration rejection — same ID always throws.
     */
    it('PBT: duplicate registration rejection — same ID always throws', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          (engineId) => {
            DriverRegistry.reset();
            const registry = DriverRegistry.getInstance();

            registry.registerEngine(createMockRegistration(engineId));

            // Second registration with same ID must throw
            expect(() => registry.registerEngine(createMockRegistration(engineId))).to.throw(/already registered/);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 1.2**
     * Unregistration completeness — unregistered engines are fully removed.
     */
    it('PBT: unregistration completeness — unregistered engines are fully removed', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(
            fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 15 }
          ),
          fc.nat(),
          (engineIds, seed) => {
            DriverRegistry.reset();
            const registry = DriverRegistry.getInstance();

            // Register all engines
            for (const id of engineIds) {
              registry.registerEngine(createMockRegistration(id));
            }

            // Pick a subset to unregister based on seed
            const toRemove = engineIds.filter((_, i) => (i + seed) % 2 === 0);

            for (const id of toRemove) {
              registry.unregisterEngine(id);
            }

            // Verify removed engines are fully gone
            for (const id of toRemove) {
              expect(registry.isRegistered(id)).to.be.false;
              expect(() => registry.getDriver(id)).to.throw(/not registered/);
              expect(() => registry.getDialect(id)).to.throw(/not registered/);
              expect(() => registry.getIntrospection(id)).to.throw(/not registered/);
              expect(() => registry.getFeatureFlags(id)).to.throw(/not registered/);
            }

            // Verify remaining engines are still accessible
            const remaining = engineIds.filter(id => !toRemove.includes(id));
            for (const id of remaining) {
              expect(registry.isRegistered(id)).to.be.true;
              expect(registry.getDriver(id)).to.exist;
            }

            // Verify getRegisteredEngines reflects the correct state
            const registered = registry.getRegisteredEngines();
            expect(registered).to.have.lengthOf(remaining.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
