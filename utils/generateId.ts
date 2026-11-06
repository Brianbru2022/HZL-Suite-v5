/**
 * Generates a collision-safe unique ID for entities (items, dimensions, projects, etc.).
 * Uses crypto.randomUUID() when available, with a fallback for older environments.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers / non-secure contexts (e.g. some unit test envs)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
