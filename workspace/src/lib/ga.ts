export type GAEventParams = Record<string, any>;

export function gtagEvent(eventName: string, params: GAEventParams = {}) {
  if (typeof window === 'undefined') return;
  const g = (window as any).gtag;
  if (typeof g === 'function') {
    g('event', eventName, params);
  } else {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push(['event', eventName, params]);
  }
}

export function getGaClientId(): string | null {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie.split('; ').find(c => c.startsWith('_ga='));
  if (!cookie) return null;
  const value = cookie.split('=')[1];
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length >= 4) {
    return `${parts[2]}.${parts[3]}`;
  }
  return null;
}
