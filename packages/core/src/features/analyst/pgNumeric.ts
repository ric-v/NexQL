/**
 * PostgreSQL type names treated as numeric for analyst features.
 * Kept in sync with ChartControls NUMERIC_PG_TYPES.
 *
 * This file is BROWSER-SAFE — it must NOT import vscode, node modules,
 * or DriverRegistry, because it's bundled into the renderer (browser) bundle
 * via the import chain: AnalystPanel → columnAggregates → pgNumeric.
 */
const NUMERIC_PG_TYPES = new Set([
  'int2',
  'int4',
  'int8',
  'float4',
  'float8',
  'numeric',
  'decimal',
  'money',
  'real',
  'double precision',
  'bigint',
  'integer',
  'smallint',
]);

/**
 * Browser-safe numeric type check using the built-in PG type set.
 * Does NOT import vscode or DriverRegistry.
 */
export function isPgNumericType(typeName: string | undefined, _engine?: string): boolean {
  if (!typeName) {
    return false;
  }

  const t = typeName.toLowerCase().trim();
  if (NUMERIC_PG_TYPES.has(t)) {
    return true;
  }
  return t.startsWith('int') || t.startsWith('float') || t.startsWith('numeric');
}
