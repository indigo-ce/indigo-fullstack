import {Text} from "@react-email/components";
import BaseLayout from "./BaseLayout";

type AccountDeletedProps = {
  name: string;
  locale?: string;
};

const translations = {
  en: {
    title: "Account Deleted",
    preview: "Your account has been successfully deleted",
    greeting: (name: string) => `Hi ${name},`,
    body1: "Your account has been successfully deleted. All your data has been permanently removed from our systems.",
    body2: "We're sorry to see you go. If you change your mind, you can always create a new account.",
    footer: "Thank you for trying out our service."
  },
  ja: {
    title: "アカウントが削除されました",
    preview: "アカウントが正常に削除されました",
    greeting: (name: string) => `${name}さん、こんにちは`,
    body1: "アカウントが正常に削除されました。すべてのデータはシステムから完全に削除されました。",
    body2: "残念ですが、またのご利用をお待ちしております。いつでも新しいアカウントを作成できます。",
    footer: "サービスをお試しいただきありがとうございました。"
  }
};

const AccountDeleted = ({name, locale = "en"}: AccountDeletedProps) => {
  const safeName = typeof name === "string" ? name : String(name || "friend");
  const t = translations[locale as keyof typeof translations] || translations.en;

  return (
    <BaseLayout
      title={t.title}
      preview={t.preview}
    >
      <Text style={{marginBottom: "16px"}}>{t.greeting(safeName)}</Text>
      <Text style={{marginBottom: "16px"}}>
        {t.body1}
      </Text>
      <Text style={{marginBottom: "16px"}}>
        {t.body2}
      </Text>
      <Text style={{marginTop: "16px", fontSize: "14px", color: "#666666"}}>
        {t.footer}
      </Text>
    </BaseLayout>
  );
};

export default AccountDeleted;
