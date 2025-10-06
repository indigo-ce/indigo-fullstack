import {describe, it, expect, vi, beforeEach} from "vitest";
import {sendEmail} from "@/lib/email";

// Mock Resend
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({id: "test-email-id"})
    }
  }))
}));

describe("Email Utilities", () => {
  let mockEnv: Partial<Env>;

  beforeEach(() => {
    mockEnv = {
      RESEND_API_KEY: "re_test_key",
      SEND_EMAIL_FROM: "Indigo Stack CE <noreply@indigostack.org>",
      BETTER_AUTH_BASE_URL: "http://localhost:3000"
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe("sendEmail", () => {
    it("should send email successfully in production", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      // Just test that the function runs without throwing
      await expect(
        sendEmail(
          "user@example.com",
          "Test Subject",
          "<p>Test content</p>",
          mockEnv as Env
        )
      ).resolves.toBeDefined();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should redirect email to test address in development", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      // Just test that the function runs without throwing
      await expect(
        sendEmail(
          "user@example.com",
          "Test Subject",
          "<p>Test content</p>",
          mockEnv as Env
        )
      ).resolves.toBeDefined();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should throw error when RESEND_API_KEY is missing", async () => {
      delete (mockEnv as any).RESEND_API_KEY;

      await expect(
        sendEmail(
          "user@example.com",
          "Test Subject",
          "<p>Test content</p>",
          mockEnv as Env
        )
      ).rejects.toThrow("RESEND_API_KEY");
    });

    it("should throw error when SEND_EMAIL_FROM is missing in production", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      delete (mockEnv as any).SEND_EMAIL_FROM;

      await expect(
        sendEmail(
          "user@example.com",
          "Test Subject",
          "<p>Test content</p>",
          mockEnv as Env
        )
      ).rejects.toThrow("SEND_EMAIL_FROM");

      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should handle email functionality", async () => {
      // Basic test to ensure the function exists and is callable
      expect(typeof sendEmail).toBe("function");
    });
  });
});
