import {Text} from "@react-email/components";
import BaseLayout from "./BaseLayout";

type CustomEmailProps = {
  html: string;
  title?: string;
  preview?: string;
};

const CustomEmail = ({html, title, preview}: CustomEmailProps) => {
  // Safety check - ensure html is a string
  const safeHtml = typeof html === "string" ? html : String(html || "");

  return (
    <BaseLayout title={title || "Indigo Stack CE"} preview={preview}>
      {safeHtml.trim() ? (
        <div dangerouslySetInnerHTML={{__html: safeHtml}} />
      ) : (
        <Text>No content provided</Text>
      )}
    </BaseLayout>
  );
};

export default CustomEmail;
