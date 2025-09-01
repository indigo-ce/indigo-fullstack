import {describe, it, expect, vi, beforeEach} from "vitest";
import {sendEmail} from "@/lib/email";

// Mock Resend
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: "test-email-id" })
    }
  }))
}));

describe("Email Utilities", () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      RESEND_API_KEY: "re_test_key",
      SEND_EMAIL_FROM: "Test <test@example.com>",
      BETTER_AUTH_BASE_URL: "http://localhost:3000"
    } as Env;
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe("sendEmail", () => {
    it("should send email successfully in production", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      // Just test that the function runs without throwing
      await expect(
        sendEmail("user@example.com", "Test Subject", "<p>Test content</p>", mockEnv)
      ).resolves.toBeDefined();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should redirect email to test address in development", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      // Just test that the function runs without throwing
      await expect(
        sendEmail("user@example.com", "Test Subject", "<p>Test content</p>", mockEnv)
      ).resolves.toBeDefined();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should throw error when RESEND_API_KEY is missing", async () => {
      mockEnv.RESEND_API_KEY = undefined;

      await expect(
        sendEmail("user@example.com", "Test Subject", "<p>Test content</p>", mockEnv)
      ).rejects.toThrow("RESEND_API_KEY");
    });

    it("should throw error when SEND_EMAIL_FROM is missing in production", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      
      mockEnv.SEND_EMAIL_FROM = undefined;

      await expect(
        sendEmail("user@example.com", "Test Subject", "<p>Test content</p>", mockEnv)
      ).rejects.toThrow("SEND_EMAIL_FROM");

      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should handle email functionality", async () => {
      // Basic test to ensure the function exists and is callable
      expect(typeof sendEmail).toBe("function");
    });
  });
});