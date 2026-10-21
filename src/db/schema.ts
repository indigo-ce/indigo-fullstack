import {
  sqliteTable,
  text,
  integer,
  index
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", {mode: "boolean"}).notNull(),
  image: text("image"),
  createdAt: integer("createdAt", {mode: "timestamp"}).notNull(),
  updatedAt: integer("updatedAt", {mode: "timestamp"}).notNull()
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expiresAt", {mode: "timestamp"}).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("createdAt", {mode: "timestamp"}).notNull(),
    updatedAt: integer("updatedAt", {mode: "timestamp"}).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, {onDelete: "cascade"}),
    // Rotation family: every session minted by the refresh-access plugin
    // carries an id that groups it with its rotated successors, so revoking
    // any token in the chain kills them all. The empty default only exists
    // so the migration can add the NOT NULL column to a populated table; the
    // auth config's session-create hook assigns a real family to every
    // session, and the migration backfills existing rows with their own id.
    familyId: text("familyId").notNull().default("")
  },
  (table) => [index("session_family_id_idx").on(table.familyId)]
);

// Rotated-away refresh tokens. One row per consumed token, kept so a token
// that has already been rotated still resolves to its family for revocation
// and reuse detection. Better Auth's adapter contract expects every model to
// carry an `id` column, so the token is unique but not the primary key.
// `expiresAt` is an ISO-8601 UTC string so lookups and pruning can compare it
// lexicographically.
export const rotatedToken = sqliteTable(
  "rotated_token",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    familyId: text("familyId").notNull(),
    // False while the rotation that consumed the token is still in flight;
    // flipped once the successor exists. Reuse detection only kills a family
    // over a consumed record, so the losing request of a legitimate
    // concurrent rotation is never treated as token theft.
    consumed: integer("consumed", {mode: "boolean"}).notNull().default(false),
    expiresAt: text("expiresAt").notNull()
  },
  (table) => [index("rotated_token_family_id_idx").on(table.familyId)]
);

// Durable family-revoked markers. A revoke can land while a rotation is in
// flight, after the family's session rows are gone but before the successor
// is written; the marker outlives them and lets the rotation undo the
// successor it just created.
export const familyRevocation = sqliteTable("family_revocation", {
  id: text("id").primaryKey(),
  familyId: text("familyId").notNull().unique(),
  // No earlier than the latest expiry any token of the family could still
  // hold, so pruning never reopens a revoked family.
  expiresAt: text("expiresAt").notNull()
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, {onDelete: "cascade"}),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", {mode: "timestamp"}),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
    mode: "timestamp"
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", {mode: "timestamp"}).notNull(),
  updatedAt: integer("updatedAt", {mode: "timestamp"}).notNull()
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", {mode: "timestamp"}).notNull(),
  createdAt: integer("createdAt", {mode: "timestamp"}),
  updatedAt: integer("updatedAt", {mode: "timestamp"})
});

export const jwks = sqliteTable("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("publicKey").notNull(),
  privateKey: text("privateKey").notNull(),
  createdAt: integer("createdAt", {mode: "timestamp"}).notNull(),
  // Optional key metadata introduced by the Better Auth 1.7 JWT plugin.
  expiresAt: integer("expiresAt", {mode: "timestamp"}),
  alg: text("alg"),
  crv: text("crv")
});
