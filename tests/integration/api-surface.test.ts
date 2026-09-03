import {applyD1Migrations, env} from "cloudflare:test";
import {eq} from "drizzle-orm";
import {beforeAll, describe, expect, it} from "vitest";
import {createDrizzle} from "@/db";
import {user} from "@/db/schema";
import {createAuth} from "@/lib/auth";
import {createHonoApp} from "@/pages/api/[...path]";

const email = "api-surface-integration@example.com";
const password = "password123";
const name = "API Surface Integration User";

const app = createHonoApp(env as Env);
let createdUser: typeof user.$inferSelect;
let accessToken: string;

async function request(
  path: string,
  method: "GET" | "POST" = "GET",
  headers?: HeadersInit
): Promise<Response> {
  return app.fetch(
    new Request(`http://localhost/api/v1${path}`, {
      method,
      headers
    })
  );
}

async function responseBody(response: Response): Promise<unknown> {
  return response.json();
}

async function signIn(): Promise<string> {
  const response = await request(
    "/auth/sign-in",
    "POST",
    {
      Authorization: `Basic ${btoa(`${email}:${password}`)}`
    }
  );

  expect(response.status).toBe(200);
  const body = (await responseBody(response)) as Record<string, unknown>;
  expect(body.accessToken).toEqual(expect.any(String));

  return body.accessToken as string;
}

describe("API surface integration", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    await createAuth(env as Env).api.signUpEmail({
      body: {email, password, name}
    });

    const database = createDrizzle(env.DB);
    const result = await database
      .select()
      .from(user)
      .where(eq(user.email, email))
      .get();
    if (!result) throw new Error("Integration test user was not created");
    createdUser = result;
    accessToken = await signIn();
  });

  it("serves the health response", async () => {
    const response = await request("/health");

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({status: "ok"});
  });

  it("lists each registered API route once", async () => {
    const response = await request("/routes");
    const routes = (await responseBody(response)) as string[];
    const expectedRoutes = [
      "GET /api/v1/health",
      "GET /api/v1/routes",
      "POST /api/v1/auth/sign-up",
      "POST /api/v1/auth/send-verification-email",
      "POST /api/v1/auth/forgot-password",
      "POST /api/v1/auth/reset-password",
      "POST /api/v1/auth/sign-in",
      "POST /api/v1/auth/refresh-access",
      "POST /api/v1/auth/revoke-access",
      "GET /api/v1/account/profile",
      "GET /api/v1/account/posts"
    ];

    expect(response.status).toBe(200);
    expect(new Set(routes)).toEqual(new Set(expectedRoutes));
    expect(routes).toHaveLength(expectedRoutes.length);
  });

  it("rejects an account request without authorization", async () => {
    const response = await request("/account/profile");

    expect(response.status).toBe(401);
    await expect(responseBody(response)).resolves.toEqual({
      error: "Unauthorized"
    });
  });

  it("rejects a malformed bearer token", async () => {
    const response = await request("/account/profile", "GET", {
      Authorization: "Bearer not-a-jwt"
    });

    expect(response.status).toBe(401);
    await expect(responseBody(response)).resolves.toEqual({
      error: "You are not authorized to access this resource",
      code: "UNAUTHORIZED"
    });
  });

  it("serves the signed-in user's profile with a real access token", async () => {
    const response = await request("/account/profile", "GET", {
      Authorization: `Bearer ${accessToken}`
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Response-Time")).toMatch(/^\d+ms$/);
    await expect(responseBody(response)).resolves.toEqual({
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      image: createdUser.image,
      emailVerified: createdUser.emailVerified,
      createdAt: createdUser.createdAt.toISOString(),
      updatedAt: createdUser.updatedAt.toISOString()
    });
  });
});
