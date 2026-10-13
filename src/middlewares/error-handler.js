import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

export function notFound(req, _res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Express treats a middleware with 4 arguments as the error handler, so `_next` must stay.
export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: { message: error.message, ...(error.fields && { fields: error.fields }) },
    });
  }

  // Thrown by express.json() for bad request bodies
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: { message: "Request body is not valid JSON." } });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: { message: "Request body is too large." } });
  }

  // MongoDB unique index, e.g. two sign-ups with the same email at the same moment
  if (error.code === 11000) {
    return res.status(409).json({ error: { message: "That record already exists." } });
  }

  console.error(error);
  res.status(500).json({
    error: { message: env.isProduction ? "Something went wrong." : error.message },
  });
}
