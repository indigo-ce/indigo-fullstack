import {Text} from "@react-email/components";
import BaseLayout from "./BaseLayout";

type PasswordResetProps = {
  name: string;
  resetLink: string;
  locale?: string;
};

const translations = {
  en: {
    title: "Reset Your Password",
    greeting: (name: string) => `Hi, ${name},`,
    body1: "We received a request to reset your password.",
    body2: "If you didn't make this request, you can safely ignore this email. Otherwise, click the link below to reset your password:",
    button: "Reset Password",
    expiry: "This link will expire in 24 hours."
  },
  ja: {
    title: "パスワードのリセット",
    greeting: (name: string) => `${name}さん、こんにちは`,
    body1: "パスワードのリセットのリクエストを受け付けました。",
    body2: "このリクエストを行っていない場合は、このメールを無視してください。それ以外の場合は、以下のリンクをクリックしてパスワードをリセットしてください。",
    button: "パスワードをリセット",
    expiry: "このリンクは24時間で期限切れになります。"
  }
};

const PasswordReset = ({name, resetLink, locale = "en"}: PasswordResetProps) => {
  const safeName = typeof name === "string" ? name : String(name || "friend");
  const t = translations[locale as keyof typeof translations] || translations.en;

  return (
    <BaseLayout title={t.title}>
      <Text style={{marginBottom: "16px"}}>{t.greeting(safeName)}</Text>
      <Text style={{marginBottom: "16px"}}>
        {t.body1}
      </Text>
      <Text style={{marginBottom: "16px"}}>
        {t.body2}
      </Text>
      <Text>
        <a
          href={resetLink}
          style={{color: "#0070f3", textDecoration: "underline"}}
        >
          {t.button}
        </a>
      </Text>
      <Text style={{marginTop: "16px", fontSize: "14px", color: "#666666"}}>
        {t.expiry}
      </Text>
    </BaseLayout>
  );
};

export default PasswordReset;
