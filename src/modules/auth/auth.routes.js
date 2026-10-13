import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { getCurrentUser, login, logout, register } from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";
import { validate } from "../../middlewares/validate.js";
import { loginSchema, registerSchema } from "./auth.validator.js";

const router = Router();

// Slows down password guessing: 20 attempts per 15 minutes from one IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { message: "Too many attempts. Please try again in a few minutes." } },
});

router.post("/register", authLimiter, validate({ body: registerSchema }), register);
router.post("/login", authLimiter, validate({ body: loginSchema }), login);
router.post("/logout", logout);
router.get("/me", requireAuth, getCurrentUser);

export default router;
