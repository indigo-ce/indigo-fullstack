import {beforeAll, describe, expect, it} from "vitest";
import {applyD1Migrations, env} from "cloudflare:test";
import {eq} from "drizzle-orm";
import {createDrizzle} from "@/db";
import {user, session} from "@/db/schema";
import {createAuth} from "@/lib/auth";
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
  access: string;
  refresh: string;
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

function assertSignInResponse(
  data: Record<string, unknown>
): SignInResponse {
  expect(Object.keys(data).sort()).toEqual([
    "access",
    "refresh",
    "tokenType",
    "user"
  ]);
  expect(data.access).toEqual(expect.any(String));
  expect(data.refresh).toEqual(expect.any(String));
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
    const {refresh} = await signIn();
    const response = await request("/auth/refresh-access", {
      refreshToken: refresh
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
      userId
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

  it("rotates refresh tokens and rejects the previous token", async () => {
    const {refresh} = await signIn();
    const response = await request("/auth/refresh-access", {
      refreshToken: refresh
    });
    const data = (await responseBody(response)) as unknown as TokenResponse;

    expect(response.status).toBe(200);
    expect(data.refreshToken).toEqual(expect.any(String));
    expect(data.refreshToken).not.toBe(refresh);

    const oldTokenResponse = await request("/auth/refresh-access", {
      refreshToken: refresh
    });
    expect(oldTokenResponse.status).toBe(401);
    await expect(responseBody(oldTokenResponse)).resolves.toEqual({
      error: "Invalid or expired refresh token"
    });
  });

  it("allows only one concurrent refresh to consume a token", async () => {
    const {refresh} = await signIn();
    const responses = await Promise.all([
      request("/auth/refresh-access", {refreshToken: refresh}),
      request("/auth/refresh-access", {refreshToken: refresh})
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200,
      401
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
    const {refresh} = await signIn();
    const revokeResponse = await request("/auth/revoke-access", {
      refreshToken: refresh
    });

    expect(revokeResponse.status).toBe(200);
    await expect(responseBody(revokeResponse)).resolves.toEqual({
      success: true
    });

    const reuseResponse = await request("/auth/refresh-access", {
      refreshToken: refresh
    });
    expect(reuseResponse.status).toBe(401);
    await expect(responseBody(reuseResponse)).resolves.toEqual({
      error: "Invalid or expired refresh token"
    });
  });
});
