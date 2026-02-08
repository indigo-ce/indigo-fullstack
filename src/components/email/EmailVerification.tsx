import {Text} from "@react-email/components";
import BaseLayout from "./BaseLayout";

type EmailVerificationProps = {
  name: string;
  url: string;
  locale?: string;
};

const translations = {
  en: {
    title: "Verify Your Email",
    greeting: (name: string) => `Hi, ${name},`,
    body1: "Thanks for signing up! Please verify your email address to complete your registration.",
    body2: "Click the link below to verify your email:",
    button: "Verify Email",
    expiry: "This link will expire in 24 hours."
  },
  ja: {
    title: "メールアドレスの確認",
    greeting: (name: string) => `${name}さん、こんにちは`,
    body1: "ご登録ありがとうございます！登録を完了するには、メールアドレスを確認してください。",
    body2: "以下のリンクをクリックして、メールアドレスを確認してください。",
    button: "メールを確認",
    expiry: "このリンクは24時間で期限切れになります。"
  }
};

const EmailVerification = ({name, url, locale = "en"}: EmailVerificationProps) => {
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
        <a href={url} style={{color: "#0070f3", textDecoration: "underline"}}>
          {t.button}
        </a>
      </Text>
      <Text style={{marginTop: "16px", fontSize: "14px", color: "#666666"}}>
        {t.expiry}
      </Text>
    </BaseLayout>
  );
};

export default EmailVerification;
