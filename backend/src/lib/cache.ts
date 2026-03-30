interface CacheItem<T> {
  value: T;
  expiry: number;
}

export class SimpleCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 300000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }
}

// Global cache instances
export const expenseCache = new SimpleCache<any>(60000); // 1 minute
export const budgetCache = new SimpleCache<any>(300000); // 5 minutes
export const insightsCache = new SimpleCache<any>(600000); // 10 minutes

// Cleanup expired entries every 5 minutes
setInterval(() => {
  expenseCache.cleanup();
  budgetCache.cleanup();
  insightsCache.cleanup();
}, 300000);
