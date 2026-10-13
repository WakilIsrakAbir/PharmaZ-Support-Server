import { User } from "./user.model.js";
import { AUTH_COOKIE, readToken } from "./auth-token.js";
import { HttpError } from "../../utils/http-error.js";

/** Lets the request through only for a logged-in user, available as `req.user`. */
export async function requireAuth(req, _res, next) {
  const token = readToken(req.cookies[AUTH_COOKIE]);
  // Also catches accounts that were deleted after the token was issued
  const user = token ? await User.findById(token.sub) : null;

  // A password change bumps sessionVersion, which logs out every older session
  if (!user || (token.ver ?? 0) !== user.sessionVersion) {
    throw new HttpError(401, "Please log in to continue.");
  }

  req.user = user;
  next();
}
