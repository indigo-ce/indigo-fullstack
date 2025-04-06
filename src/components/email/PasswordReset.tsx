import {Text} from "@react-email/components";
import BaseLayout from "./BaseLayout";

type PasswordResetProps = {
  name: string;
  resetLink: string;
};

const PasswordReset = ({name, resetLink}: PasswordResetProps) => {
  const safeName = typeof name === "string" ? name : String(name || "friend");

  return (
    <BaseLayout title="Reset Your Password">
      <Text style={{marginBottom: "16px"}}>Hi, {safeName},</Text>
      <Text style={{marginBottom: "16px"}}>
        We received a request to reset your password.
      </Text>
      <Text style={{marginBottom: "16px"}}>
        If you didn't make this request, you can safely ignore this email.
        Otherwise, click the link below to reset your password:
      </Text>
      <Text>
        <a
          href={resetLink}
          style={{color: "#0070f3", textDecoration: "underline"}}
        >
          Reset Password
        </a>
      </Text>
      <Text style={{marginTop: "16px", fontSize: "14px", color: "#666666"}}>
        This link will expire in 24 hours.
      </Text>
    </BaseLayout>
  );
};

export default PasswordReset;
