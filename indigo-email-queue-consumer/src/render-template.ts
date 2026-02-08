import {render} from "@react-email/render";
import type {EmailTemplate} from "@app/lib/email-queue";

import EmailVerification from "@app/components/email/EmailVerification";
import PasswordReset from "@app/components/email/PasswordReset";
import AccountDeleted from "@app/components/email/AccountDeleted";
import WelcomeEmail from "@app/components/email/WelcomeEmail";
import CustomEmail from "@app/components/email/CustomEmail";

export async function renderEmailTemplate(
  template: EmailTemplate,
  locale: string
): Promise<string> {
  switch (template.type) {
    case "email-verification":
      return render(EmailVerification({...template.props, locale}));
    case "password-reset":
      return render(PasswordReset({...template.props, locale}));
    case "account-deleted":
      return render(AccountDeleted({...template.props, locale}));
    case "welcome":
      return render(WelcomeEmail({...template.props, locale}));
    case "custom":
      return render(CustomEmail({...template.props, locale}));
    default:
      const _exhaustive: never = template;
      throw new Error(`Unknown template type: ${JSON.stringify(_exhaustive)}`);
  }
}
