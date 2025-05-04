import {spawn} from "child_process";

// Take an argument from the command line
const projectName = process.argv[2];
const isPromptOnly = process.argv.includes("--prompt-only");

if (!projectName) {
  console.error("Please provide a project name");
  process.exit(1);
}

const trainCaseProjectName = projectName
  .replace(/[^a-zA-Z0-9]+/g, " ")
  .trim()
  .split(" ")
  .map((word) => word.toLowerCase())
  .join("-");

// Check if Claude is installed
try {
  const checkClaude = spawn("which", ["claude"], {stdio: "pipe"});
  checkClaude.on("close", (code) => {
    if (code !== 0) {
      console.error("Claude CLI is not installed or not in your PATH.");
      console.error(
        "Please install Claude CLI or use another method to rename the project."
      );
      process.exit(1);
    }
  });
} catch (error) {
  console.error("Failed to check for Claude CLI:", error.message);
  process.exit(1);
}

const filesToUpdate = [
  "src/pages/email-demo.astro",
  "src/pages/index.astro",
  "src/layouts/Layout.astro",
  "src/lib/email.ts",
  "src/actions/email.ts",
  "src/components/email/WelcomeEmail.tsx",
  "src/components/email/CustomEmail.tsx",
  "src/components/email/BaseLayout.tsx",
  "src/components/Header.astro",
  "README.md",
  ".cursor/rules/project.mdc",
  "package.json",
  ".dev.vars.example",
  "wrangler.jsonc"
];

const filesToDelete = ["scripts/bootstrap.js", "drizzle/*"];

const prompt = `Rename the project to ${projectName} (or ${trainCaseProjectName}).

- Update the following files that contain Astro Starter or similar text (and any others not listed) to use the new project name. Do not update the /scripts folder. Example files to update: ${filesToUpdate.join(
  ", "
)}

- Delete the following files: ${filesToDelete.join(", ")}

- Remove the todos from the README.md file.

- List the required secrets and variables. Provide instructions for setting the secrets (BETTER_AUTH_SECRET, RESEND_API_KEY) using 'pnpm wrangler secret put <KEY>' for production deployment. Mention that these can be added to '.dev.vars' for local development. Also, mention that variables like 'BETTER_AUTH_BASE_URL' and 'SEND_EMAIL_FROM' should be set in the 'wrangler.jsonc' file under the 'vars' section. You do not need to run the commands, just provide instructions. Provide a command to create a D1 database in Cloudflare. Refer to the README.md file for the correct command.
`;

const command = "claude";
const args = [
  "-p",
  prompt,
  "--allowedTools",
  "Edit",
  "Bash",
  "Write",
  "GlobTool",
  "GrepTool",
  "LS"
];

if (isPromptOnly) {
  const dryRunArgs = [
    "-p",
    `"${prompt.replace(/\n/g, " ")}"`,
    "--allowedTools",
    `"Edit", "Bash", "Write", "GlobTool", "GrepTool", "LS"`
  ];
  console.log(`${command} ${dryRunArgs.join(" ")}`);
  process.exit(0);
}

const child = spawn(command, args, {
  stdio: ["inherit", "pipe", "pipe"]
});

child.stdout.on("data", (data) => {
  process.stdout.write(data);
});

child.stderr.on("data", (data) => {
  process.stderr.write(data);
});

child.on("close", (code) => {
  console.log(`Claude process exited with code ${code}`);
});
