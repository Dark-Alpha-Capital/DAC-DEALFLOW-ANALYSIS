import { render } from "@react-email/render";
import { Resend } from "resend";
import { VerificationEmail } from "@/components/emails/verification-email";
import { PasswordResetEmail } from "@/components/emails/password-reset-email";
import { getServerEnv } from "@/lib/env.server";

const APP_NAME = "DAC DealFlow";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const env = getServerEnv();
  const resend = new Resend(env.RESEND_API_KEY ?? "");
  const fromEmail =
    env.RESEND_FROM_EMAIL || "dealflow@darkalphacapital.com";

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${fromEmail}>`,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export async function getVerificationEmailHtml(url: string): Promise<string> {
  return await render(<VerificationEmail url={url} />);
}

export async function getPasswordResetEmailHtml(url: string): Promise<string> {
  return await render(<PasswordResetEmail url={url} />);
}
