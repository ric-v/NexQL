/**
 * Server-side TypeClassifier resolver.
 * Uses DriverRegistry to resolve engine-specific classifiers.
 * This file must NOT be imported from renderer/browser code.
 */
import { DriverRegistry } from '../../core/db/registry';
import { DefaultTypeClassifier } from '../../core/db/DefaultTypeClassifier';
import type { TypeClassifier } from '../../core/db/TypeClassifier';

const defaultTypeClassifier = new DefaultTypeClassifier();

/**
 * Returns the TypeClassifier for the given engine, falling back to DefaultTypeClassifier.
 * Only call this from server-side (Node) code.
 */
export function getTypeClassifier(engine?: string): TypeClassifier {
  if (engine) {
    const registry = DriverRegistry.getInstance();
    if (registry.isRegistered(engine)) {
      const classifier = registry.getTypeClassifier(engine);
      if (classifier) {
        return classifier;
      }
    }
  }
  return defaultTypeClassifier;
}
