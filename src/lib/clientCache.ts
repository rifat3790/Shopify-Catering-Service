/**
 * Ultra-fast In-Memory + SessionStorage Client Cache for Stale-While-Revalidate (SWR)
 * Allows Next.js pages to render instantly (0ms) from local cache,
 * while revalidating dynamically in the background without blocking the UI.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export function getClientCache<T = any>(key: string, maxAgeMs = 15000): T | null {
  if (typeof window === 'undefined') return null;

  // 1. Check in-memory Map (0ms lookup)
  const mem = memoryCache.get(key);
  if (mem && (Date.now() - mem.timestamp < maxAgeMs)) {
    return mem.data as T;
  }

  // 2. Check sessionStorage for persistence across page navigation
  try {
    const raw = sessionStorage.getItem(`sc_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw) as CacheEntry<T>;
      if (parsed && (Date.now() - parsed.timestamp < maxAgeMs)) {
        memoryCache.set(key, parsed);
        return parsed.data;
      }
    }
  } catch {
    // sessionStorage unavailable or quota exceeded
  }

  return null;
}

export function setClientCache<T = any>(key: string, data: T): void {
  if (typeof window === 'undefined') return;

  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);

  try {
    sessionStorage.setItem(`sc_cache_${key}`, JSON.stringify(entry));
  } catch {
    // quota exceeded or disabled
  }
}

export function clearClientCache(key?: string): void {
  if (typeof window === 'undefined') return;

  if (key) {
    memoryCache.delete(key);
    try {
      sessionStorage.removeItem(`sc_cache_${key}`);
    } catch {}
  } else {
    memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('sc_cache_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
    } catch {}
  }
}
