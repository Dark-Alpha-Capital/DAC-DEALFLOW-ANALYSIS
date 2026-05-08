import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface PasswordResetEmailProps {
  url: string;
}

export const PasswordResetEmail = ({ url }: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your password for DAC DealFlow</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>DAC DealFlow</Heading>
          </Section>
          <Section style={content}>
            <Heading style={heading}>Reset your password</Heading>
            <Text style={paragraph}>
              We received a request to reset your password. Click the button
              below to choose a new password.
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={url}>
                Reset Password
              </Button>
            </Section>
            <Text style={disclaimer}>
              If you didn't request a password reset, you can safely ignore this
              email. Your password will remain unchanged.
            </Text>
            <Text style={expiryText}>This link will expire in 1 hour.</Text>
            <Hr style={hr} />
            <Text style={linkText}>
              If the button doesn't work, copy and paste this link into your
              browser:
            </Text>
            <Link href={url} style={link}>
              {url}
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  backgroundColor: "#f6f9fc",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
  padding: "30px",
  borderRadius: "10px 10px 0 0",
};

const headerTitle = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0",
};

const content = {
  padding: "30px",
  border: "1px solid #e0e0e0",
  borderTop: "none",
  borderRadius: "0 0 10px 10px",
};

const heading = {
  color: "#1a1a2e",
  fontSize: "24px",
  fontWeight: "600",
  marginTop: "0",
  marginBottom: "16px",
};

const paragraph = {
  color: "#555555",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#1a1a2e",
  color: "#ffffff",
  padding: "14px 30px",
  textDecoration: "none",
  borderRadius: "6px",
  fontWeight: "600",
  display: "inline-block",
};

const disclaimer = {
  color: "#777777",
  fontSize: "14px",
  margin: "16px 0",
};

const expiryText = {
  color: "#777777",
  fontSize: "14px",
  margin: "16px 0",
};

const hr = {
  borderColor: "#e0e0e0",
  margin: "20px 0",
};

const linkText = {
  color: "#999999",
  fontSize: "12px",
  margin: "16px 0 8px",
};

const link = {
  color: "#666666",
  fontSize: "12px",
  wordBreak: "break-all" as const,
  textDecoration: "underline",
};

