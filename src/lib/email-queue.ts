export type EmailTemplate =
  | {type: "email-verification"; props: {name: string; url: string}}
  | {type: "password-reset"; props: {name: string; resetLink: string}}
  | {type: "account-deleted"; props: {name: string}}
  | {type: "welcome"; props: {name: string}}
  | {type: "custom"; props: {html: string; title?: string; preview?: string}};

export interface EmailQueueMessage {
  to: string;
  subject: string;
  template: EmailTemplate;
  locale: string;
  queuedAt: string;
}

// Localized email subjects
export const EMAIL_SUBJECTS: Record<string, Record<EmailTemplate["type"], string>> = {
  en: {
    "email-verification": "Verify Your Email",
    "password-reset": "Reset Your Password",
    "account-deleted": "Account Deleted",
    "welcome": "Welcome to Indigo!",
    "custom": "Message from Indigo"
  },
  ja: {
    "email-verification": "メールアドレスの確認",
    "password-reset": "パスワードのリセット",
    "account-deleted": "アカウントが削除されました",
    "welcome": "Indigoへようこそ！",
    "custom": "Indigoからのメッセージ"
  }
};
