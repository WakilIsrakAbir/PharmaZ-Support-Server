import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const { host, port, user, pass } = env.smtp;

const transporter = host
  ? nodemailer.createTransport({
      host,
      port,
      // Port 465 uses TLS from the start; 587 upgrades with STARTTLS
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    })
  : null;

export async function sendMail({ to, subject, text, html }) {
  if (transporter) {
    await transporter.sendMail({ from: env.mailFrom, to, subject, text, html });
    return;
  }

  // No SMTP server in .env yet. In development, print the email so the flow can still
  // be tested. Never in production, where the logs could leak reset links.
  if (env.isProduction) {
    console.error(`Email not sent to ${to}: SMTP_HOST is not set.`);
    return;
  }

  console.info(`\n----- Email (SMTP not set up, so printed here) -----\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---------------------------------------------------\n`);
}
