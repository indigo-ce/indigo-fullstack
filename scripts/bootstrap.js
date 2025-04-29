import {spawn} from "child_process";

// Take an argument from the command line
const projectName = process.argv[2];
const trainCaseProjectName = projectName
  .replace(/[^a-zA-Z0-9]+/g, " ")
  .trim()
  .split(" ")
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join("-");

if (!projectName) {
  console.error("Please provide a project name");
  process.exit(1);
}

const prompt = `Rename the project to ${projectName} (or ${trainCaseProjectName}). Update the following files that contain "Astro Starter" (and any others not listed) to use the new project name.

- src/pages/email-demo.astro
- src/pages/index.astro
- src/layouts/Layout.astro
- src/lib/email.ts
- src/actions/email.ts
- src/components/email/WelcomeEmail.tsx
- src/components/email/CustomEmail.tsx
- src/components/email/BaseLayout.tsx
- src/components/Header.astro
- README.md
- .cursor/rules/project.mdc
- package.json
- .env.example
- wrangler.jsonc

Once done, go over the required environment variables listed in the README.md and provide the commands to set them using wrangler CLI. You do not need to run the commands, just provide instructions on what to do.`;

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

const child = spawn(command, args, {
  stdio: "inherit"
});

child.on("close", (code) => {
  console.log(`Claude process exited with code ${code}`);
});
