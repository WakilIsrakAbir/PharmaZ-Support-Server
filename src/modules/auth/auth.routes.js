import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { forgotPassword, login, logout, register, resetPassword } from "./auth.controller.js";
import { changePassword, getCurrentUser, updateCurrentUser } from "./account.controller.js";
import { requireAuth } from "./auth.middleware.js";
import { validate } from "../../middlewares/validate.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
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

// Slows down password guessing
const passwordLimiter = limitTo(20);
// Stops someone flooding an inbox with reset emails
const emailLimiter = limitTo(5);

router.post("/register", passwordLimiter, validate({ body: registerSchema }), register);
router.post("/login", passwordLimiter, validate({ body: loginSchema }), login);
router.post("/logout", logout);
router.post("/forgot-password", emailLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
router.post("/reset-password", passwordLimiter, validate({ body: resetPasswordSchema }), resetPassword);

// The logged-in user's own account
router.get("/me", requireAuth, getCurrentUser);
router.patch("/me", requireAuth, validate({ body: updateProfileSchema }), updateCurrentUser);
router.patch("/me/password", requireAuth, passwordLimiter, validate({ body: changePasswordSchema }), changePassword);

export default router;
