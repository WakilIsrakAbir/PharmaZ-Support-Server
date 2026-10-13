import { Router } from "express";
import { isDatabaseConnected } from "./config/db.js";
import { requireAuth } from "./modules/auth/auth.middleware.js";
import authRoutes from "./modules/auth/auth.routes.js";
import callRoutes from "./modules/calls/call.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", database: isDatabaseConnected() ? "connected" : "disconnected" });
});

router.use("/auth", authRoutes);

// Everything below needs a logged-in user
router.use("/calls", requireAuth, callRoutes);

export default router;
