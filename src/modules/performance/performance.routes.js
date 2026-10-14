import { Router } from "express";
import { getPerformance } from "./performance.controller.js";
import { performanceQuerySchema } from "./performance.validator.js";
import { validate } from "../../middlewares/validate.js";

// How the product's team is doing, for everyone in the product (mounted behind
// requireAuth + resolveProduct)
const router = Router();

router.get("/", validate({ query: performanceQuerySchema }), getPerformance);

export default router;
