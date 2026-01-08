export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString();
  if (!url.includes('/api/admin/')) {
    return fetch(input, init);
  }

  const { auth } = await import('@/lib/firebase');
  const user = auth?.currentUser || null;
  if (!user) {
    return fetch(input, init);
  }

  const token = await user.getIdToken();
  const envKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY || process.env.ADMIN_API_KEY;
  const adminApiKey = envKey || (process.env.NODE_ENV === 'development' ? 'test-admin-key-123' : undefined);

  if (process.env.NODE_ENV === 'production' && !adminApiKey) {
    console.warn('[ADMIN] ADMIN_API_KEY not present in production');
  }

  if (process.env.NODE_ENV !== 'production' && adminApiKey) {
    const masked = adminApiKey.slice(0, 4) + '*****';
    console.log('[ADMIN] Using API key from env');
    console.log('[ADMIN] Request to', url, 'with key:', masked);
  }

  const baseHeaders: Record<string, string> = {};
  const providedHeaders = init?.headers;
  if (providedHeaders instanceof Headers) {
    providedHeaders.forEach((value, key) => {
      baseHeaders[key] = value;
    });
  } else if (Array.isArray(providedHeaders)) {
    for (const [key, value] of providedHeaders) {
      baseHeaders[key] = String(value);
    }
  } else if (providedHeaders) {
    Object.assign(baseHeaders, providedHeaders as Record<string, string>);
  }

  const nextInit: RequestInit = {
    ...init,
    headers: {
      ...baseHeaders,
      ...(adminApiKey ? { 'x-admin-api-key': adminApiKey } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  return fetch(input, nextInit);
}

