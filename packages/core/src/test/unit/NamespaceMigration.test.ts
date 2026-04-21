import { expect } from 'chai';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

/**
 * **Validates: Requirements 1.1**
 * Property test for namespace migration — verifies all identifiers in
 * package.json use the `nexql.` prefix and none contain the legacy
 * `postgres-explorer.` prefix.
 */
describe('NamespaceMigration', () => {
  let packageJson: any;

  before(() => {
    const pkgPath = path.resolve(__dirname, '../../../../package.json');
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    packageJson = JSON.parse(raw);
  });

  function extractCommandIds(): string[] {
    const commands = packageJson.contributes?.commands ?? [];
    return commands.map((cmd: any) => cmd.command).filter(Boolean);
  }

  function extractViewIds(): string[] {
    const views = packageJson.contributes?.views ?? {};
    const ids: string[] = [];
    for (const container of Object.values(views) as any[]) {
      for (const view of container) {
        if (view.id) {
          ids.push(view.id);
        }
      }
    }
    return ids;
  }

  function extractViewContainerIds(): string[] {
    const containers = packageJson.contributes?.viewsContainers?.activitybar ?? [];
    return containers.map((c: any) => c.id).filter(Boolean);
  }

  function extractKeybindingCommands(): string[] {
    const keybindings = packageJson.contributes?.keybindings ?? [];
    return keybindings.map((kb: any) => kb.command).filter(Boolean);
  }

  function extractMenuCommands(): string[] {
    const menus = packageJson.contributes?.menus ?? {};
    const commands: string[] = [];
    for (const menuItems of Object.values(menus) as any[]) {
      if (Array.isArray(menuItems)) {
        for (const item of menuItems) {
          if (item.command) {
            commands.push(item.command);
          }
          // Also check 'when' clauses for context keys
          if (item.when && typeof item.when === 'string') {
            // Extract identifiers from when clauses that look like nexql.* or postgres-explorer.*
            const matches = item.when.match(/[\w-]+\.[\w.]+/g);
            if (matches) {
              commands.push(...matches);
            }
          }
        }
      }
    }
    return commands;
  }

  describe('Command IDs use nexql. prefix', () => {
    it('every command ID starts with nexql.', () => {
      const commandIds = extractCommandIds();
      expect(commandIds.length).to.be.greaterThan(0);

      for (const id of commandIds) {
        expect(id, `Command "${id}" should start with "nexql."`).to.match(/^nexql\./);
      }
    });

    it('no command ID contains the legacy postgres-explorer. prefix', () => {
      const commandIds = extractCommandIds();

      for (const id of commandIds) {
        expect(id, `Command "${id}" should not contain legacy prefix`).to.not.contain('postgres-explorer.');
      }
    });
  });

  describe('View IDs use nexql prefix', () => {
    it('every view ID starts with nexql', () => {
      const viewIds = extractViewIds();
      expect(viewIds.length).to.be.greaterThan(0);

      for (const id of viewIds) {
        expect(id, `View "${id}" should start with "nexql"`).to.match(/^nexql/);
      }
    });

    it('no view ID contains the legacy postgres-explorer. prefix', () => {
      const viewIds = extractViewIds();

      for (const id of viewIds) {
        expect(id, `View "${id}" should not contain legacy prefix`).to.not.contain('postgres-explorer.');
      }
    });
  });

  describe('View container IDs use nexql prefix', () => {
    it('every view container ID starts with nexql', () => {
      const containerIds = extractViewContainerIds();
      expect(containerIds.length).to.be.greaterThan(0);

      for (const id of containerIds) {
        expect(id, `View container "${id}" should start with "nexql"`).to.match(/^nexql/);
      }
    });

    it('no view container ID contains the legacy postgres-explorer prefix', () => {
      const containerIds = extractViewContainerIds();

      for (const id of containerIds) {
        expect(id, `View container "${id}" should not contain legacy prefix`).to.not.contain('postgres-explorer');
      }
    });
  });

  describe('Keybinding commands use nexql. prefix', () => {
    it('every keybinding command starts with nexql.', () => {
      const commands = extractKeybindingCommands();
      expect(commands.length).to.be.greaterThan(0);

      for (const cmd of commands) {
        expect(cmd, `Keybinding command "${cmd}" should start with "nexql."`).to.match(/^nexql\./);
      }
    });

    it('no keybinding command contains the legacy postgres-explorer. prefix', () => {
      const commands = extractKeybindingCommands();

      for (const cmd of commands) {
        expect(cmd, `Keybinding command "${cmd}" should not contain legacy prefix`).to.not.contain('postgres-explorer.');
      }
    });
  });

  describe('Menu contributions use nexql. prefix', () => {
    it('no menu command contains the legacy postgres-explorer. prefix', () => {
      const commands = extractMenuCommands();
      // Filter to only actual command references (not when-clause context keys)
      const commandRefs = commands.filter(c => !c.includes(' '));

      for (const cmd of commandRefs) {
        expect(cmd, `Menu command "${cmd}" should not contain legacy prefix`).to.not.contain('postgres-explorer.');
      }
    });
  });

  describe('Property-based namespace validation', () => {
    /**
     * **Validates: Requirements 1.1**
     * All identifiers across all contribution points use the nexql. prefix
     * and none contain the legacy postgres-explorer. prefix.
     */
    it('PBT: all identifiers use nexql prefix and none use legacy prefix', () => {
      const allIdentifiers: string[] = [
        ...extractCommandIds(),
        ...extractViewIds(),
        ...extractViewContainerIds(),
        ...extractKeybindingCommands(),
      ];

      // Use fast-check to sample random subsets and verify the property holds
      fc.assert(
        fc.property(
          fc.constantFrom(...allIdentifiers),
          (identifier) => {
            // Property 1: identifier uses nexql prefix
            expect(identifier).to.match(/^nexql/);
            // Property 2: identifier does NOT use legacy prefix
            expect(identifier).to.not.contain('postgres-explorer.');
          }
        ),
        { numRuns: Math.min(allIdentifiers.length * 2, 200) }
      );
    });
  });
});
