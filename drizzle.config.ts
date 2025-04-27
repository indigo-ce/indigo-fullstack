import "dotenv/config";
import type {Config} from "drizzle-kit";
import path from "path";
import fs from "fs";
const {CLOUDFLARE_DATABASE_ID, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_TOKEN} =
  process.env;

const getLocalD1 = () => {
  try {
    const basePath = path.resolve(".wrangler");
    const dbFile = fs
      .readdirSync(basePath, {encoding: "utf-8", recursive: true})
      .find((f) => f.endsWith(".sqlite"));

    if (!dbFile) {
      throw new Error(`.sqlite file not found in ${basePath}`);
    }

    const url = path.resolve(basePath, dbFile);
    return url;
  } catch (err) {
    throw new Error(`Failed to locate local D1 database: ${err}`);
  }
};

const isProduction = () => process.env.NODE_ENV === "production";

const getCredentials = () => {
  const prod = {
    driver: "d1-http",
    dbCredentials: {
      accountId: CLOUDFLARE_ACCOUNT_ID,
      databaseId: CLOUDFLARE_DATABASE_ID,
      token: CLOUDFLARE_TOKEN
    }
  };

  const dev = {
    dbCredentials: {
      url: getLocalD1()
    }
  };

  return isProduction() ? prod : dev;
};

// Only used by Drizzle-Kit
export default {
  out: "./drizzle/migrations",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  ...getCredentials()
} satisfies Config;
