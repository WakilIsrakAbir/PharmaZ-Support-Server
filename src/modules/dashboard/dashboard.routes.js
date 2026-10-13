import { Router } from "express";
import { getDashboard } from "./dashboard.controller.js";
import { dashboardQuerySchema } from "./dashboard.validator.js";
import { validate } from "../../middlewares/validate.js";

// The current product's dashboard (mounted behind requireAuth + resolveProduct)
const router = Router();

router.get("/", validate({ query: dashboardQuerySchema }), getDashboard);

export default router;
