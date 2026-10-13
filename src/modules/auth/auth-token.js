import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export const AUTH_COOKIE = "token";

// httpOnly keeps the token away from browser JavaScript.
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.isProduction,
  path: "/",
};

export function setAuthCookie(res, user) {
  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  const { exp } = jwt.decode(token);

  // The cookie expires together with the token inside it
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, expires: new Date(exp * 1000) });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieOptions);
}

/** The user id inside a valid token, or null if the token is missing, expired or tampered with. */
export function readUserId(token) {
  if (!token) return null;

  try {
    return jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }).sub;
  } catch {
    return null;
  }
}
