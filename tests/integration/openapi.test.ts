import {env} from "cloudflare:test";
import {describe, expect, it} from "vitest";
import {createHonoApp} from "@/pages/api/[...path]";

type OpenAPISpec = {
  openapi: string;
  paths: Record<string, Record<string, unknown>>;
  components: {
    securitySchemes: Record<string, Record<string, string>>;
  };
};

const app = createHonoApp(env as Env);

function routeKeys(spec: OpenAPISpec): Set<string> {
  return new Set(
    Object.entries(spec.paths).flatMap(([path, operations]) =>
      Object.keys(operations).map(
        (method) => `${method.toUpperCase()} /api/v1${path}`
      )
    )
  );
}

async function fetchDocument(): Promise<OpenAPISpec> {
  const response = await app.fetch(
    new Request("http://localhost/api/v1/openapi.json", {method: "GET"})
  );
  expect(response.status).toBe(200);
  return (await response.json()) as OpenAPISpec;
}

describe("v1 OpenAPI document", () => {
  it("is served as JSON and declares OpenAPI 3.1", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/openapi.json", {method: "GET"})
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const body = (await response.json()) as OpenAPISpec;
    expect(body.openapi).toMatch(/^3\.1\./);
  });

  it("matches every registered v1 route in both directions", async () => {
    const spec = await fetchDocument();
    const routesResponse = await app.fetch(
      new Request("http://localhost/api/v1/routes", {method: "GET"})
    );
    const routes = (await routesResponse.json()) as string[];

    expect(routesResponse.status).toBe(200);
    expect(new Set(routes)).toEqual(routeKeys(spec));
  });

  it("requires Basic auth on sign-in and bearer auth on account routes", async () => {
    const spec = await fetchDocument();
    const operation = (path: string, method: string) =>
      spec.paths[path][method] as {security: unknown[]};

    expect(operation("/auth/sign-in", "post").security).toEqual([
      {basicAuth: []}
    ]);
    expect(operation("/account/profile", "get").security).toEqual([
      {bearerAuth: []}
    ]);
    expect(operation("/account/posts", "get").security).toEqual([
      {bearerAuth: []}
    ]);
    expect(operation("/auth/refresh-access", "post").security).toEqual([]);
    expect(spec.components.securitySchemes.basicAuth).toMatchObject({
      type: "http",
      scheme: "basic"
    });
    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT"
    });
  });

  it("gives every operation a non-empty unique operationId", async () => {
    const spec = await fetchDocument();
    const operations = Object.values(spec.paths).flatMap((methods) =>
      Object.values(methods)
    ) as {operationId?: string}[];
    const operationIds = operations.map((operation) => operation.operationId);

    expect(
      operationIds.every((id) => typeof id === "string" && id.length > 0)
    ).toBe(true);
    expect(new Set(operationIds).size).toBe(operationIds.length);
  });
});
