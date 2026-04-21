/**
 * Normalizes a connection password from config or storage for use with `pg`.
 * VS Code / JSON settings may deserialize all-digit passwords as numbers.
 */
export function coerceConnectionPassword(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value.length > 0 ? value : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}
