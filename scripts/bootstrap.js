import {spawn, spawnSync} from "child_process";

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

// Check if Claude is installed synchronously
try {
  const checkClaude = spawnSync("which", ["claude"], {stdio: "pipe"});
  
  if (checkClaude.status !== 0) {
    console.error("Claude CLI is not installed or not in your PATH.");
    console.error(
      "Please install Claude CLI or use another method to rename the project."
    );
    process.exit(1);
  }
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
  "src/components/Footer.astro",
  "README.md",
  ".cursor/rules/project.mdc",
  "package.json",
  ".dev.vars.example",
  "wrangler.jsonc",
  "CLAUDE.md"
];

const filesToDelete = ["scripts/bootstrap.js", "drizzle/*"];

const prompt = `Rename the project to ${projectName} (or ${trainCaseProjectName}).
- Update the following files that contain Astro Starter or similar text (and any others not listed) to use the new project name. Do not update the /scripts folder. Example files to update: ${filesToUpdate.join(
  ", "
)}
- Delete the following files: ${filesToDelete.join(", ")}
- Remove the todos from the README.md file.
- Copy '.dev.vars.example' into '.dev.vars' for local development.
- Return a todo list of the remaining steps to complete the project.
  - Each required secret and env variable should be its own task. 
  - Provide commands for setting the secrets on production using 'pnpm wrangler secret put <KEY>' for production deployment. 
  - We need to deplot the app before setting the secrets on production.
  - Add tasks for setting the variables 'BETTER_AUTH_BASE_URL' and 'SEND_EMAIL_FROM' in the 'wrangler.jsonc' file under the 'vars' section.
  - Provide a command to create a D1 database in Cloudflare. Refer to the README.md file for the correct command.
  - Go over the remaining tasks listed in README.md and merge them with your list.
  - Remove all mentions of "template" in the README.
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
