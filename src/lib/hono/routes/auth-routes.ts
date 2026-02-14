import {APIError} from "better-auth/api";
import {Hono} from "hono";
import type {ContentfulStatusCode} from "hono/utils/http-status";
import type {APIRouteContext} from "@/pages/api/[...path]";
import {getLanguageFromHeaders} from "@/i18n/utils";
import {defaultLocale} from "@/i18n/constants";

const authRoutes = new Hono<APIRouteContext>();

authRoutes.post("/sign-up", async (c) => {
  try {
    const env = c.get("env");
    const body = await c.req.json();

    // Extract locale from Accept-Language header
    const locale = getLanguageFromHeaders(c.req.raw.headers) || defaultLocale;

    // Import createAuth dynamically to use the locale
    const {createAuth} = await import("@/lib/auth");
    const auth = createAuth(env, locale);

    const response = await auth.api.signUpEmail({
      body: {
        email: body.email,
        password: body.password,
        name: body.name,
        callbackURL: body.callbackURL || "/dashboard"
      },
      asResponse: true
    });

    if (response.ok) {
      const data = await response.json();
      return c.json(data);
    } else {
      const error = await response.json();
      return c.json(error, response.status as ContentfulStatusCode);
    }
  } catch (error: any) {
    if (error instanceof APIError) {
      return c.json(
        {
          error: error.body?.message
        },
        error.statusCode as ContentfulStatusCode
      );
    }

    return c.json(
      {
        error: "Internal server error"
      },
      500
    );
  }
});

authRoutes.get("/sign-in", async (c) => {
  try {
    const auth = c.get("auth");
    const response = await auth.api.signInTokens({
      body: {
        basicToken: c.req.header("Authorization") ?? ""
      }
    });

    return c.json(response);
  } catch (error: any) {
    if (error instanceof APIError) {
      return c.json(
        {
          error: error.body?.message
        },
        error.statusCode as ContentfulStatusCode
      );
    }

    return c.json(
      {
        error: "Internal server error"
      },
      500
    );
  }
});

authRoutes.post("/send-verification-email", async (c) => {
  try {
    const env = c.get("env");
    const body = await c.req.json();

    // Extract locale from Accept-Language header
    const locale = getLanguageFromHeaders(c.req.raw.headers) || defaultLocale;

    const {createAuth} = await import("@/lib/auth");
    const auth = createAuth(env, locale);

    const response = await auth.api.sendVerificationEmail({
      body: {
        email: body.email,
        callbackURL: body.callbackURL || "/dashboard"
      }
    });

    return c.json(response);
  } catch (error: any) {
    if (error instanceof APIError) {
      return c.json(
        {
          error: error.body?.message
        },
        error.statusCode as ContentfulStatusCode
      );
    }

    return c.json(
      {
        error: "Internal server error"
      },
      500
    );
  }
});

authRoutes.post("/forget-password", async (c) => {
  try {
    const env = c.get("env");
    const body = await c.req.json();

    // Extract locale from Accept-Language header
    const locale = getLanguageFromHeaders(c.req.raw.headers) || defaultLocale;

    const {createAuth} = await import("@/lib/auth");
    const auth = createAuth(env, locale);

    const response = await auth.api.requestPasswordReset({
      body: {
        email: body.email,
        redirectTo: body.redirectTo || "/reset-password"
      }
    });

    return c.json(response);
  } catch (error: any) {
    if (error instanceof APIError) {
      return c.json(
        {
          error: error.body?.message
        },
        error.statusCode as ContentfulStatusCode
      );
    }

    return c.json(
      {
        error: "Internal server error"
      },
      500
    );
  }
});

authRoutes.post("/reset-password", async (c) => {
  try {
    const env = c.get("env");
    const body = await c.req.json();

    // Extract locale from Accept-Language header
    const locale = getLanguageFromHeaders(c.req.raw.headers) || defaultLocale;

    const {createAuth} = await import("@/lib/auth");
    const auth = createAuth(env, locale);

    const response = await auth.api.resetPassword({
      body: {
        newPassword: body.newPassword,
        token: body.token
      }
    });

    return c.json(response);
  } catch (error: any) {
    if (error instanceof APIError) {
      return c.json(
        {
          error: error.body?.message
        },
        error.statusCode as ContentfulStatusCode
      );
    }

    return c.json(
      {
        error: "Internal server error"
      },
      500
    );
  }
});

authRoutes.post("/refresh-access", async (c) => {
  try {
    const auth = c.get("auth");
    const body = await c.req.json();

    const response = await auth.api.refreshTokens({
      body: body
    });

    return c.json(response);
  } catch (error: any) {
    if (error instanceof APIError) {
      return c.json(
        {
          error: error.body?.message
        },
        error.statusCode as ContentfulStatusCode
      );
    }

    return c.json(
      {
        error: "Internal server error"
      },
      500
    );
  }
});

authRoutes.post("/revoke-access", async (c) => {
  try {
    const auth = c.get("auth");
    const body = await c.req.json();

    const response = await auth.api.revokeTokens({
      body: body
    });

    return c.json(response);
  } catch (error: any) {
    if (error instanceof APIError) {
      return c.json(
        {
          error: error.body?.message
        },
        error.statusCode as ContentfulStatusCode
      );
    }

    return c.json(
      {
        error: "Internal server error"
      },
      500
    );
  }
});

export default authRoutes;
