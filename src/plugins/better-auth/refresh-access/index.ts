import {
  type BetterAuthPlugin,
  type GenericEndpointContext,
  type Session
} from "better-auth";
import {getJwtToken, type JwtOptions} from "better-auth/plugins/jwt";
import {APIError, createAuthEndpoint} from "better-auth/api";
import {z} from "zod";

/**
 * Options for the combined JWT + Refresh Token plugin
 */
export interface RefreshAccessTokenOptions extends JwtOptions {
  accessToken?: {
    /**
     * Expiration time for the access token
     * @default 60min
     */
    expiresIn?: string;
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
 * Test-only seam for the deterministic rotation interleaving case in
 * `tests/integration/auth-routes.test.ts`. Production code never sets it, so
 * the optional call is a no-op in every deployment.
 */
export const rotationTestHooks: {afterClaim?: () => Promise<void>} = {};

/**
 * Verifies a refresh token and returns the associated live session, or null
 * when the token does not resolve to one (unknown, expired, or rotated away).
 */
async function findLiveSession(
  ctx: GenericEndpointContext,
  refreshToken: string
): Promise<FamilySession | null> {
  const sessions = await ctx.context.adapter.findMany<FamilySession>({
    model: "session",
    where: [
      {
        field: "token",
        operator: "eq",
        value: refreshToken
      }
    ]
  });

  const session = sessions[0];
  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt) < new Date())
    return null;

  return session;
}

/**
 * A rotated-away refresh token record. `expiresAt` is an ISO-8601 UTC
 * string: the plugin compares and stores it as text, because the adapter's
 * where-clause transformation does not handle `Date` values for SQLite.
 */
type RotatedTokenRecord = {
  token: string;
  familyId: string;
  consumed: boolean;
  expiresAt: string;
};

/**
 * Durable family-revoked marker. `expiresAt` follows the same ISO-8601 UTC
 * text convention as `RotatedTokenRecord`.
 */
type FamilyRevocationRecord = {
  familyId: string;
  expiresAt: string;
};

/**
 * A live session carrying its rotation family. `familyId` is declared as a
 * `session.additionalFields` entry in `createAuth`, so every session row has
 * one at runtime; the imported `Session` type predates the field, so the
 * resolution helpers below assert it once instead of casting at every use.
 */
type FamilySession = Session & {familyId: string};

/**
 * How a presented refresh token resolved against the database.
 */
type TokenResolution =
  | {kind: "live"; session: FamilySession}
  // The token was rotated away. `consumed` distinguishes a rotation that
  // completed (its successor exists) from one still in flight.
  | {kind: "rotated"; familyId: string; consumed: boolean; expiresAt: Date}
  | null;

/**
 * Resolves a presented refresh token to a live session or to the family of
 * the rotation that consumed it. Expired live sessions do not resolve.
 */
async function resolveRefreshToken(
  ctx: GenericEndpointContext,
  refreshToken: string
): Promise<TokenResolution> {
  const session = await findLiveSession(ctx, refreshToken);
  if (session) return {kind: "live", session};

  const records = await ctx.context.adapter.findOne<RotatedTokenRecord>({
    model: "rotatedToken",
    where: [
      {
        field: "token",
        operator: "eq",
        value: refreshToken
      }
    ]
  });
  const record = records;
  if (!record) return null;

  return {
    kind: "rotated",
    familyId: record.familyId,
    consumed: record.consumed,
    expiresAt: new Date(record.expiresAt)
  };
}

/**
 * Removes rotated-token records and family-revoked markers whose `expiresAt`
 * has passed. D1 does not drop expired rows on its own and every rotation
 * adds one record, so the refresh and revoke paths prune opportunistically
 * instead of relying on a scheduled worker.
 */
async function pruneExpiredRecords(ctx: GenericEndpointContext): Promise<void> {
  const now = new Date().toISOString();
  await ctx.context.adapter.deleteMany({
    model: "rotatedToken",
    where: [{field: "expiresAt", operator: "lt", value: now}]
  });
  await ctx.context.adapter.deleteMany({
    model: "familyRevocation",
    where: [{field: "expiresAt", operator: "lt", value: now}]
  });
}

/**
 * Records a consumed refresh token against its rotation family so the token
 * stays resolvable after its session row is renamed or deleted. The record is
 * written before the claim rename so the token resolves for the whole
 * rotation. A concurrent rotation of the same token may already have written
 * the row (the token is the primary key); that race is harmless because both
 * writers record the same family and expiry, so the loser just moves on.
 */
async function recordRotatedToken(
  ctx: GenericEndpointContext,
  token: string,
  familyId: string,
  expiresAt: Date
): Promise<void> {
  const existing = await ctx.context.adapter.findOne<RotatedTokenRecord>({
    model: "rotatedToken",
    where: [{field: "token", operator: "eq", value: token}]
  });
  if (existing) return;

  try {
    await ctx.context.adapter.create({
      model: "rotatedToken",
      data: {
        token,
        familyId,
        consumed: false,
        expiresAt: expiresAt.toISOString()
      }
    });
  } catch {
    // Lost a simultaneous create against the token's primary key; the
    // winner's record serves the same purpose.
  }
}

/**
 * Marks a family revoked. The marker's `expiresAt` is never lowered below an
 * existing one, so pruning can never reopen a family that is still within the
 * lifetime of a token it could hold.
 */
async function markFamilyRevoked(
  ctx: GenericEndpointContext,
  familyId: string,
  expiresAt: Date
): Promise<void> {
  const iso = expiresAt.toISOString();
  const existing = await ctx.context.adapter.findOne<FamilyRevocationRecord>({
    model: "familyRevocation",
    where: [{field: "familyId", operator: "eq", value: familyId}]
  });

  if (existing) {
    if (existing.expiresAt < iso) {
      await ctx.context.adapter.updateMany({
        model: "familyRevocation",
        where: [{field: "familyId", operator: "eq", value: familyId}],
        update: {expiresAt: iso}
      });
    }
    return;
  }

  await ctx.context.adapter.create({
    model: "familyRevocation",
    data: {familyId, expiresAt: iso}
  });
}

/**
 * Deletes every live session row of a rotation family.
 */
async function deleteFamilySessions(
  ctx: GenericEndpointContext,
  familyId: string
): Promise<void> {
  await ctx.context.adapter.deleteMany({
    model: "session",
    where: [{field: "familyId", operator: "eq", value: familyId}]
  });
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
        expirationTime: options?.accessToken?.expiresIn || "60min"
      }
    };
  };

  return {
    id: "refresh-access-token",
    // Field metadata for the plugin's own tables. The tables are declared in
    // the Drizzle schema; without these declarations the adapter rejects the
    // model names outright, because Better Auth only resolves models it knows.
    schema: {
      rotatedToken: {
        fields: {
          token: {type: "string", required: true, unique: true},
          familyId: {type: "string", required: true},
          consumed: {type: "boolean", required: true, defaultValue: false},
          expiresAt: {type: "string", required: true}
        }
      },
      familyRevocation: {
        fields: {
          familyId: {type: "string", required: true, unique: true},
          expiresAt: {type: "string", required: true}
        }
      }
    },
    endpoints: {
      // Login with email/password and get tokens endpoint
      signInTokens: createAuthEndpoint(
        "/auth-tokens",
        {
          method: "POST",
          body: z.object({
            basicToken: z.string()
          }),
          requireHeaders: false
        },
        async (ctx) => {
          if (!ctx.context.options?.emailAndPassword?.enabled) {
            ctx.context.logger.error(
              "Email and password is not enabled. Make sure to enable it in the options on you `auth.ts` file. Check `https://better-auth.com/docs/authentication/email-password` for more!"
            );
            throw new APIError("BAD_REQUEST", {
              message: "Email and password is not enabled"
            });
          }

          // Basic auth
          const authHeader = ctx.body?.basicToken;
          if (!authHeader) {
            throw new APIError("BAD_REQUEST", {
              message: "Email and password are required"
            });
          }

          const [email, password] = Buffer.from(
            authHeader.split(" ")[1],
            "base64"
          )
            .toString()
            .split(":");

          const isValidEmail = z.email().safeParse(email);

          if (!isValidEmail.success) {
            throw new APIError("BAD_REQUEST", {
              message: "Invalid email"
            });
          }

          // User
          const user = await ctx.context.internalAdapter.findUserByEmail(
            email,
            {
              includeAccounts: true
            }
          );

          if (!user) {
            ctx.context.logger.error("User not found");
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or password"
            });
          }

          const credentialAccount = user.accounts.find(
            (a) => a.providerId === "credential"
          );

          if (!credentialAccount) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or password"
            });
          }

          const currentPassword = credentialAccount?.password;
          if (!currentPassword) {
            ctx.context.logger.error("Password not found");
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or password"
            });
          }
          const validPassword = await ctx.context.password.verify({
            hash: currentPassword,
            password
          });
          if (!validPassword) {
            ctx.context.logger.error("Invalid password");
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or password"
            });
          }

          if (
            ctx.context.options?.emailAndPassword?.requireEmailVerification &&
            !user.user.emailVerified
          ) {
            throw new APIError("UNAUTHORIZED", {
              message: "Email not verified"
            });
          }

          const jwtOptions = getJwtOptions();

          const refreshTokenExpiry = new Date(
            Date.now() +
              (options?.refreshToken?.expiresIn || 30) * 24 * 60 * 60 * 1000
          ); // Days

          // Create a session for the user. `dontRememberMe: false` makes the
          // adapter assign its own 7-day `expiresAt` after spreading this
          // override, discarding whatever we pass here, so the intended
          // refresh-token lifetime has to be applied as a follow-up update.
          // `overrideAll: true` would also restore it, but it would hand the
          // override control of `token`, `createdAt`, and `updatedAt` too.
          //
          // The session starts a new rotation family: the `familyId` passed
          // here groups this row with every token rotated from it, so
          // revoking any of them kills the whole chain. (The adapter strips
          // caller-supplied ids, so the family id cannot reuse the session's
          // own id; any unique per-family value serves the same purpose.)
          const session = await ctx.context.internalAdapter.createSession(
            user.user.id,
            false,
            {
              // Additional session properties can be added here
              ipAddress: ctx.request?.headers.get("x-forwarded-for") || null,
              userAgent: ctx.request?.headers.get("user-agent") || null,
              createdAt: new Date(),
              updatedAt: new Date(),
              familyId: crypto.randomUUID().toUpperCase()
            },
            false
          );

          if (!session) {
            ctx.context.logger.error("Failed to create session");
            throw new APIError("UNAUTHORIZED", {
              message: "Failed to create session"
            });
          }

          await ctx.context.internalAdapter.updateSession(session.token, {
            expiresAt: refreshTokenExpiry
          });
          session.expiresAt = refreshTokenExpiry;

          // Set session in context for JWT generation
          ctx.context.session = {
            session,
            user: user.user
          };

          // Generate access token (JWT)
          const accessToken = await getJwtToken(ctx, jwtOptions);
          const refreshToken = session.token;

          return ctx.json({
            user: {
              id: user.user.id,
              email: user.user.email,
              name: user.user.name,
              image: user.user.image
            },
            accessToken,
            refreshToken,
            tokenType: "Bearer"
          });
        }
      ),

      // Refresh token endpoint
      refreshTokens: createAuthEndpoint(
        "/auth-tokens/refresh",
        {
          method: "POST",
          body: z.object({
            refreshToken: z.string().min(1)
          }),
          requireHeaders: false
        },
        async (ctx) => {
          const refreshToken = ctx.body.refreshToken;

          await pruneExpiredRecords(ctx);

          const resolution = await resolveRefreshToken(ctx, refreshToken);

          // A consumed token presented for refresh is reuse: treat it as
          // evidence of theft and revoke the whole family. A record that is
          // not yet consumed belongs to a rotation still in flight - the
          // losing request of a legitimate concurrent race lands here and
          // must not sign the user out, so it only gets the plain 401.
          if (resolution?.kind === "rotated") {
            if (resolution.consumed) {
              await deleteFamilySessions(ctx, resolution.familyId);
              await markFamilyRevoked(ctx, resolution.familyId, resolution.expiresAt);
            }
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid or expired refresh token"
            });
          }

          if (resolution?.kind !== "live") {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid or expired refresh token"
            });
          }

          const session = resolution.session;

          // Optionally rotate refresh token
          let sessionForJwt: Session = session;
          let newRefreshToken = refreshToken;
          if (options?.refreshToken?.rotate ?? true) {
            // Record the token against its family before the claim rename so
            // it stays resolvable for the whole rotation: a revoke landing
            // mid-rotation must be able to map the renamed token back here.
            await recordRotatedToken(
              ctx,
              refreshToken,
              session.familyId,
              session.expiresAt
            );

            // Claim the current token before creating its replacement so only
            // one concurrent request can consume it.
            const claimMarker = crypto.randomUUID();
            const claimedSession =
              await ctx.context.internalAdapter.updateSession(session.token, {
                token: claimMarker,
                updatedAt: new Date()
              });

            if (!claimedSession) {
              // Lost the claim to a concurrent rotation: this request is not
              // token theft, so the family stays untouched and only this
              // request is rejected. The rotated-token record written above
              // is shared with the winner, which flips it to consumed when
              // its rotation completes.
              throw new APIError("UNAUTHORIZED", {
                message: "Invalid or expired refresh token"
              });
            }

            // Test-only pause point; unset in production.
            await rotationTestHooks.afterClaim?.();

            const newSession = await ctx.context.internalAdapter.createSession(
              session.userId,
              false,
              {
                expiresAt: session.expiresAt,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                createdAt: new Date(),
                updatedAt: new Date(),
                familyId: session.familyId
              },
              false
            );
            if (!newSession) {
              throw new APIError("UNAUTHORIZED", {
                message: "Failed to rotate refresh token"
              });
            }

            await ctx.context.internalAdapter.updateSession(newSession.token, {
              expiresAt: session.expiresAt
            });

            // A revoke can land after the claim renamed the family's row but
            // before this successor existed. The family-revoked marker
            // outlives the rows, so it is the last word: undo the successor
            // and reject.
            const familyRevoked = await ctx.context.adapter.findOne<{
              familyId: string;
            }>({
              model: "familyRevocation",
              where: [
                {field: "familyId", operator: "eq", value: session.familyId}
              ]
            });
            if (familyRevoked) {
              await ctx.context.internalAdapter.deleteSession(
                newSession.token
              );
              throw new APIError("UNAUTHORIZED", {
                message: "Invalid or expired refresh token"
              });
            }

            await ctx.context.internalAdapter.deleteSession(claimMarker);

            // The rotation is complete, so presenting the old token from here
            // on is reuse and must kill the family. A concurrent rotation's
            // loser cannot delete this record, but flip it defensively if the
            // row vanished anyway: the consumed record is what makes later
            // presentations of the old token resolvable.
            const marked = await ctx.context.adapter.updateMany({
              model: "rotatedToken",
              where: [{field: "token", operator: "eq", value: refreshToken}],
              update: {consumed: true}
            });
            if (marked === 0) {
              await ctx.context.adapter.create({
                model: "rotatedToken",
                data: {
                  token: refreshToken,
                  familyId: session.familyId,
                  consumed: true,
                  expiresAt: session.expiresAt.toISOString()
                }
              });
            }

            sessionForJwt = newSession;
            newRefreshToken = newSession.token;
          }

          // Load user info
          const user = await ctx.context.internalAdapter.findUserById(
            session.userId
          );

          if (!user) {
            throw new APIError("NOT_FOUND", {
              message: "User not found"
            });
          }

          // Set session in context for JWT generation
          ctx.context.session = {
            session: sessionForJwt,
            user
          };

          // Generate access token
          const jwtOptions = getJwtOptions();
          const accessToken = await getJwtToken(ctx, jwtOptions);

          return ctx.json({
            accessToken,
            refreshToken: newRefreshToken,
            tokenType: "Bearer"
          });
        }
      ),

      // Revoke token endpoint
      revokeTokens: createAuthEndpoint(
        "/auth-tokens/revoke",
        {
          method: "POST",
          body: z.object({
            refreshToken: z.string().min(1)
          }),
          requireHeaders: false
        },
        async (ctx) => {
          const refreshToken = ctx.body.refreshToken;

          await pruneExpiredRecords(ctx);

          const resolution = await resolveRefreshToken(ctx, refreshToken);

          // Unknown tokens stay idempotently successful.
          if (!resolution) {
            return ctx.json({success: true});
          }

          // A token that only lives on in a rotated-token record still
          // resolves to its family, so revoking it kills every successor the
          // rotation produced - including a rotation still in flight, which
          // the family-revoked marker catches on the refresh side.
          const familyId =
            resolution.kind === "live"
              ? resolution.session.familyId
              : resolution.familyId;
          const familyExpiry =
            resolution.kind === "live"
              ? resolution.session.expiresAt
              : resolution.expiresAt;

          await deleteFamilySessions(ctx, familyId);
          await markFamilyRevoked(ctx, familyId, familyExpiry);

          return ctx.json({success: true});
        }
      )
    }
  } satisfies BetterAuthPlugin;
};
