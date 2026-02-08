import {describe, it, expect, vi, beforeEach} from "vitest";
import {queueEmail} from "@/lib/email";

describe("Email Utilities", () => {
  let mockEnv: Partial<Env>;
  let mockQueueSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockQueueSend = vi.fn().mockResolvedValue(undefined);

    mockEnv = {
      BETTER_AUTH_BASE_URL: "https://example.com",
      EMAIL_QUEUE: {
        send: mockQueueSend
      } as unknown as Queue
    };

    vi.clearAllMocks();
  });

  describe("queueEmail", () => {
    it("should queue email in production", async () => {
      const result = await queueEmail(
        "user@example.com",
        {type: "welcome", props: {name: "John"}},
        mockEnv as Env
      );

      expect(result).toEqual({queued: true});
      expect(mockQueueSend).toHaveBeenCalledOnce();
      expect(mockQueueSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Welcome to Indigo!",
          template: {type: "welcome", props: {name: "John"}},
          locale: "en"
        })
      );
    });

    it("should use localized subject for Japanese locale", async () => {
      await queueEmail(
        "user@example.com",
        {type: "email-verification", props: {name: "太郎", url: "https://example.com/verify"}},
        mockEnv as Env,
        {locale: "ja"}
      );

      expect(mockQueueSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "メールアドレスの確認",
          locale: "ja"
        })
      );
    });

    it("should use custom subject when provided", async () => {
      await queueEmail(
        "user@example.com",
        {type: "welcome", props: {name: "John"}},
        mockEnv as Env,
        {subject: "Custom Subject"}
      );

      expect(mockQueueSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Custom Subject"
        })
      );
    });

    it("should log to console in local development instead of queuing", async () => {
      const localEnv = {
        BETTER_AUTH_BASE_URL: "http://localhost:4321",
        EMAIL_QUEUE: {send: mockQueueSend} as unknown as Queue
      } as Env;

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await queueEmail(
        "user@example.com",
        {type: "welcome", props: {name: "John"}},
        localEnv
      );

      expect(result).toEqual({queued: true});
      expect(mockQueueSend).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[LOCAL DEV]"));

      consoleSpy.mockRestore();
    });

    it("should fall back to English subject for unknown locale", async () => {
      await queueEmail(
        "user@example.com",
        {type: "welcome", props: {name: "John"}},
        mockEnv as Env,
        {locale: "fr"}
      );

      expect(mockQueueSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Welcome to Indigo!",
          locale: "fr"
        })
      );
    });
  });
});
