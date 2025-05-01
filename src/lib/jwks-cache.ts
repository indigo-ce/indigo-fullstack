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

  constructor(ttlMs = 3600000 * 24 * 30) {
    // Default 30 days TTL
    this.ttlMs = ttlMs;
  }

  async getKeys(auth: ReturnType<typeof createAuth>): Promise<JWKS> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.keys;
    }
    return this.refreshKeys(auth);
  }

  private async refreshKeys(
    auth: ReturnType<typeof createAuth>
  ): Promise<JWKS> {
    try {
      const keys = await auth.api.getJwks();
      this.cache = {
        keys,
        expiresAt: Date.now() + this.ttlMs
      };
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
  }
}

// Create singleton instance
const jwksCache = new JWKSCache();
export default jwksCache;
