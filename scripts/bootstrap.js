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

const filesToDelete = [
  "scripts/bootstrap.js",
  "drizzle/migrations/*.sql",
  "drizzle/migrations/meta",
  "drizzle/meta",
  "src/styles.css"
];

const prompt = `Rename the project to ${projectName} (or ${trainCaseProjectName}).
- Update the following files that contain Astro Starter or similar text (and any others not listed) to use the new project name. Do not update the /scripts folder. Example files to update: ${filesToUpdate.join(
  ", "
)}
- Delete the following files: ${filesToDelete.join(", ")}
- Rename 'src/_styles.css' to 'src/styles.css' (replacing the deleted brand colors with neutral colors)
- Remove the pre-existing TODO.md and rename _TODO.md to TODO.md.
- Copy '.devvars.example' into '.dev.vars' for local development.
- Remove the email testing page and the link to it from the dashboard.
- Remove all mentions of "template" in the README and project as a whole.
- Update CLAUDE.md with project-specific architecture details and remove generic "Indigo Stack CE" references.
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
