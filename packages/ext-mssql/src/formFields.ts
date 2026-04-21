import type { ConnectionFormFieldDefinition } from '@nexql/core/core/types/connectionForm';

/**
 * MSSQL connection form field definitions.
 * Defines the fields shown in the connection dialog for SQL Server databases.
 */
export const mssqlConnectionFormFields: ConnectionFormFieldDefinition[] = [
  {
    id: 'host',
    label: 'Host',
    type: 'text',
    placeholder: 'localhost',
    required: true,
    defaultValue: 'localhost',
    group: 'basic',
  },
  {
    id: 'port',
    label: 'Port',
    type: 'number',
    placeholder: '1433',
    required: true,
    defaultValue: 1433,
    group: 'basic',
  },
  {
    id: 'database',
    label: 'Database',
    type: 'text',
    placeholder: 'master',
    required: false,
    defaultValue: 'master',
    group: 'basic',
  },
  {
    id: 'username',
    label: 'Username',
    type: 'text',
    placeholder: 'sa',
    required: true,
    defaultValue: 'sa',
    group: 'basic',
  },
  {
    id: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    required: true,
    group: 'basic',
  },
  // Encryption fields
  {
    id: 'encrypt',
    label: 'Encrypt Connection',
    type: 'checkbox',
    required: false,
    defaultValue: true,
    helpText: 'Encrypt the connection to SQL Server using TLS',
    group: 'ssl',
  },
  {
    id: 'trustServerCertificate',
    label: 'Trust Server Certificate',
    type: 'checkbox',
    required: false,
    defaultValue: false,
    helpText: 'Trust the server certificate without validation (useful for self-signed certs in development)',
    group: 'ssl',
  },
  // Advanced fields
  {
    id: 'connectTimeout',
    label: 'Connection Timeout (s)',
    type: 'number',
    placeholder: '15',
    required: false,
    defaultValue: 15,
    helpText: 'Connection timeout in seconds',
    group: 'advanced',
  },
  {
    id: 'requestTimeout',
    label: 'Request Timeout (s)',
    type: 'number',
    placeholder: '15',
    required: false,
    defaultValue: 15,
    helpText: 'Request timeout in seconds (0 for no timeout)',
    group: 'advanced',
  },
];
