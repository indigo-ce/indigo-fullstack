import {beforeEach, describe, expect, it, vi} from "vitest";
import jwksCache from "@/lib/jwks-cache";

describe("JWKS cache", () => {
  beforeEach(async () => {
    await jwksCache.invalidateCache();
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
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

  it("serves the stale entry to throttled forced refreshes while D1 is down", async () => {
    const liveKeys = {keys: [{kty: "RSA", kid: "key-1"}]};
    const getJwks = vi.fn().mockResolvedValue(liveKeys);
    const auth = {api: {getJwks}} as never;

    await jwksCache.getKeys(auth);
    expect(getJwks).toHaveBeenCalledTimes(1);

    // Expire the entry and take D1 down: the normal path keeps serving the
    // stale entry after one failed read.
    const expiredAt = Date.now() + 3600000 * 24 * 30 + 1000;
    vi.spyOn(Date, "now").mockReturnValue(expiredAt);
    getJwks.mockRejectedValue(new Error("D1 unavailable"));

    await expect(jwksCache.getKeys(auth)).resolves.toEqual(liveKeys);
    expect(getJwks).toHaveBeenCalledTimes(2);

    await expect(jwksCache.getKeys(auth, true)).resolves.toEqual(liveKeys);
    expect(getJwks).toHaveBeenCalledTimes(3);

    // Inside the throttle window the forced refresh must not spend a second
    // failed D1 read just because the entry is expired.
    await expect(jwksCache.getKeys(auth, true)).resolves.toEqual(liveKeys);
    expect(getJwks).toHaveBeenCalledTimes(3);
  });
});
