import type {Config} from "drizzle-kit";
import path from "path";
import fs from "fs";

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

// Only used by Drizzle-Kit
export default {
  out: "./drizzle/migrations",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: getLocalD1()
  }
} satisfies Config;
