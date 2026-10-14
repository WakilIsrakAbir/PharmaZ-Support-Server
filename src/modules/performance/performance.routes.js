import { Router } from "express";
import { getPerformance } from "./performance.controller.js";
import { performanceQuerySchema } from "./performance.validator.js";
import { validate } from "../../middlewares/validate.js";

// Agent performance for the product's admins (mounted behind requireAuth + resolveProduct
// + requireProductAdmin)
const router = Router();

router.get("/", validate({ query: performanceQuerySchema }), getPerformance);

export default router;
