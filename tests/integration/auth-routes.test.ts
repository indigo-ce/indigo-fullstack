import {beforeAll, describe, expect, it} from "vitest";
import {applyD1Migrations, env} from "cloudflare:test";
import {eq} from "drizzle-orm";
import {createDrizzle} from "@/db";
import {familyRevocation, rotatedToken, user, session} from "@/db/schema";
import {createAuth} from "@/lib/auth";
import {
  rotationTestHooks
} from "@/plugins/better-auth/refresh-access";
import {createHonoApp} from "@/pages/api/[...path]";

const email = "auth-routes-integration@example.com";
const password = "password123";
const name = "Auth Routes Integration User";

type SignInResponse = {
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
  };
  accessToken: string;
  refreshToken: string;
  tokenType: string;
};

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
};

const app = createHonoApp(env as Env);
let userId: string;

async function request(
  path: string,
  body?: Record<string, string>,
  headers?: HeadersInit
): Promise<Response> {
  return app.fetch(
    new Request(`http://localhost/api/v1${path}`, {
      method: "POST",
      headers: {
        ...(body ? {"Content-Type": "application/json"} : {}),
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    })
  );
}

async function responseBody(
  response: Response
): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function assertSignInResponse(data: Record<string, unknown>): SignInResponse {
  expect(Object.keys(data).sort()).toEqual([
    "accessToken",
    "refreshToken",
    "tokenType",
    "user"
  ]);
  expect(data.accessToken).toEqual(expect.any(String));
  expect(data.refreshToken).toEqual(expect.any(String));
  expect(data.tokenType).toBe("Bearer");
  expect(data.user).toEqual({
    id: userId,
    email,
    name,
    image: null
  });

  return data as unknown as SignInResponse;
}

async function signIn(): Promise<SignInResponse> {
  const response = await request("/auth/sign-in", undefined, {
    Authorization: `Basic ${btoa(`${email}:${password}`)}`
  });
  expect(response.status).toBe(200);
  return assertSignInResponse(await responseBody(response));
}

describe("Auth Routes Integration Tests", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    await createAuth(env as Env).api.signUpEmail({
      body: {email, password, name}
    });

    const db = createDrizzle(env.DB);
    const createdUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .get();
    if (!createdUser) throw new Error("Integration test user was not created");
    userId = createdUser.id;
  });

  it("returns the real token response for valid basic auth", async () => {
    const data = await signIn();

    expect(data.user.id).toBe(userId);
    expect(data.user.email).toBe(email);
    expect(data.user.name).toBe(name);
  });

  it("returns 400 when sign-in authorization is missing", async () => {
    const response = await request("/auth/sign-in");

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      error: "Email and password are required"
    });
  });

  it("returns refreshed access and refresh tokens", async () => {
    const {refreshToken} = await signIn();
    const response = await request("/auth/refresh-access", {
      refreshToken
    });
    const data = (await responseBody(response)) as unknown as TokenResponse;

    expect(response.status).toBe(200);
    expect(Object.keys(data).sort()).toEqual([
      "accessToken",
      "refreshToken",
      "tokenType"
    ]);
    expect(data.accessToken).toEqual(expect.any(String));
    expect(data.refreshToken).toEqual(expect.any(String));
    expect(data.tokenType).toBe("Bearer");
  });

  it("returns 400 when refresh token is missing", async () => {
    const response = await request("/auth/refresh-access", {});

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      error: "Missing refresh token"
    });
  });

  it("returns a client error for an empty body on refresh-access", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/auth/refresh-access", {
        method: "POST"
      })
    );

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      error: "Invalid JSON body"
    });
  });

  it("returns 401 for a garbage refresh token", async () => {
    const response = await request("/auth/refresh-access", {
      refreshToken: "garbage-refresh-token"
    });

    expect(response.status).toBe(401);
    await expect(responseBody(response)).resolves.toEqual({
      error: "Invalid or expired refresh token"
    });
  });

  it("returns 401 for an expired refresh token", async () => {
    const db = createDrizzle(env.DB);
    const now = new Date();
    await db.insert(session).values({
      id: "expired-refresh-session",
      expiresAt: new Date(now.getTime() - 60_000),
      token: "expired-refresh-token",
      createdAt: new Date(now.getTime() - 120_000),
      updatedAt: new Date(now.getTime() - 120_000),
      userId,
      familyId: "expired-refresh-session"
    });

    const response = await request("/auth/refresh-access", {
      refreshToken: "expired-refresh-token"
    });

    expect(response.status).toBe(401);
    await expect(responseBody(response)).resolves.toEqual({
      error: "Invalid or expired refresh token"
    });
  });

  it("keeps revocation idempotent for an unknown token", async () => {
    const response = await request("/auth/revoke-access", {
      refreshToken: "unknown-revoke-token"
    });

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({success: true});
  });

  it("gives the session created at sign-in the 30-day refresh-token lifetime", async () => {
    const {refreshToken} = await signIn();
    const db = createDrizzle(env.DB);
    const row = await db
      .select()
      .from(session)
      .where(eq(session.token, refreshToken))
      .get();
    if (!row)
      throw new Error("Session row for the refresh token was not found");

    const expected = Date.now() + 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(row.expiresAt.getTime() - expected)).toBeLessThan(60_000);
  });

  it("preserves the refresh-token lifetime across rotation", async () => {
    const {refreshToken} = await signIn();
    const db = createDrizzle(env.DB);
    const original = await db
      .select()
      .from(session)
      .where(eq(session.token, refreshToken))
      .get();
    if (!original)
      throw new Error("Session row for the refresh token was not found");

    const response = await request("/auth/refresh-access", {
      refreshToken
    });
    expect(response.status).toBe(200);
    const data = (await responseBody(response)) as unknown as TokenResponse;

    const rotated = await db
      .select()
      .from(session)
      .where(eq(session.token, data.refreshToken))
      .get();
    if (!rotated)
      throw new Error(
        "Session row for the rotated refresh token was not found"
      );

    expect(
      Math.abs(rotated.expiresAt.getTime() - original.expiresAt.getTime())
    ).toBeLessThan(60_000);
  });

  it("rotates refresh tokens and rejects the previous token", async () => {
    const {refreshToken} = await signIn();
    const response = await request("/auth/refresh-access", {
      refreshToken
    });
    const data = (await responseBody(response)) as unknown as TokenResponse;

    expect(response.status).toBe(200);
    expect(data.refreshToken).toEqual(expect.any(String));
    expect(data.refreshToken).not.toBe(refreshToken);

    const oldTokenResponse = await request("/auth/refresh-access", {
      refreshToken
    });
    expect(oldTokenResponse.status).toBe(401);
    await expect(responseBody(oldTokenResponse)).resolves.toEqual({
      error: "Invalid or expired refresh token"
    });
  });

  it("no longer accepts a refresh token passed as a query parameter", async () => {
    const {refreshToken} = await signIn();
    const handlerResponse = await createAuth(env as Env).handler(
      new Request(
        `http://localhost/api/auth/auth-tokens/refresh?refreshToken=${encodeURIComponent(refreshToken)}`,
        {method: "POST"}
      )
    );

    expect(handlerResponse.status).toBe(400);

    // The token was not consumed: it still refreshes through the v1 API.
    const response = await request("/auth/refresh-access", {refreshToken});
    expect(response.status).toBe(200);
  });

  it("allows only one concurrent refresh to consume a token", async () => {
    const {refreshToken} = await signIn();
    const responses = await Promise.all([
      request("/auth/refresh-access", {refreshToken}),
      request("/auth/refresh-access", {refreshToken})
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 401
    ]);
    const rejectedResponse = responses.find(
      (response) => response.status === 401
    );
    expect(rejectedResponse).toBeDefined();
    await expect(responseBody(rejectedResponse!)).resolves.toEqual({
      error: "Invalid or expired refresh token"
    });
  });

  it("rejects a revoked refresh token", async () => {
    const {refreshToken} = await signIn();
    const revokeResponse = await request("/auth/revoke-access", {
      refreshToken
    });

    expect(revokeResponse.status).toBe(200);
    await expect(responseBody(revokeResponse)).resolves.toEqual({
      success: true
    });

    const reuseResponse = await request("/auth/refresh-access", {
      refreshToken
    });
    expect(reuseResponse.status).toBe(401);
    await expect(responseBody(reuseResponse)).resolves.toEqual({
      error: "Invalid or expired refresh token"
    });
  });

  it("kills the successor family when a rotated-away token is revoked", async () => {
    // Two independent sign-ins: two families for the same user.
    const {refreshToken: familyA} = await signIn();
    const {refreshToken: familyB} = await signIn();

    const firstRefresh = await request("/auth/refresh-access", {
      refreshToken: familyA
    });
    expect(firstRefresh.status).toBe(200);
    const rotated = (await responseBody(
      firstRefresh
    )) as unknown as TokenResponse;

    // Revoking the rotated-away token resolves through its rotated-token
    // record and kills the family, successor included.
    const revokeResponse = await request("/auth/revoke-access", {
      refreshToken: familyA
    });
    expect(revokeResponse.status).toBe(200);
    await expect(responseBody(revokeResponse)).resolves.toEqual({
      success: true
    });

    const successorResponse = await request("/auth/refresh-access", {
      refreshToken: rotated.refreshToken
    });
    expect(successorResponse.status).toBe(401);
    await expect(responseBody(successorResponse)).resolves.toEqual({
      error: "Invalid or expired refresh token"
    });

    // The other sign-in's family is untouched.
    const otherResponse = await request("/auth/refresh-access", {
      refreshToken: familyB
    });
    expect(otherResponse.status).toBe(200);
  });

  it("treats a rotated-away token presented for refresh as reuse and kills its family", async () => {
    const {refreshToken: familyA} = await signIn();
    const {refreshToken: familyB} = await signIn();

    const firstRefresh = await request("/auth/refresh-access", {
      refreshToken: familyA
    });
    expect(firstRefresh.status).toBe(200);
    const rotated = (await responseBody(
      firstRefresh
    )) as unknown as TokenResponse;

    // Presenting the consumed token is reuse: the whole family dies.
    const reuseResponse = await request("/auth/refresh-access", {
      refreshToken: familyA
    });
    expect(reuseResponse.status).toBe(401);
    await expect(responseBody(reuseResponse)).resolves.toEqual({
      error: "Invalid or expired refresh token"
    });

    const successorResponse = await request("/auth/refresh-access", {
      refreshToken: rotated.refreshToken
    });
    expect(successorResponse.status).toBe(401);
    await expect(responseBody(successorResponse)).resolves.toEqual({
      error: "Invalid or expired refresh token"
    });

    // The other sign-in's family is untouched.
    const otherResponse = await request("/auth/refresh-access", {
      refreshToken: familyB
    });
    expect(otherResponse.status).toBe(200);
  });

  it("undoes the rotation successor when a revoke lands mid-rotation", async () => {
    const {refreshToken} = await signIn();
    const db = createDrizzle(env.DB);
    const row = await db
      .select()
      .from(session)
      .where(eq(session.token, refreshToken))
      .get();
    if (!row)
      throw new Error("Session row for the refresh token was not found");

    let releaseRotation!: () => void;
    const rotationBlocked = new Promise<void>((resolve) => {
      releaseRotation = resolve;
    });
    let claimReached!: () => void;
    const claimReachedPromise = new Promise<void>((resolve) => {
      claimReached = resolve;
    });

    // Pause the rotation right after the claim renamed the token, so the
    // revoke below lands inside the in-flight window.
    rotationTestHooks.afterClaim = async () => {
      claimReached();
      await rotationBlocked;
    };

    let refreshResponse!: Promise<Response>;
    try {
      refreshResponse = request("/auth/refresh-access", {refreshToken});
      await claimReachedPromise;

      const revokeResponse = await request("/auth/revoke-access", {
        refreshToken
      });
      expect(revokeResponse.status).toBe(200);
      await expect(responseBody(revokeResponse)).resolves.toEqual({
        success: true
      });

      releaseRotation();
      const response = await refreshResponse;
      expect(response.status).toBe(401);
      await expect(responseBody(response)).resolves.toEqual({
        error: "Invalid or expired refresh token"
      });

      // No session row of the family survives the interleaving.
      const remaining = await db
        .select()
        .from(session)
        .where(eq(session.familyId, row.familyId));
      expect(remaining).toEqual([]);
    } finally {
      releaseRotation();
      rotationTestHooks.afterClaim = undefined;
    }
  });

  it("prunes expired rotated-token records and family-revoked markers only", async () => {
    const db = createDrizzle(env.DB);
    const now = Date.now();
    await db.insert(rotatedToken).values([
      {
        id: "prune-expired-rotated",
        token: "prune-expired-token",
        familyId: "prune-family",
        consumed: true,
        expiresAt: new Date(now - 60_000).toISOString()
      },
      {
        id: "prune-live-rotated",
        token: "prune-live-token",
        familyId: "prune-family",
        consumed: true,
        expiresAt: new Date(now + 3_600_000).toISOString()
      }
    ]);
    await db.insert(familyRevocation).values([
      {
        id: "prune-expired-marker",
        familyId: "prune-expired-family",
        expiresAt: new Date(now - 60_000).toISOString()
      },
      {
        id: "prune-live-marker",
        familyId: "prune-live-family",
        expiresAt: new Date(now + 3_600_000).toISOString()
      }
    ]);

    // Any refresh or revoke prunes as a side effect; an unknown token keeps
    // the revoke itself a no-op.
    const response = await request("/auth/revoke-access", {
      refreshToken: "unknown-prune-token"
    });
    expect(response.status).toBe(200);

    await expect(
      db
        .select()
        .from(rotatedToken)
        .where(eq(rotatedToken.token, "prune-expired-token"))
        .get()
    ).resolves.toBeUndefined();
    await expect(
      db
        .select()
        .from(rotatedToken)
        .where(eq(rotatedToken.token, "prune-live-token"))
        .get()
    ).resolves.toBeDefined();
    await expect(
      db
        .select()
        .from(familyRevocation)
        .where(eq(familyRevocation.familyId, "prune-expired-family"))
        .get()
    ).resolves.toBeUndefined();
    await expect(
      db
        .select()
        .from(familyRevocation)
        .where(eq(familyRevocation.familyId, "prune-live-family"))
        .get()
    ).resolves.toBeDefined();
  });

  it("gives browser-created sessions their own rotation family", async () => {
    const result = await createAuth(env as Env).api.signInEmail({
      body: {email, password}
    });
    if (!result?.token) {
      throw new Error("Browser sign-in returned no session token");
    }

    const db = createDrizzle(env.DB);
    const row = await db
      .select()
      .from(session)
      .where(eq(session.token, result.token))
      .get();
    if (!row) throw new Error("Browser session row was not found");

    expect(row.familyId.length).toBeGreaterThan(0);
  });

  it("returns 400 naming email for a non-email sign-up address", async () => {
    const response = await request("/auth/sign-up", {
      email: "not-an-email",
      password: "x",
      name: "y"
    });

    expect(response.status).toBe(400);
    const body = await responseBody(response);
    expect(body.error).toEqual(expect.stringContaining("email"));
  });

  it("reaches sign-up with a well-formed body", async () => {
    const response = await request("/auth/sign-up", {
      email: `validation-${Date.now()}@example.com`,
      password: "password123",
      name: "Validation User"
    });

    expect(response.status).toBe(200);
    const body = await responseBody(response);
    expect(body.user).toEqual(
      expect.objectContaining({email: expect.any(String)})
    );
  });
});
