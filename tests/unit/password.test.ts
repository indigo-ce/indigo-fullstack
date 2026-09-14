import {describe, expect, it} from "vitest";
import {hashPassword as hashLegacyPassword} from "better-auth/crypto";
import {PBKDF2_ITERATIONS, hashPassword, verifyPassword} from "@/lib/password";

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Derive a PBKDF2 hash at an explicit iteration count, so the test can prove
// verification reads the count out of the stored string rather than out of
// the module constant.
async function pbkdf2At(password: string, iterations: number): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.buffer,
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  return `$pbkdf2$${iterations}$${bufferToHex(salt.buffer)}$${bufferToHex(hash)}`;
}

describe("password hashing", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash).toMatch(
      new RegExp(
        `^\\$pbkdf2\\$${PBKDF2_ITERATIONS}\\$[0-9a-f]{32}\\$[0-9a-f]{64}$`
      )
    );
    await expect(
      verifyPassword({
        password: "correct horse battery staple",
        hash
      })
    ).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct password");

    await expect(
      verifyPassword({password: "wrong password", hash})
    ).resolves.toBe(false);
  });

  it("uses a distinct salt for each hash", async () => {
    const firstHash = await hashPassword("same password");
    const secondHash = await hashPassword("same password");

    expect(firstHash).not.toBe(secondHash);
    await expect(
      verifyPassword({password: "same password", hash: firstHash})
    ).resolves.toBe(true);
    await expect(
      verifyPassword({password: "same password", hash: secondHash})
    ).resolves.toBe(true);
  });

  it.each([
    "",
    "not-a-password-hash",
    "not-a-hash",
    "$pbkdf2$abc$xx$yy",
    "$pbkdf2$600000$not-hex$0000000000000000000000000000000000000000000000000000000000000000",
    "$pbkdf2$600000$00000000000000000000000000000000$short"
  ])("returns false without throwing for malformed hash %s", async (hash) => {
    await expect(verifyPassword({password: "password", hash})).resolves.toBe(
      false
    );
  });

  it("verifies a hash written at a different iteration count", async () => {
    const hash = await pbkdf2At("same password", 1000);

    await expect(
      verifyPassword({password: "same password", hash})
    ).resolves.toBe(true);
    await expect(
      verifyPassword({password: "other password", hash})
    ).resolves.toBe(false);
  });

  it("still verifies hashes written by the auth library's default verifier", async () => {
    // Hashes stored before this module existed use Better Auth's own scrypt
    // format; verification for them is delegated, so a pre-existing account
    // keeps signing in.
    const legacyHash = await hashLegacyPassword("legacy password");

    expect(legacyHash).not.toMatch(/^\$pbkdf2\$/);
    await expect(
      verifyPassword({password: "legacy password", hash: legacyHash})
    ).resolves.toBe(true);
    await expect(
      verifyPassword({password: "wrong password", hash: legacyHash})
    ).resolves.toBe(false);
  });
});
