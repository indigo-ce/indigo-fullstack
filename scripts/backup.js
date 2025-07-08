import "dotenv/config";
import {createBackup} from "@cretezy/cloudflare-d1-backup";
import {writeFile} from "fs";
import path from "path";

const backup = await createBackup({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  databaseId: process.env.CLOUDFLARE_DATABASE_ID,
  apiKey: process.env.CLOUDFLARE_TOKEN,
  limit: 1000
});

const __dirname = path.resolve();

writeFile(path.join(__dirname, "drizzle/backup.sql"), backup, "utf8", (err) => {
  if (err) {
    console.error("An error occurred:", err);
    return;
  }

  console.log("Backup created successfully.");
});
