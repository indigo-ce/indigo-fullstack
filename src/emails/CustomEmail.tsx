import React from "react";
import {Text} from "@react-email/components";
import BaseLayout from "./BaseLayout";

type CustomEmailProps = {
  html: string;
  title?: string;
};

const CustomEmail = ({html, title}: CustomEmailProps) => {
  // Safety check - ensure html is a string
  const safeHtml = typeof html === "string" ? html : String(html || "");

  return (
    <BaseLayout title={title || "Astro Starter"}>
      {safeHtml.trim() ? (
        <div dangerouslySetInnerHTML={{__html: safeHtml}} />
      ) : (
        <Text>No content provided</Text>
      )}
    </BaseLayout>
  );
};

export default CustomEmail;
