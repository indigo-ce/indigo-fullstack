import type {
  BetterAuthPlugin,
  GenericEndpointContext,
  Session,
  User,
} from "better-auth";
import {getJwtToken, type JwtOptions} from "better-auth/plugins/jwt";
import {
  createAuthEndpoint,
  createAuthMiddleware,
  sessionMiddleware,
} from "better-auth/api";

/**
 * Options for the combined JWT + Refresh Token plugin
 */
export interface RefreshAccessTokenOptions extends JwtOptions {
  accessToken?: {
    /**
     * Expiration time for the access token
     * @default "60m"
     */
    expiresIn?: number | string | Date;
  };
  refreshToken?: {
    /**
     * Expiration time for the refresh token
     * @default "30d"
     */
    expiresIn?: number | string | Date;

    /**
     * Rotate the refresh token on each use
     * @default true
     */
    rotate?: boolean;
  };
}

/**
 * Creates a new session token (refresh token)
 */
async function createSessionToken(
  ctx: GenericEndpointContext,
  options?: RefreshAccessTokenOptions,
): Promise<string> {
  const sessionId = ctx.context.generateId({model: "session"});
  const token = ctx.context.generateId({model: "refresh_token"});
  const now = new Date();

  // Calculate expiration (default 30 days)
  let expiresIn = 60 * 60 * 24 * 30; // 30 days in seconds

  if (options?.refreshToken?.expiresIn) {
    if (typeof options.refreshToken.expiresIn === "number") {
      expiresIn = options.refreshToken.expiresIn;
    } else if (typeof options.refreshToken.expiresIn === "string") {
      const units: Record<string, number> = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
        w: 604800,
        y: 31536000,
      };

      const match = options.refreshToken.expiresIn.match(/^(\d+)([smhdwy])$/);
      if (match) {
        const [_, value, unit] = match;
        expiresIn = parseInt(value) * (units[unit] || expiresIn);
      }
    }
  }

  const expiresAt = new Date(now.getTime() + expiresIn * 1000);

  await ctx.context.adapter.create<Session>({
    model: "session",
    data: {
      id: sessionId,
      userId: ctx.context.session!.user.id,
      token,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      ipAddress: ctx.context.ip,
      userAgent: ctx.context.userAgent,
    },
  });

  return token;
}

/**
 * Verifies a refresh token and returns the associated session
 */
async function verifyRefreshToken(
  ctx: GenericEndpointContext,
  refreshToken: string,
): Promise<Session | null> {
  const sessions = await ctx.context.adapter.findMany<Session>({
    model: "session",
    where: [
      {
        field: "token",
        operator: "eq",
        value: refreshToken,
      },
    ],
  });

  const session = sessions[0];
  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt) < new Date())
    return null;

  return session;
}

/**
 * Plugin that combines JWT access tokens and session-based refresh tokens
 * for mobile applications
 */
export const refreshAccessToken = (options?: RefreshAccessTokenOptions) => {
  const getJwtOptions = (): JwtOptions => {
    return {
      ...options,
      jwt: {
        ...options?.jwt,
        expirationTime: options?.accessToken?.expiresIn || "60m",
      },
    };
  };

  return {
    id: "refresh-access-token",
    endpoints: {
      // Get tokens endpoint - used after login
      getTokens: createAuthEndpoint(
        "/tokens",
        {
          method: "POST",
          requireHeaders: true,
          use: [sessionMiddleware],
        },
        async (ctx) => {
          if (!ctx.context.session) {
            return ctx.json({error: "Unauthorized"}, {status: 401});
          }

          // Generate access token (JWT)
          const jwtOptions = getJwtOptions();
          const accessToken = await getJwtToken(ctx, jwtOptions);

          // Generate refresh token (stored in database)
          const refreshToken = await createSessionToken(ctx, options);

          return ctx.json({
            accessToken,
            refreshToken,
            tokenType: "Bearer",
          });
        },
      ),

      // Refresh token endpoint
      refreshToken: createAuthEndpoint(
        "/refresh",
        {
          method: "POST",
          requireHeaders: false,
        },
        async (ctx) => {
          const refreshToken =
            ctx.body?.refreshToken || ctx.query?.refreshToken;

          if (!refreshToken) {
            return ctx.json({error: "Missing refresh token"}, {status: 400});
          }

          const session = await verifyRefreshToken(ctx, refreshToken);

          if (!session) {
            return ctx.json(
              {error: "Invalid or expired refresh token"},
              {status: 401},
            );
          }

          // Optionally rotate refresh token
          let newRefreshToken = refreshToken;
          if (options?.refreshToken?.rotate ?? true) {
            // Generate new token, update session
            newRefreshToken = ctx.context.generateId({model: "refresh_token"});
            await ctx.context.adapter.update<Session>({
              model: "session",
              where: [
                {
                  field: "id",
                  operator: "eq",
                  value: session.id,
                },
              ],
              update: {
                token: newRefreshToken,
                updatedAt: new Date(),
              },
            });
          }

          // Load user info
          const user = await ctx.context.adapter.findOne<User>({
            model: "user",
            where: [
              {
                field: "id",
                operator: "eq",
                value: session.userId,
              },
            ],
          });

          if (!user) {
            return ctx.json({error: "User not found"}, {status: 404});
          }

          // Set session in context for JWT generation
          ctx.context.session = {
            session,
            user,
          };

          // Generate access token
          const jwtOptions = getJwtOptions();
          const accessToken = await getJwtToken(ctx, jwtOptions);

          return ctx.json({
            accessToken,
            refreshToken: newRefreshToken,
            tokenType: "Bearer",
          });
        },
      ),

      // Revoke token endpoint
      revokeToken: createAuthEndpoint(
        "/revoke",
        {
          method: "POST",
          requireHeaders: false,
        },
        async (ctx) => {
          const refreshToken =
            ctx.body?.refreshToken || ctx.query?.refreshToken;

          if (!refreshToken) {
            return ctx.json({error: "Missing refresh token"}, {status: 400});
          }

          const session = await verifyRefreshToken(ctx, refreshToken);

          if (!session) {
            return ctx.json({success: true});
          }

          await ctx.context.adapter.delete({
            model: "session",
            where: [
              {
                field: "id",
                operator: "eq",
                value: session.id,
              },
            ],
          });

          return ctx.json({success: true});
        },
      ),
    },

    // Automatically issue tokens during sign-in/sign-up operations
    hooks: {
      after: [
        {
          matcher(context) {
            return (
              context.path === "/sign-in/email" ||
              context.path === "/sign-in/magic-link" ||
              context.path === "/sign-in/social" ||
              context.path === "/sign-up/email"
            );
          },
          handler: createAuthMiddleware(async (ctx) => {
            if (!ctx.context.session) return;

            try {
              // Generate access token
              const jwtOptions = getJwtOptions();
              const accessToken = await getJwtToken(ctx, jwtOptions);

              // Generate refresh token
              const refreshToken = await createSessionToken(ctx, options);

              // Add tokens to response data
              if (!ctx.context.responseData) {
                ctx.context.responseData = {};
              }

              ctx.context.responseData.accessToken = accessToken;
              ctx.context.responseData.refreshToken = refreshToken;
              ctx.context.responseData.tokenType = "Bearer";

              // Also add as headers for frameworks that handle headers better
              ctx.setHeader("x-access-token", accessToken);
              ctx.setHeader("x-refresh-token", refreshToken);
              ctx.setHeader(
                "Access-Control-Expose-Headers",
                "x-access-token, x-refresh-token",
              );
            } catch (error) {
              console.error("Error issuing tokens:", error);
            }
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
};
