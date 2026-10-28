/**
 * Small dependency-free unique id generator, good enough for an in-memory
 * demo store. Swap for a real UUID lib or let the backend assign ids once a
 * real API is wired up.
 */
export function generateId(prefix = 'usr'): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}
