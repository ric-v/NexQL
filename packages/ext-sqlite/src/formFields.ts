import type { ConnectionFormFieldDefinition } from '@nexql/core/core/types/connectionForm';

/**
 * SQLite connection form field definitions.
 * SQLite is file-based, so the primary field is a file path selector.
 */
export const sqliteConnectionFormFields: ConnectionFormFieldDefinition[] = [
  {
    id: 'database',
    label: 'Database File',
    type: 'file',
    placeholder: '/path/to/database.db',
    required: true,
    helpText: 'Path to the SQLite database file (.db, .sqlite, .sqlite3)',
    group: 'basic',
  },
  {
    id: 'password',
    label: 'Encryption Password',
    type: 'password',
    placeholder: 'Optional encryption password',
    required: false,
    helpText: 'Password for encrypted SQLite databases (e.g., SQLCipher)',
    group: 'basic',
  },
  {
    id: 'readOnlyMode',
    label: 'Open Read-Only',
    type: 'checkbox',
    required: false,
    defaultValue: false,
    helpText: 'Open the database in read-only mode to prevent accidental modifications',
    group: 'advanced',
  },
];
