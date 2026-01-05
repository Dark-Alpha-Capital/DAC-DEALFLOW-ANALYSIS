import { render } from "@react-email/render";
import { Resend } from "resend";
import { VerificationEmail } from "@/components/emails/verification-email";
import { PasswordResetEmail } from "@/components/emails/password-reset-email";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "dealflow@darkalphacapital.com";
const APP_NAME = "DAC DealFlow";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
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
