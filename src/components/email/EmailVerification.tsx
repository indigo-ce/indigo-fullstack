import {Text} from "@react-email/components";
import BaseLayout from "./BaseLayout";

type EmailVerificationProps = {
  name: string;
  url: string;
};

const EmailVerification = ({name, url}: EmailVerificationProps) => {
  const safeName = typeof name === "string" ? name : String(name || "friend");

  return (
    <BaseLayout title="Verify Your Email">
      <Text style={{marginBottom: "16px"}}>Hi, {safeName},</Text>
      <Text style={{marginBottom: "16px"}}>
        Thanks for signing up! Please verify your email address to complete your
        registration.
      </Text>
      <Text style={{marginBottom: "16px"}}>
        Click the link below to verify your email:
      </Text>
      <Text>
        <a href={url} style={{color: "#0070f3", textDecoration: "underline"}}>
          Verify Email
        </a>
      </Text>
      <Text style={{marginTop: "16px", fontSize: "14px", color: "#666666"}}>
        This link will expire in 24 hours.
      </Text>
    </BaseLayout>
  );
};

export default EmailVerification;
