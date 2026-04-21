/**
 * Defines a single field in an engine-specific connection form.
 * Database Extensions provide an array of these to customize
 * the connection dialog for their engine.
 */
export interface ConnectionFormFieldDefinition {
  /** Unique field identifier */
  id: string;
  /** Human-readable label displayed next to the field */
  label: string;
  /** The input control type */
  type: 'text' | 'number' | 'password' | 'file' | 'select' | 'checkbox';
  /** Placeholder text shown when the field is empty */
  placeholder?: string;
  /** Whether the field must be filled before submitting */
  required?: boolean;
  /** Default value for the field */
  defaultValue?: string | number | boolean;
  /** Options for 'select' type fields */
  options?: { label: string; value: string }[];
  /** Help text displayed below the field */
  helpText?: string;
  /** Logical group for organizing fields (e.g., 'basic', 'ssl', 'ssh', 'advanced') */
  group?: string;
}
