import {describe, expect, it} from "vitest";
import rootPackage from "../../package.json";
import workerPackage from "../../workers/indigo-email-queue-consumer/package.json";

// The email consumer worker is never installed through pnpm-workspace.yaml
// (only "." is a package), so nothing resolves or verifies its declared
// dependency ranges. What actually builds it is the root install. This guard
// keeps the worker manifest honest: every range that governs the worker's
// build must equal the root package.json's range for the same key, so the
// drift this file exists to prevent cannot silently reopen.
const sharedDependencies = [
  "@react-email/components",
  "@react-email/render",
  "react",
  "react-dom"
] as const;

const sharedDevDependencies = [
  "@cloudflare/workers-types",
  "@types/react",
  "@types/react-dom",
  "wrangler"
] as const;

describe("email worker manifest matches the root install", () => {
  for (const name of sharedDependencies) {
    it(`declares ${name} at the root's range`, () => {
      expect(workerPackage.dependencies[name]).toBe(
        rootPackage.dependencies[name]
      );
    });
  }

  for (const name of sharedDevDependencies) {
    it(`declares ${name} at the root's range`, () => {
      expect(workerPackage.devDependencies[name]).toBe(
        rootPackage.devDependencies[name]
      );
    });
  }
});
