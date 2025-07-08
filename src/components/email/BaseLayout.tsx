import React from "react";
import {
  Html,
  Body,
  Container,
  Head,
  Text,
  Heading,
  Preview,
  Link,
  Hr,
} from "@react-email/components";

type BaseLayoutProps = {
  children: React.ReactNode;
  title?: string;
  preview?: string;
};

const BaseLayout = ({
  children,
  title = "Indigo CE",
  preview,
}: BaseLayoutProps) => (
  <Html>
    <Head />
    {preview && <Preview>{preview}</Preview>}
    <Body style={body}>
      <Container style={container}>
        <Heading style={h1}>{title}</Heading>

        {children}

        <Hr style={border} />

        <Text style={footer}>
          <Link
            href="https://github.com/4rays/indigo-stack"
            target="_blank"
            style={{...link, color: "#898989"}}
          >
            Indigo CE
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default BaseLayout;

const body = {
  backgroundColor: "#ffffff",
};

const container = {
  paddingLeft: "12px",
  paddingRight: "12px",
  margin: "0 auto",
};

const h1 = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
};

const link = {
  color: "#2754C5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  textDecoration: "underline",
};

const border = {
  borderColor: "#efefef",
};

const footer = {
  color: "#898989",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "12px",
  lineHeight: "22px",
  marginTop: "12px",
  marginBottom: "24px",
};
