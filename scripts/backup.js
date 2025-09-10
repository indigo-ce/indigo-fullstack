import {createBackup} from "@cretezy/cloudflare-d1-backup";
import {mkdir, writeFile} from "fs/promises";
import path from "path";

try {
  // Validate required environment variables
  const {CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_TOKEN} =
    process.env;
  for (const [k, v] of Object.entries({
    CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_DATABASE_ID,
    CLOUDFLARE_TOKEN
  })) {
    if (!v) {
      throw new Error(`Missing required environment variable: ${k}`);
    }
  }

  // Create backup
  const backup = await createBackup({
    accountId: CLOUDFLARE_ACCOUNT_ID,
    databaseId: CLOUDFLARE_DATABASE_ID,
    apiKey: CLOUDFLARE_TOKEN,
    limit: 1000
  });

  // Ensure output directory exists and write backup
  const __dirname = path.resolve();
  const outDir = path.join(__dirname, "drizzle");
  await mkdir(outDir, {recursive: true});
  const outFile = path.join(outDir, "backup.sql");
  await writeFile(outFile, backup, "utf8");
  console.log(`Backup created successfully: ${outFile}`);
} catch (error) {
  console.error("Backup failed:", error.message);
  process.exit(1);
}
