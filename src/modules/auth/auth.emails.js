import { env } from "../../config/env.js";

export function passwordResetEmail({ name, token }) {
  const link = `${env.appUrl}/reset-password?token=${token}`;

  return {
    subject: `Reset your ${env.brandName} password`,
    text: [
      `Hi ${name},`,
      "",
      `Someone asked to reset the password for your ${env.brandName} account.`,
      "Open this link to choose a new one. It works once and expires in 30 minutes:",
      "",
      link,
      "",
      "If this wasn't you, ignore this email. Your password won't change.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f1d17">
        <h2 style="margin:0 0 16px">Reset your password</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Someone asked to reset the password for your ${escapeHtml(env.brandName)} account. The link works once and expires in 30 minutes.</p>
        <p style="margin:28px 0">
          <a href="${link}" style="background:#059669;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Choose a new password</a>
        </p>
        <p style="color:#5b6b63;font-size:13px">If this wasn't you, ignore this email. Your password won't change.</p>
      </div>`,
  };
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
