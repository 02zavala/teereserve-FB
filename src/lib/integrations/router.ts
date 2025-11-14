import type { TeeSheetProvider } from './TeeSheetProvider';

let cachedProvider: TeeSheetProvider | null = null;

export async function getProvider(): Promise<TeeSheetProvider> {
  if (cachedProvider) return cachedProvider;
  const providerName = (process.env.TEE_PROVIDER || 'mock').toLowerCase();
  switch (providerName) {
    case 'mock':
    default: {
      const mod = await import('./mock');
      cachedProvider = mod.mockProvider;
      return cachedProvider;
    }
  }
}