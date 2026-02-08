import {Text} from "@react-email/components";
import BaseLayout from "./BaseLayout";

type WelcomeEmailProps = {
  name: string;
  locale?: string;
};

const translations = {
  en: {
    title: "Welcome to Indigo Stack CE",
    greeting: (name: string) => `Hi, ${name},`,
    welcome: "Welcome to Indigo Stack CE!",
    body: "Thank you for joining us. We're excited to have you on board and look forward to helping you build amazing projects with Indigo Stack CE."
  },
  ja: {
    title: "Indigo Stack CEへようこそ",
    greeting: (name: string) => `${name}さん、こんにちは`,
    welcome: "Indigo Stack CEへようこそ！",
    body: "ご参加いただきありがとうございます。Indigo Stack CEで素晴らしいプロジェクトを構築するお手伝いができることを楽しみにしています。"
  }
};

// Simple functional component for React Email
const WelcomeEmail = ({name, locale = "en"}: WelcomeEmailProps) => {
  // Ensure name is a string
  const safeName = typeof name === "string" ? name : String(name || "friend");
  const t = translations[locale as keyof typeof translations] || translations.en;

  return (
    <BaseLayout title={t.title}>
      <Text style={{marginBottom: "16px"}}>{t.greeting(safeName)}</Text>
      <Text style={{marginBottom: "16px"}}>{t.welcome}</Text>
      <Text>
        {t.body}
      </Text>
    </BaseLayout>
  );
};

export default WelcomeEmail;
