import {verifyPassword as verifyLegacyPassword} from "better-auth/crypto";

/**
 * PBKDF2-SHA256 password hashing through the Web Crypto API, which runs
 * natively in the Workers runtime instead of the pure-JS scrypt fallback
 * Better Auth's default resolves on the Worker.
 *
 * Format: $pbkdf2$<iterations>$<saltHex>$<hashHex>
 */

// 600,000 PBKDF2 iterations is the OWASP-recommended work factor for
// PBKDF2-HMAC-SHA256 and is deliberate: Web Crypto runs it natively, so the
// per-request cost is on the order of tens of milliseconds rather than a
// CPU-budget problem, and the value must not be reduced merely to trim that
// cost — it is the offline-cracking resistance of every stored hash.
const ITERATIONS = 600000;
const HASH_LENGTH = 32;
const SALT_LENGTH = 16;

export const PBKDF2_ITERATIONS = ITERATIONS;

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string, expectedLength: number): ArrayBuffer | null {
  if (hex.length !== expectedLength * 2 || !/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }

  const bytes = new Uint8Array(expectedLength);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer;
}

async function deriveKey(
  password: string,
  salt: ArrayBuffer,
  iterations: number
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    HASH_LENGTH * 8
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const hash = await deriveKey(password, salt.buffer, ITERATIONS);

  return `$pbkdf2$${ITERATIONS}$${bufferToHex(salt.buffer)}$${bufferToHex(hash)}`;
}

export async function verifyPassword(data: {
  password: string;
  hash: string;
}): Promise<boolean> {
  const {password, hash} = data;

  // Hashes written before this module existed use Better Auth's own format
  // (scrypt, stored as `<saltHex>:<keyHex>`), so verification for those is
  // delegated to the library's verifier rather than rejecting every account
  // created before this change. The shape check matters: the delegated
  // verifier throws on anything that is not a `salt:key` pair, so an input
  // that cannot be a legacy hash returns false here without ever reaching it.
  if (!hash.startsWith("$pbkdf2$")) {
    if (!/^[0-9a-f]+:[0-9a-f]+$/i.test(hash)) {
      return false;
    }
    try {
      return await verifyLegacyPassword({hash, password});
    } catch {
      return false;
    }
  }

  try {
    const parts = hash.split("$");
    if (parts.length !== 5 || parts[1] !== "pbkdf2") {
      return false;
    }

    // Read the iteration count out of the stored string rather than from the
    // constant, so the count can be raised later without invalidating hashes
    // written at an older value.
    const iterations = Number(parts[2]);
    if (!Number.isInteger(iterations) || iterations <= 0) {
      return false;
    }

    const salt = hexToBuffer(parts[3], SALT_LENGTH);
    const storedHash = hexToBuffer(parts[4], HASH_LENGTH);
    if (!salt || !storedHash) {
      return false;
    }

    const derivedHash = new Uint8Array(
      await deriveKey(password, salt, iterations)
    );
    const storedHashBytes = new Uint8Array(storedHash);

    // Constant-time comparison: accumulate the XOR over the full length so a
    // mismatch anywhere does not short-circuit on position.
    let result = 0;
    for (let i = 0; i < storedHashBytes.length; i++) {
      result |= storedHashBytes[i] ^ derivedHash[i];
    }

    return result === 0;
  } catch {
    return false;
  }
}
