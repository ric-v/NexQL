import type { ConnectionFormFieldDefinition } from '@nexql/core/core/types/connectionForm';

/**
 * MySQL connection form field definitions.
 * Defines the fields shown in the connection dialog for MySQL databases.
 */
export const mysqlConnectionFormFields: ConnectionFormFieldDefinition[] = [
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
    placeholder: '3306',
    required: true,
    defaultValue: 3306,
    group: 'basic',
  },
  {
    id: 'database',
    label: 'Database',
    type: 'text',
    placeholder: 'mysql',
    required: false,
    group: 'basic',
  },
  {
    id: 'username',
    label: 'Username',
    type: 'text',
    placeholder: 'root',
    required: true,
    defaultValue: 'root',
    group: 'basic',
  },
  {
    id: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    required: false,
    group: 'basic',
  },
  // SSL fields
  {
    id: 'sslmode',
    label: 'SSL Mode',
    type: 'select',
    required: false,
    defaultValue: 'disable',
    options: [
      { label: 'Disable', value: 'disable' },
      { label: 'Prefer', value: 'prefer' },
      { label: 'Require', value: 'require' },
      { label: 'Verify CA', value: 'verify-ca' },
      { label: 'Verify Identity', value: 'verify-full' },
    ],
    group: 'ssl',
  },
  {
    id: 'sslCertPath',
    label: 'Client Certificate',
    type: 'file',
    placeholder: 'Path to client certificate',
    required: false,
    helpText: 'Path to the client SSL certificate file (.pem)',
    group: 'ssl',
  },
  {
    id: 'sslKeyPath',
    label: 'Client Key',
    type: 'file',
    placeholder: 'Path to client key',
    required: false,
    helpText: 'Path to the client SSL private key file (.pem)',
    group: 'ssl',
  },
  {
    id: 'sslRootCertPath',
    label: 'CA Certificate',
    type: 'file',
    placeholder: 'Path to CA certificate',
    required: false,
    helpText: 'Path to the root CA certificate file for server verification',
    group: 'ssl',
  },
  // Advanced fields
  {
    id: 'connectTimeout',
    label: 'Connection Timeout (s)',
    type: 'number',
    placeholder: '10',
    required: false,
    defaultValue: 10,
    helpText: 'Connection timeout in seconds',
    group: 'advanced',
  },
];
