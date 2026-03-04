/**
 * Simple UUID v4 generator
 * Used for temporary reminder IDs before syncing to Supabase
 */
export function generateUUID(): string {
  // Generate a UUID v4 compatible string
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hex = (): string => {
    return Math.floor(Math.random() * 16).toString(16);
  };

  const hyphens = (count: number): string => {
    return Array.from({ length: count }, hex).join('');
  };

  return [
    hyphens(8),
    hyphens(4),
    '4' + hyphens(3), // Version 4
    (Math.floor(Math.random() * 4) + 8).toString(16) + hyphens(3), // Variant 1 (10xx xxxx)
    hyphens(12)
  ].join('-');
}
