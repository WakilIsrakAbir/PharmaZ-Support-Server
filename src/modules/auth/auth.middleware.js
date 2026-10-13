import { User } from "./user.model.js";
import { AUTH_COOKIE, readUserId } from "./auth-token.js";
import { HttpError } from "../../utils/http-error.js";

/** Lets the request through only for a logged-in user, available as `req.user`. */
export async function requireAuth(req, _res, next) {
  const userId = readUserId(req.cookies[AUTH_COOKIE]);
  // Also catches accounts that were deleted after the token was issued
  const user = userId ? await User.findById(userId) : null;

  if (!user) {
    throw new HttpError(401, "Please log in to continue.");
  }

  req.user = user;
  next();
}
