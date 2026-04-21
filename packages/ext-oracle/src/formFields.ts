import type { ConnectionFormFieldDefinition } from '@nexql/core/core/types/connectionForm';

/**
 * Oracle connection form field definitions.
 * Defines the fields shown in the connection dialog for Oracle databases.
 * Supports basic (host/port/service), TNS, and LDAP connection types.
 */
export const oracleConnectionFormFields: ConnectionFormFieldDefinition[] = [
  {
    id: 'connectionType',
    label: 'Connection Type',
    type: 'select',
    required: true,
    defaultValue: 'basic',
    options: [
      { label: 'Basic (Host/Port/Service)', value: 'basic' },
      { label: 'TNS Name', value: 'tns' },
      { label: 'LDAP', value: 'ldap' },
    ],
    group: 'basic',
  },
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
    placeholder: '1521',
    required: true,
    defaultValue: 1521,
    group: 'basic',
  },
  {
    id: 'serviceName',
    label: 'Service Name',
    type: 'text',
    placeholder: 'ORCL',
    required: false,
    helpText: 'Oracle service name (preferred over SID for RAC environments)',
    group: 'basic',
  },
  {
    id: 'sid',
    label: 'SID',
    type: 'text',
    placeholder: 'ORCL',
    required: false,
    helpText: 'Oracle System Identifier (use Service Name for newer databases)',
    group: 'basic',
  },
  {
    id: 'username',
    label: 'Username',
    type: 'text',
    placeholder: 'system',
    required: true,
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
  {
    id: 'tnsName',
    label: 'TNS Name',
    type: 'text',
    placeholder: 'MYDB',
    required: false,
    helpText: 'TNS alias as defined in tnsnames.ora',
    group: 'basic',
  },
  {
    id: 'ldapUrl',
    label: 'LDAP URL',
    type: 'text',
    placeholder: 'ldap://ldap.example.com:389',
    required: false,
    helpText: 'LDAP directory URL for Oracle Net name resolution',
    group: 'basic',
  },
  // Advanced fields
  {
    id: 'connectTimeout',
    label: 'Connection Timeout (s)',
    type: 'number',
    placeholder: '30',
    required: false,
    defaultValue: 30,
    helpText: 'Connection timeout in seconds',
    group: 'advanced',
  },
  {
    id: 'role',
    label: 'Role',
    type: 'select',
    required: false,
    defaultValue: 'default',
    options: [
      { label: 'Default', value: 'default' },
      { label: 'SYSDBA', value: 'sysdba' },
      { label: 'SYSOPER', value: 'sysoper' },
    ],
    helpText: 'Administrative role for privileged connections',
    group: 'advanced',
  },
];
