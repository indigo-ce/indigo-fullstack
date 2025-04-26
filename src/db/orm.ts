import "dotenv/config";
import {drizzle} from "drizzle-orm/d1";
import * as schema from "./schema";

export const orm = (database: D1Database) => drizzle(database, {schema});
