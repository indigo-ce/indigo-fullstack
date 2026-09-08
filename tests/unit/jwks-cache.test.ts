import {beforeEach, describe, expect, it, vi} from "vitest";
import jwksCache from "@/lib/jwks-cache";

describe("JWKS cache", () => {
  beforeEach(async () => {
    await jwksCache.invalidateCache();
    vi.restoreAllMocks();
  });

  it("does not cache an empty key set", async () => {
    const getJwks = vi
      .fn()
      .mockResolvedValueOnce({keys: []})
      .mockResolvedValueOnce({keys: [{kty: "RSA", kid: "key-1"}]});
    const auth = {api: {getJwks}} as never;

    await jwksCache.getKeys(auth);
    const keys = await jwksCache.getKeys(auth);

    expect(getJwks).toHaveBeenCalledTimes(2);
    expect(keys.keys).toHaveLength(1);
  });

  it("throttles forced refreshes after an empty result", async () => {
    const getJwks = vi.fn().mockResolvedValue({keys: []});
    const auth = {api: {getJwks}} as never;

    await jwksCache.getKeys(auth);
    const keys = await jwksCache.getKeys(auth, true);

    expect(getJwks).toHaveBeenCalledTimes(1);
    expect(keys).toEqual({keys: []});
  });
});
