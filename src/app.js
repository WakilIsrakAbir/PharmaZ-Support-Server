import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/error-handler.js";
import routes from "./routes.js";

export function createApp() {
  const app = express();

  // The client reaches the API through the Next.js server, so trust its
  // X-Forwarded-For header to get the real visitor IP (used by the rate limiter).
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.clientUrls, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(morgan(env.isProduction ? "combined" : "dev"));

  app.use("/api", routes);

  // These two must come last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
