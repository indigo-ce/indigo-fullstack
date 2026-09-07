import {beforeAll, describe, expect, it} from "vitest";
import {applyD1Migrations, env} from "cloudflare:test";
import {createHonoApp} from "@/pages/api/[...path]";

describe("API error handling", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("returns a JSON 404 for an unmatched v1 route", async () => {
    const app = createHonoApp(env as Env);

    const response = await app.request("/api/v1/does-not-exist");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({error: "Not found"});
  });

  it("returns a JSON 500 when the shared middleware throws", async () => {
    const app = createHonoApp({
      ...env,
      BETTER_AUTH_SECRET: ""
    } as Env);

    const response = await app.request("/api/v1/health");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error"
    });
  });

  it("returns a 400 for a malformed JSON body", async () => {
    const app = createHonoApp(env as Env);

    const response = await app.request("/api/v1/auth/sign-up", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: '{"email":'
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON body"
    });
  });
});
