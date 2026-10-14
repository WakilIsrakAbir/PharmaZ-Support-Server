import { Router } from "express";
import { isDatabaseConnected } from "./config/db.js";
import { requireAuth, requirePasswordSet } from "./modules/auth/auth.middleware.js";
import { requireProductAdmin, requireSuperAdmin, resolveProduct } from "./modules/products/product.middleware.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import callRoutes from "./modules/calls/call.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import performanceRoutes from "./modules/performance/performance.routes.js";
import productRoutes from "./modules/products/product.routes.js";
import userRoutes from "./modules/users/user.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", database: isDatabaseConnected() ? "connected" : "disconnected" });
});

router.use("/auth", authRoutes);

// Everything below needs a logged-in user who has replaced their temporary password
const signedIn = [requireAuth, requirePasswordSet];

// The super admin's console, across all products
router.use("/admin", ...signedIn, requireSuperAdmin, adminRoutes);

// Work inside the user's product (for the super admin: the product they opened)
router.use("/dashboard", ...signedIn, resolveProduct, dashboardRoutes);
router.use("/performance", ...signedIn, resolveProduct, requireProductAdmin, performanceRoutes);
router.use("/product", ...signedIn, resolveProduct, productRoutes);
router.use("/calls", ...signedIn, resolveProduct, callRoutes);
router.use("/users", ...signedIn, resolveProduct, requireProductAdmin, userRoutes);

export default router;
