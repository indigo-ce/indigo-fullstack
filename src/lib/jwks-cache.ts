import {createAuth} from "@/lib/auth";

interface JWKS {
  keys: any[];
}

interface CachedJWKS {
  keys: JWKS;
  expiresAt: number;
}

class JWKSCache {
  private cache: CachedJWKS | null = null;
  private readonly ttlMs: number;
  private lastRefreshAt = 0;
  private readonly forcedRefreshIntervalMs = 60 * 1000;
  private emptyKeys: JWKS | null = null;

  constructor(ttlMs = 3600000 * 24 * 30) {
    // Default 30 days TTL
    this.ttlMs = ttlMs;
  }

  async getKeys(
    auth: ReturnType<typeof createAuth>,
    forceRefresh = false
  ): Promise<JWKS> {
    const now = Date.now();

    if (this.cache && now < this.cache.expiresAt && !forceRefresh) {
      return this.cache.keys;
    }

    if (
      forceRefresh &&
      now - this.lastRefreshAt < this.forcedRefreshIntervalMs
    ) {
      // Throttled: serve what we have instead of another D1 read. A forced
      // refresh skips the TTL check by design, so this covers the stale
      // entry too while getJwks() is failing, not just fresh or empty ones.
      if (this.cache) {
        return this.cache.keys;
      }
      if (this.emptyKeys) {
        return this.emptyKeys;
      }
    }

    if (forceRefresh) {
      // Bound forced D1 refreshes for repeated invalid-token requests.
      this.lastRefreshAt = now;
    }

    return this.refreshKeys(auth);
  }

  private async refreshKeys(
    auth: ReturnType<typeof createAuth>
  ): Promise<JWKS> {
    try {
      const keys = await auth.api.getJwks();
      if (keys.keys.length > 0) {
        this.cache = {
          keys,
          expiresAt: Date.now() + this.ttlMs
        };
        this.emptyKeys = null;
      } else {
        // An empty key set is never a valid answer (the signing key is
        // created lazily on first sign-in), so don't cache it as one.
        this.emptyKeys = keys;
        this.lastRefreshAt = Date.now();
      }
      return keys;
    } catch (error) {
      console.error("Failed to refresh JWKS:", error);
      if (this.cache) {
        // Return stale cache on error
        return this.cache.keys;
      }
      throw error;
    }
  }

  // Call this method to force refresh
  async invalidateCache(): Promise<void> {
    this.cache = null;
    this.emptyKeys = null;
    this.lastRefreshAt = 0;
  }
}

// Create singleton instance
const jwksCache = new JWKSCache();
export default jwksCache;
