import { expect } from 'chai';
import type { DbDriver, DbPooledClient, DbSessionClient } from '../../core/db/DbDriver';
import type { DbDialect } from '../../core/db/DbDialect';
import type { IntrospectionProvider } from '../../core/db/introspection/IntrospectionProvider';
import type { FeatureFlags } from '../../core/db/capabilities';
import type { SqlTemplateProvider } from '../../core/db/SqlTemplateProvider';
import type { MonitoringProvider } from '../../core/db/MonitoringProvider';
import type { DdlProvider } from '../../core/db/DdlProvider';
import type { MigrationStatementGenerator } from '../../core/db/MigrationStatementGenerator';
import type { ExplainPlanParser } from '../../core/db/ExplainPlanParser';
import type { ExplainPlanNormalizer } from '../../core/db/ExplainPlanNormalizer';
import type { TypeClassifier } from '../../core/db/TypeClassifier';
import type { TransactionSyntax } from '../../core/db/TransactionSyntax';
import type { CompletionProvider } from '../../core/db/CompletionProvider';
import type { IndexAdvisor } from '../../core/db/IndexAdvisor';
import type { ConnectionFormFieldDefinition } from '../../core/types/connectionForm';
import type { EngineRegistration, DatabaseCategory } from '../../core/api/ProviderAPI';

/**
 * These tests verify that mock implementations conforming to each interface
 * compile correctly and satisfy the type contracts at runtime.
 */
describe('InterfaceContracts', () => {
  describe('DbDriver', () => {
    it('mock implementation conforms to DbDriver interface', () => {
      const driver: DbDriver = {
        engine: 'postgres' as any,
        getPooledClient: async () => ({ query: async () => ({ rows: [] }), release: () => {} }) as unknown as DbPooledClient,
        getSessionClient: async () => ({ query: async () => ({ rows: [] }), on: () => {}, end: async () => {} }) as unknown as DbSessionClient,
        closeSession: async () => {},
        closeConnection: async () => {},
        closeAllConnectionsById: async () => {},
        closeAll: async () => {},
      };
      expect(driver).to.have.property('engine');
      expect(driver.getPooledClient).to.be.a('function');
      expect(driver.getSessionClient).to.be.a('function');
      expect(driver.closeSession).to.be.a('function');
      expect(driver.closeConnection).to.be.a('function');
      expect(driver.closeAllConnectionsById).to.be.a('function');
      expect(driver.closeAll).to.be.a('function');
    });
  });

  describe('DbDialect', () => {
    it('mock implementation conforms to DbDialect interface', () => {
      const dialect: DbDialect = {
        engine: 'mysql' as any,
        capabilities: {} as FeatureFlags,
        introspect: {} as IntrospectionProvider,
        identifier: (name: string) => `\`${name}\``,
        limitClause: (n: number) => `LIMIT ${n}`,
        explain: (sql: string) => `EXPLAIN ${sql}`,
      };
      expect(dialect.engine).to.equal('mysql');
      expect(dialect.identifier('col')).to.equal('`col`');
      expect(dialect.limitClause(10)).to.equal('LIMIT 10');
      expect(dialect.explain('SELECT 1')).to.equal('EXPLAIN SELECT 1');
    });
  });

  describe('IntrospectionProvider', () => {
    it('mock implementation conforms to IntrospectionProvider interface', () => {
      const provider: IntrospectionProvider = {
        listSchemas: () => 'SELECT schema_name FROM schemata',
        listTables: (schema?: string) => `SELECT * FROM tables WHERE schema='${schema}'`,
        listViews: (schema?: string) => `SELECT * FROM views WHERE schema='${schema}'`,
        listColumns: (schema: string, table: string) => `SELECT * FROM columns WHERE schema='${schema}' AND table='${table}'`,
        listIndexes: (schema: string, table: string) => `SELECT * FROM indexes WHERE schema='${schema}' AND table='${table}'`,
        listForeignKeys: (schema: string, table: string) => `SELECT * FROM fks WHERE schema='${schema}' AND table='${table}'`,
        listFunctions: (schema?: string) => `SELECT * FROM functions WHERE schema='${schema}'`,
        listProcedures: (schema?: string) => `SELECT * FROM procedures WHERE schema='${schema}'`,
        search: (term: string) => `SEARCH '${term}'`,
      };
      expect(provider.listSchemas?.()).to.be.a('string');
      expect(provider.listTables?.('public')).to.contain('public');
      expect(provider.listColumns?.('public', 'users')).to.contain('users');
    });
  });

  describe('FeatureFlags', () => {
    it('mock implementation conforms to FeatureFlags interface', () => {
      const flags: FeatureFlags = {
        supportsSchemas: true,
        supportsListenNotify: false,
        supportsLogicalReplication: false,
        supportsTablespaces: false,
        supportsEventTriggers: false,
        supportsPgCron: false,
        supportsForeignDataWrappers: false,
        supportsMaterializedViews: true,
        supportsStoredProcedures: true,
        supportsTriggers: true,
        supportsSequences: true,
        supportsDomains: false,
        supportsCustomTypes: false,
        supportsPartitions: false,
        supportsRlsPolicies: false,
        supportsRules: false,
        supportsAggregates: false,
        supportsVacuum: true,
        supportsExplain: true,
        supportsTransactions: true,
        supportsSavepoints: true,
        supportsRoles: true,
        supportsTabularResults: true,
        supportsDocumentResults: false,
        supportsGraphResults: false,
      };
      expect(flags.supportsSchemas).to.be.true;
      expect(flags.supportsDocumentResults).to.be.false;
    });
  });

  describe('SqlTemplateProvider', () => {
    it('mock implementation conforms to SqlTemplateProvider interface', () => {
      const provider: SqlTemplateProvider = {
        selectAll: (schema, table) => `SELECT * FROM ${schema}.${table}`,
        selectTop: (schema, table, limit) => `SELECT * FROM ${schema}.${table} LIMIT ${limit}`,
        insert: (schema, table, columns) => `INSERT INTO ${schema}.${table} (${columns.join(',')}) VALUES ()`,
        update: (schema, table, columns, whereColumns) => `UPDATE ${schema}.${table} SET ${columns.join('=?,')} WHERE ${whereColumns.join('=?')}`,
        delete: (schema, table, whereColumns) => `DELETE FROM ${schema}.${table} WHERE ${whereColumns.join('=?')}`,
        createTable: (schema, table) => `CREATE TABLE ${schema}.${table} ()`,
        dropTable: (schema, table) => `DROP TABLE ${schema}.${table}`,
        truncateTable: (schema, table) => `TRUNCATE TABLE ${schema}.${table}`,
      };
      expect(provider.selectAll?.('public', 'users')).to.contain('public.users');
      expect(provider.selectTop?.('public', 'users', 10)).to.contain('LIMIT 10');
    });
  });

  describe('MonitoringProvider', () => {
    it('mock implementation conforms to MonitoringProvider interface', () => {
      const provider: MonitoringProvider = {
        getOverviewQuery: () => 'SELECT overview',
        getActiveConnectionsQuery: () => 'SELECT connections',
        getDatabaseSizeQuery: () => 'SELECT size',
        getVersionQuery: () => 'SELECT version()',
        getTableStatsQuery: () => 'SELECT table_stats',
        getIndexHealthQuery: () => 'SELECT index_health',
        getLongRunningQueriesQuery: () => 'SELECT long_running',
      };
      expect(provider.getOverviewQuery()).to.be.a('string');
      expect(provider.getActiveConnectionsQuery()).to.be.a('string');
      expect(provider.getDatabaseSizeQuery()).to.be.a('string');
      expect(provider.getVersionQuery()).to.be.a('string');
    });
  });

  describe('DdlProvider', () => {
    it('mock implementation conforms to DdlProvider interface', () => {
      const provider: DdlProvider = {
        generateDdl: async (objectType, schema, name) => `CREATE ${objectType} ${schema}.${name}`,
        supportedObjectTypes: () => ['table', 'view', 'function'],
      };
      expect(provider.supportedObjectTypes()).to.include('table');
    });
  });

  describe('MigrationStatementGenerator', () => {
    it('mock implementation conforms to MigrationStatementGenerator interface', () => {
      const generator: MigrationStatementGenerator = {
        buildMigrationStatements: (sourceSchema, targetSchema, diffs) => {
          return diffs.map(d => `ALTER TABLE ${sourceSchema}.${(d as any).tableName} ...`);
        },
      };
      const result = generator.buildMigrationStatements('src', 'tgt', [{ tableName: 'users' } as any]);
      expect(result).to.be.an('array');
      expect(result[0]).to.contain('ALTER TABLE');
    });
  });

  describe('ExplainPlanParser', () => {
    it('mock implementation conforms to ExplainPlanParser interface', () => {
      const parser: ExplainPlanParser = {
        parsePlan: (rawPlan) => {
          if (!rawPlan) return null;
          return {
            totalCost: 100,
            planningTime: 0.5,
            executionTime: 2.3,
            sequentialScans: 1,
            indexScans: 2,
            estimatedRows: 1000,
            bottlenecks: [],
            recommendations: [],
          };
        },
      };
      expect(parser.parsePlan(null)).to.be.null;
      expect(parser.parsePlan({ plan: 'data' })).to.have.property('totalCost', 100);
    });
  });

  describe('ExplainPlanNormalizer', () => {
    it('mock implementation conforms to ExplainPlanNormalizer interface', () => {
      const normalizer: ExplainPlanNormalizer = {
        normalize: (rawPlan) => ({
          root: rawPlan ? { nodeType: 'Seq Scan', cost: 10 } : null,
          meta: { planningTime: 1.0, executionTime: 5.0 },
        }),
      };
      const result = normalizer.normalize({ plan: 'data' });
      expect(result.root).to.have.property('nodeType', 'Seq Scan');
      expect(result.meta.planningTime).to.equal(1.0);
    });
  });

  describe('TypeClassifier', () => {
    it('mock implementation conforms to TypeClassifier interface', () => {
      const classifier: TypeClassifier = {
        isNumeric: (t) => t.includes('int'),
        isText: (t) => t.includes('text'),
        isDate: (t) => t.includes('date'),
        isBoolean: (t) => t.includes('bool'),
      };
      expect(classifier.isNumeric('integer')).to.be.true;
      expect(classifier.isText('varchar')).to.be.false;
      expect(classifier.isDate('timestamp')).to.be.false;
      expect(classifier.isBoolean('boolean')).to.be.true;
    });
  });

  describe('TransactionSyntax', () => {
    it('mock implementation conforms to TransactionSyntax interface', () => {
      const syntax: TransactionSyntax = {
        begin: () => 'BEGIN',
        commit: () => 'COMMIT',
        rollback: () => 'ROLLBACK',
        savepoint: (name) => `SAVEPOINT ${name}`,
        releaseSavepoint: (name) => `RELEASE SAVEPOINT ${name}`,
        rollbackToSavepoint: (name) => `ROLLBACK TO SAVEPOINT ${name}`,
      };
      expect(syntax.begin()).to.equal('BEGIN');
      expect(syntax.commit()).to.equal('COMMIT');
      expect(syntax.rollback()).to.equal('ROLLBACK');
      expect(syntax.savepoint?.('sp1')).to.equal('SAVEPOINT sp1');
    });
  });

  describe('CompletionProvider', () => {
    it('mock implementation conforms to CompletionProvider interface', () => {
      const provider: CompletionProvider = {
        getKeywords: () => ['SELECT', 'FROM', 'WHERE'],
        getBuiltinFunctions: () => ['COUNT', 'SUM', 'AVG'],
        getSystemSchemas: () => ['information_schema', 'pg_catalog'],
      };
      expect(provider.getKeywords()).to.include('SELECT');
      expect(provider.getBuiltinFunctions()).to.include('COUNT');
      expect(provider.getSystemSchemas()).to.include('information_schema');
    });
  });

  describe('IndexAdvisor', () => {
    it('mock implementation conforms to IndexAdvisor interface', () => {
      const advisor: IndexAdvisor = {
        analyzeIndexUsage: async () => [
          { indexName: 'idx_users_email', tableName: 'users', recommendation: 'keep', reason: 'High usage' },
        ],
        suggestIndexes: async () => [
          { createStatement: 'CREATE INDEX idx_orders_date ON orders(date)', estimatedImprovement: '40%', reason: 'Frequent filter' },
        ],
      };
      expect(advisor.analyzeIndexUsage).to.be.a('function');
      expect(advisor.suggestIndexes).to.be.a('function');
    });
  });

  describe('ConnectionFormFieldDefinition', () => {
    it('mock implementation conforms to ConnectionFormFieldDefinition interface', () => {
      const field: ConnectionFormFieldDefinition = {
        id: 'host',
        label: 'Host',
        type: 'text',
        placeholder: 'localhost',
        required: true,
        defaultValue: 'localhost',
        helpText: 'The database server hostname',
        group: 'basic',
      };
      expect(field.id).to.equal('host');
      expect(field.type).to.equal('text');
      expect(field.required).to.be.true;
    });

    it('select type field includes options', () => {
      const field: ConnectionFormFieldDefinition = {
        id: 'sslmode',
        label: 'SSL Mode',
        type: 'select',
        options: [
          { label: 'Disable', value: 'disable' },
          { label: 'Require', value: 'require' },
        ],
      };
      expect(field.options).to.have.lengthOf(2);
      expect(field.options![0].value).to.equal('disable');
    });
  });

  describe('EngineRegistration', () => {
    it('requires category field', () => {
      const registration: EngineRegistration = {
        engine: 'testdb',
        displayName: 'TestDB',
        category: 'sql',
        driver: {} as DbDriver,
        dialect: {} as DbDialect,
        introspection: {} as IntrospectionProvider,
        featureFlags: {} as FeatureFlags,
      };
      expect(registration.category).to.equal('sql');
      expect(registration).to.have.property('category');
    });
  });

  describe('DatabaseCategory', () => {
    it('only accepts valid values', () => {
      const validCategories: DatabaseCategory[] = ['sql', 'nosql', 'graph', 'timeseries', 'keyvalue'];
      for (const cat of validCategories) {
        const registration: EngineRegistration = {
          engine: `test-${cat}`,
          displayName: `Test ${cat}`,
          category: cat,
          driver: {} as DbDriver,
          dialect: {} as DbDialect,
          introspection: {} as IntrospectionProvider,
          featureFlags: {} as FeatureFlags,
        };
        expect(registration.category).to.equal(cat);
      }
      // Verify all 5 categories are covered
      expect(validCategories).to.have.lengthOf(5);
    });
  });
});
