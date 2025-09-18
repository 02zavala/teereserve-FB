export function normalizeImageUrl(u?: string | null): string | null {
  if (!u || typeof u !== 'string') return null;
  
  const v = u.trim();
  if (!v) return null;
  
  // Check if it's a valid URL (http/https) or relative path
  if (!/^https?:\/\//i.test(v) && !v.startsWith('/')) return null;
  
  return v;
}