import { HttpError } from "../utils/http-error.js";

/**
 * Checks parts of the request against zod schemas, e.g. validate({ body: schema }).
 * The cleaned-up values are put on `req.validated.body` / `req.validated.query`.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    req.validated = {};

    for (const [part, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[part] ?? {});

      if (!result.success) {
        throw new HttpError(400, "Validation failed", toFieldErrors(result.error));
      }

      req.validated[part] = result.data;
    }

    next();
  };
}

// Turns zod issues into { fieldName: "first message for that field" }
function toFieldErrors(error) {
  const fields = {};

  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) fields[key] = "Unknown field.";
      continue;
    }

    const name = issue.path.join(".") || "body";
    fields[name] ??= issue.message;
  }

  return fields;
}
