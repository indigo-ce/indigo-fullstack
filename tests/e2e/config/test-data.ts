/**
 * Test Data Configuration
 *
 * Centralized test data for e2e tests to ensure consistency
 * and make it easy to update test values across all tests.
 */

export const TEST_USERS = {
  /**
   * Generate a new unique user for tests that require a fresh account
   * (e.g., sign-up flow tests)
   */
  new: () => ({
    email: `test-${Date.now()}@example.com`,
    password: "SecureP@ssw0rd123",
    name: "Test User"
  }),

  /**
   * Existing user credentials for sign-in tests
   * Note: This user should exist in your test database or be created in beforeAll hooks
   */
  existing: {
    email: "test@example.com",
    password: "SecureP@ssw0rd123",
    name: "Test User"
  }
};

export const TEST_PASSWORDS = {
  valid: "SecureP@ssw0rd123",
  weak: "weak",
  wrong: "WrongPassword123"
};

export const TEST_EMAILS = {
  invalid: "invalid-email",
  nonexistent: "nonexistent@example.com"
};

export const ROUTES = {
  signUp: "/en/sign-up",
  signIn: "/en/sign-in",
  dashboard: "/en/dashboard",
  verifyEmail: "/en/verify-email",
  forgotPassword: "/en/forgot-password",
  resetPassword: "/en/reset-password",
  account: "/en/account"
};
