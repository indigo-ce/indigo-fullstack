import {
  generateId,
  type BetterAuthPlugin,
  type GenericEndpointContext,
  type Session,
} from "better-auth";
import {getJwtToken, type JwtOptions} from "better-auth/plugins/jwt";
import {APIError, createAuthEndpoint} from "better-auth/api";
import {z} from "astro:content";

/**
 * Options for the combined JWT + Refresh Token plugin
 */
export interface RefreshAccessTokenOptions extends JwtOptions {
  accessToken?: {
    /**
     * Expiration time for the access token
     * @default 60 minutes
     */
    expiresIn?: number;
  };
  refreshToken?: {
    /**
     * Expiration time for the refresh token
     * @default 30 days
     */
    expiresIn?: number;

    /**
     * Rotate the refresh token on each use
     * @default true
     */
    rotate?: boolean;
  };
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
        expirationTime: options?.accessToken?.expiresIn || 60,
      },
    };
  };

  return {
    id: "refresh-access-token",
    endpoints: {
      // Login with email/password and get tokens endpoint
      login: createAuthEndpoint(
        "/basic",
        {
          method: "POST",
          requireHeaders: false,
        },
        async (ctx) => {
          if (!ctx.context.options?.emailAndPassword?.enabled) {
            ctx.context.logger.error(
              "Email and password is not enabled. Make sure to enable it in the options on you `auth.ts` file. Check `https://better-auth.com/docs/authentication/email-password` for more!",
            );
            throw new APIError("BAD_REQUEST", {
              message: "Email and password is not enabled",
            });
          }

          let request = ctx.request;
          // Basic auth
          const authHeader = request?.headers.get("authorization");
          if (!authHeader) {
            return ctx.json(
              {error: "Email and password are required"},
              {status: 400},
            );
          }

          const [email, password] = Buffer.from(
            authHeader.split(" ")[1],
            "base64",
          )
            .toString()
            .split(":");

          const isValidEmail = z.string().email().safeParse(email);

          if (!isValidEmail.success) {
            throw new APIError("BAD_REQUEST", {
              message: "Invalid email",
            });
          }

          // User
          const user = await ctx.context.internalAdapter.findUserByEmail(
            email,
            {
              includeAccounts: true,
            },
          );

          if (!user) {
            await ctx.context.password.hash(password);
            ctx.context.logger.error("User not found", {email});
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or password",
            });
          }

          const credentialAccount = user.accounts.find(
            (a) => a.providerId === "credential",
          );

          if (!credentialAccount) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or password",
            });
          }

          const currentPassword = credentialAccount?.password;
          if (!currentPassword) {
            ctx.context.logger.error("Password not found", {email});
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or password",
            });
          }
          const validPassword = await ctx.context.password.verify({
            hash: currentPassword,
            password,
          });
          if (!validPassword) {
            ctx.context.logger.error("Invalid password");
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or password",
            });
          }

          if (
            ctx.context.options?.emailAndPassword?.requireEmailVerification &&
            !user.user.emailVerified
          ) {
            throw new APIError("UNAUTHORIZED", {
              message: "Email not verified",
            });
          }

          const jwtOptions = getJwtOptions();

          // Create a session for the user
          const session = await ctx.context.internalAdapter.createSession(
            user.user.id,
            ctx.headers,
            true,
            {
              // Additional session properties can be added here
              ipAddress: ctx.request?.headers.get("x-forwarded-for") || null,
              userAgent: ctx.request?.headers.get("user-agent") || null,
              createdAt: new Date(),
              updatedAt: new Date(),
              expiresAt: new Date(
                Date.now() +
                  (options?.refreshToken?.expiresIn || 30) *
                    24 *
                    60 *
                    60 *
                    1000,
              ), // Days
            },
            ctx,
            false,
          );

          if (!session) {
            ctx.context.logger.error("Failed to create session");
            throw new APIError("UNAUTHORIZED", {
              message: "Failed to create session",
            });
          }

          // Set session in context for JWT generation
          ctx.context.session = {
            session,
            user: user.user,
          };

          // Generate access token (JWT)
          const accessToken = await getJwtToken(ctx, jwtOptions);
          const refreshToken = session.token;

          return ctx.json({
            user: {
              id: user.user.id,
              email: user.user.email,
              name: user.user.name,
              image: user.user.image,
            },
            access: accessToken,
            refresh: refreshToken,
            tokenType: "Bearer",
          });
        },
      ),

      // Refresh token endpoint
      refreshToken: createAuthEndpoint(
        "/basic/refresh",
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
            newRefreshToken = generateId(32);
            await ctx.context.internalAdapter.updateSession(session.id, {
              token: newRefreshToken,
              updatedAt: new Date(),
            });
          }

          // Load user info
          const user = await ctx.context.internalAdapter.findUserById(
            session.userId,
          );

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

          await ctx.context.internalAdapter.deleteSession(session.id);
          return ctx.json({success: true});
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
