import {Text} from "@react-email/components";
import BaseLayout from "./BaseLayout";

type AccountDeletedProps = {
  name: string;
};

const AccountDeleted = ({name}: AccountDeletedProps) => {
  const safeName = typeof name === "string" ? name : String(name || "friend");

  return (
    <BaseLayout
      title="Account Deleted"
      preview="Your account has been successfully deleted"
    >
      <Text style={{marginBottom: "16px"}}>Hi {safeName},</Text>
      <Text style={{marginBottom: "16px"}}>
        Your account has been successfully deleted. All your data has been
        permanently removed from our systems.
      </Text>
      <Text style={{marginBottom: "16px"}}>
        We're sorry to see you go. If you change your mind, you can always
        create a new account.
      </Text>
      <Text style={{marginTop: "16px", fontSize: "14px", color: "#666666"}}>
        Thank you for trying out our service.
      </Text>
    </BaseLayout>
  );
};

export default AccountDeleted;
