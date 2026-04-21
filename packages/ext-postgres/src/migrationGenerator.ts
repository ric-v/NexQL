import type { MigrationStatementGenerator } from '@nexql/core/core/db/MigrationStatementGenerator';
import type { TableDiff, ColumnDiff, ConstraintDiff, IndexDiff } from '@nexql/core/features/schemaDiff/schemaDiffTypes';

/**
 * PostgreSQL migration statement generator.
 * Converts schema diffs into PostgreSQL-specific ALTER/CREATE/DROP statements.
 */
export class PostgresMigrationGenerator implements MigrationStatementGenerator {
  buildMigrationStatements(sourceSchema: string, targetSchema: string, diffs: TableDiff[]): string[] {
    const statements: string[] = [];

    for (const diff of diffs) {
      switch (diff.status) {
        case 'added':
          statements.push(...this.buildCreateTable(targetSchema, diff));
          break;
        case 'removed':
          statements.push(this.buildDropTable(sourceSchema, diff));
          break;
        case 'changed':
          statements.push(...this.buildAlterTable(targetSchema, diff));
          break;
        // 'unchanged' — no statements needed
      }
    }

    return statements;
  }

  private buildCreateTable(schema: string, diff: TableDiff): string[] {
    const statements: string[] = [];
    const tableName = `"${schema}"."${diff.name}"`;

    const addedColumns = diff.columnDiffs.filter(c => c.status === 'added' && c.after);
    if (addedColumns.length > 0) {
      const colDefs = addedColumns.map(col => {
        const snap = col.after!;
        let def = `  "${snap.column_name}" ${snap.data_type}`;
        if (snap.not_null) {
          def += ' NOT NULL';
        }
        if (snap.default_value !== null) {
          def += ` DEFAULT ${snap.default_value}`;
        }
        return def;
      });
      statements.push(`CREATE TABLE ${tableName} (\n${colDefs.join(',\n')}\n);`);
    } else {
      statements.push(`CREATE TABLE ${tableName} ();`);
    }

    // Add constraints
    for (const constraint of diff.constraintDiffs.filter(c => c.status === 'added' && c.after)) {
      statements.push(`ALTER TABLE ${tableName} ADD CONSTRAINT "${constraint.after!.name}" ${constraint.after!.definition};`);
    }

    // Add indexes
    for (const index of diff.indexDiffs.filter(i => i.status === 'added' && i.after && !i.after.is_primary)) {
      statements.push(`${index.after!.definition};`);
    }

    return statements;
  }

  private buildDropTable(schema: string, diff: TableDiff): string {
    return `DROP TABLE IF EXISTS "${schema}"."${diff.name}" CASCADE;`;
  }

  private buildAlterTable(schema: string, diff: TableDiff): string[] {
    const statements: string[] = [];
    const tableName = `"${schema}"."${diff.name}"`;

    // Handle column changes
    for (const colDiff of diff.columnDiffs) {
      statements.push(...this.buildColumnStatements(tableName, colDiff));
    }

    // Handle constraint changes
    for (const conDiff of diff.constraintDiffs) {
      statements.push(...this.buildConstraintStatements(tableName, conDiff));
    }

    // Handle index changes
    for (const idxDiff of diff.indexDiffs) {
      statements.push(...this.buildIndexStatements(schema, idxDiff));
    }

    return statements;
  }

  private buildColumnStatements(tableName: string, colDiff: ColumnDiff): string[] {
    const statements: string[] = [];

    switch (colDiff.status) {
      case 'added':
        if (colDiff.after) {
          let stmt = `ALTER TABLE ${tableName} ADD COLUMN "${colDiff.after.column_name}" ${colDiff.after.data_type}`;
          if (colDiff.after.not_null) {
            stmt += ' NOT NULL';
          }
          if (colDiff.after.default_value !== null) {
            stmt += ` DEFAULT ${colDiff.after.default_value}`;
          }
          stmt += ';';
          statements.push(stmt);
        }
        break;

      case 'removed':
        statements.push(`ALTER TABLE ${tableName} DROP COLUMN IF EXISTS "${colDiff.name}" CASCADE;`);
        break;

      case 'changed':
        if (colDiff.before && colDiff.after) {
          if (colDiff.before.data_type !== colDiff.after.data_type) {
            statements.push(`ALTER TABLE ${tableName} ALTER COLUMN "${colDiff.name}" TYPE ${colDiff.after.data_type};`);
          }
          if (colDiff.before.not_null !== colDiff.after.not_null) {
            if (colDiff.after.not_null) {
              statements.push(`ALTER TABLE ${tableName} ALTER COLUMN "${colDiff.name}" SET NOT NULL;`);
            } else {
              statements.push(`ALTER TABLE ${tableName} ALTER COLUMN "${colDiff.name}" DROP NOT NULL;`);
            }
          }
          if (colDiff.before.default_value !== colDiff.after.default_value) {
            if (colDiff.after.default_value === null) {
              statements.push(`ALTER TABLE ${tableName} ALTER COLUMN "${colDiff.name}" DROP DEFAULT;`);
            } else {
              statements.push(`ALTER TABLE ${tableName} ALTER COLUMN "${colDiff.name}" SET DEFAULT ${colDiff.after.default_value};`);
            }
          }
        }
        break;
    }

    return statements;
  }

  private buildConstraintStatements(tableName: string, conDiff: ConstraintDiff): string[] {
    const statements: string[] = [];

    switch (conDiff.status) {
      case 'added':
        if (conDiff.after) {
          statements.push(`ALTER TABLE ${tableName} ADD CONSTRAINT "${conDiff.after.name}" ${conDiff.after.definition};`);
        }
        break;
      case 'removed':
        statements.push(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS "${conDiff.name}" CASCADE;`);
        break;
      case 'changed':
        // Drop and recreate
        statements.push(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS "${conDiff.name}" CASCADE;`);
        if (conDiff.after) {
          statements.push(`ALTER TABLE ${tableName} ADD CONSTRAINT "${conDiff.after.name}" ${conDiff.after.definition};`);
        }
        break;
    }

    return statements;
  }

  private buildIndexStatements(schema: string, idxDiff: IndexDiff): string[] {
    const statements: string[] = [];

    switch (idxDiff.status) {
      case 'added':
        if (idxDiff.after && !idxDiff.after.is_primary) {
          statements.push(`${idxDiff.after.definition};`);
        }
        break;
      case 'removed':
        statements.push(`DROP INDEX IF EXISTS "${schema}"."${idxDiff.name}";`);
        break;
      case 'changed':
        // Drop and recreate
        statements.push(`DROP INDEX IF EXISTS "${schema}"."${idxDiff.name}";`);
        if (idxDiff.after && !idxDiff.after.is_primary) {
          statements.push(`${idxDiff.after.definition};`);
        }
        break;
    }

    return statements;
  }
}
