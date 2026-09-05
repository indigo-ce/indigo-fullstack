import {env} from "cloudflare:test";
import {describe, expect, it} from "vitest";

describe("Workers environment bindings", () => {
  it("round-trips values through the session KV namespace", async () => {
    const key = `binding-test-${crypto.randomUUID()}`;
    const value = "session-binding-value";

    await env.SESSION.put(key, value);

    await expect(env.SESSION.get(key)).resolves.toBe(value);
  });

  it("sends messages through the email queue producer", async () => {
    // The producer resolves with delivery metadata; only the send succeeding
    // is part of the contract we care about here.
    await expect(
      env.EMAIL_QUEUE.send({type: "binding-test"})
    ).resolves.not.toThrow();
  });
});
