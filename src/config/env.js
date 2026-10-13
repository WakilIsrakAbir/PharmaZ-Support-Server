// Reads settings from environment variables (loaded from .env by the npm scripts).

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: Number(process.env.PORT ?? 5000),
  mongodbUri: process.env.MONGODB_URI,
  clientUrls: (process.env.CLIENT_URL ?? "http://localhost:3000")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
};

for (const name of ["MONGODB_URI", "JWT_SECRET"]) {
  if (!process.env[name]) {
    throw new Error(`${name} is missing. Copy .env.example to .env and fill it in.`);
  }
}
