import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", {mode: "boolean"}).notNull(),
  image: text("image"),
  createdAt: integer("createdAt", {mode: "timestamp"}).notNull(),
  updatedAt: integer("updatedAt", {mode: "timestamp"}).notNull(),
});

export const session = sqliteTable("session", {
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
});

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    // Namespaces accountId so a provider ID cannot collide with another
    // authentication method. Required by Better Auth 1.7+.
    issuer: text("issuer").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, {onDelete: "cascade"}),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", {mode: "timestamp"}),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("createdAt", {mode: "timestamp"}).notNull(),
    updatedAt: integer("updatedAt", {mode: "timestamp"}).notNull(),
  },
  (table) => [uniqueIndex("account_issuer_accountId_idx").on(table.issuer, table.accountId)],
);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", {mode: "timestamp"}).notNull(),
  createdAt: integer("createdAt", {mode: "timestamp"}),
  updatedAt: integer("updatedAt", {mode: "timestamp"}),
});

export const jwks = sqliteTable("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("publicKey").notNull(),
  privateKey: text("privateKey").notNull(),
  createdAt: integer("createdAt", {mode: "timestamp"}).notNull(),
  // Optional key metadata introduced by the Better Auth 1.7 JWT plugin.
  expiresAt: integer("expiresAt", {mode: "timestamp"}),
  alg: text("alg"),
  crv: text("crv"),
});
