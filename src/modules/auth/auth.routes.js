import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { forgotPassword, login, logout, resetPassword } from "./auth.controller.js";
import { changePassword, getCurrentUser, updateCurrentUser } from "./account.controller.js";
import { requireAuth } from "./auth.middleware.js";
import { validate } from "../../middlewares/validate.js";
import { env } from "../../config/env.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "./auth.validator.js";

const router = Router();

// Each limiter counts attempts per IP over 15 minutes
function limitTo(attempts) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: attempts,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { message: "Too many attempts. Please try again in a few minutes." } },
  });
}

// Slows down password guessing (AUTH_RATE_LIMIT raises it for automated test runs)
const passwordLimiter = limitTo(env.authRateLimit);
// Stops someone flooding an inbox with reset emails (a quarter of the above: 5 by default)
const emailLimiter = limitTo(Math.ceil(env.authRateLimit / 4));

router.post("/login", passwordLimiter, validate({ body: loginSchema }), login);
router.post("/logout", logout);
router.post("/forgot-password", emailLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
router.post("/reset-password", passwordLimiter, validate({ body: resetPasswordSchema }), resetPassword);

// The logged-in user's own account
router.get("/me", requireAuth, getCurrentUser);
router.patch("/me", requireAuth, validate({ body: updateProfileSchema }), updateCurrentUser);
router.patch("/me/password", requireAuth, passwordLimiter, validate({ body: changePasswordSchema }), changePassword);

export default router;
