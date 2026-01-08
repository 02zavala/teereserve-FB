export function normalizeImageUrl(u?: string | null): string | null {
  if (!u || typeof u !== 'string') return null;
  
  const v = u.trim();
  if (!v) return null;
  
  // Check if it's a valid URL (http/https) or relative path
  if (!/^https?:\/\//i.test(v) && !v.startsWith('/')) return null;
  
  return v;
}

// Create a URL-friendly slug from a course name
export function slugify(input: string): string {
  return input
    .toString()
    // Normalize and strip diacritics
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    // Lowercase and trim
    .toLowerCase()
    .trim()
    // Remove invalid chars
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace whitespace with single hyphen
    .replace(/\s+/g, '-')
    // Collapse multiple hyphens
    .replace(/-+/g, '-');
}