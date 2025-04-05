import {Text} from "@react-email/components";
import BaseLayout from "./BaseLayout";

type ChangeEmailVerificationProps = {
  name: string;
  url: string;
  newEmail: string;
};

const ChangeEmailVerification = ({
  name,
  url,
  newEmail,
}: ChangeEmailVerificationProps) => {
  const safeName = typeof name === "string" ? name : String(name || "friend");

  return (
    <BaseLayout title="Verify Email Change">
      <Text style={{marginBottom: "16px"}}>Hi, {safeName},</Text>
      <Text style={{marginBottom: "16px"}}>
        We received a request to change your email address to {newEmail}.
      </Text>
      <Text style={{marginBottom: "16px"}}>
        Click the link below to approve this change:
      </Text>
      <Text>
        <a href={url} style={{color: "#0070f3", textDecoration: "underline"}}>
          Approve Email Change
        </a>
      </Text>
      <Text style={{marginTop: "16px", fontSize: "14px", color: "#666666"}}>
        This link will expire in 24 hours. If you didn't request this change,
        please ignore this email.
      </Text>
    </BaseLayout>
  );
};

export default ChangeEmailVerification;
