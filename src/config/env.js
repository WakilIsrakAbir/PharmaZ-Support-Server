// Reads settings from environment variables (loaded from .env by the npm scripts).

const nodeEnv = process.env.NODE_ENV ?? "development";

const clientUrls = (process.env.CLIENT_URL ?? "http://localhost:3000")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: Number(process.env.PORT ?? 5000),
  mongodbUri: process.env.MONGODB_URI,
  clientUrls,
  // Links in emails point here
  appUrl: clientUrls[0],
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  // Logins / password changes allowed per IP every 15 minutes
  authRateLimit: Number(process.env.AUTH_RATE_LIMIT ?? 20),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  mailFrom: process.env.MAIL_FROM ?? "PharmaZ247 Support <no-reply@localhost>",
};

for (const name of ["MONGODB_URI", "JWT_SECRET"]) {
  if (!process.env[name]) {
    throw new Error(`${name} is missing. Copy .env.example to .env and fill it in.`);
  }
}
