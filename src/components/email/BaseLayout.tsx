import React from "react";
import {
  Html,
  Body,
  Container,
  Head,
  Hr,
  Text,
  Section,
  Heading,
} from "@react-email/components";

type BaseLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

// Plain component without any fancy React features - more compatible with email rendering
const BaseLayout = ({children, title = "Astro Starter"}: BaseLayoutProps) => (
  <Html>
    <Head />
    <Body style={{fontFamily: "sans-serif", margin: "0", padding: "0"}}>
      <Container
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          border: "1px solid #efefef",
          padding: "16px",
        }}
      >
        {/* Header */}
        <Section style={{marginBottom: "32px"}}>
          <Heading as="h2">{title}</Heading>
        </Section>

        {/* Main Content */}
        <Section style={{marginBottom: "32px", color: "#222222"}}>
          {children}
        </Section>

        <Hr style={{borderColor: "#efefef", margin: "32px 0"}} />

        {/* Footer */}
        <Section style={{color: "#5f5f5f"}}>
          <Text>© 2025 Astro Starter. All rights reserved.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default BaseLayout;
