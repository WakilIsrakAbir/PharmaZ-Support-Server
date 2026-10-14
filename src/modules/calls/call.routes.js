import { Router } from "express";
import { createCall, deleteCall, getCall, listCalls, updateCall } from "./call.controller.js";
import { requireProductAdmin } from "../products/product.middleware.js";
import { validate } from "../../middlewares/validate.js";
import { createCallSchema, listCallsSchema, updateCallSchema } from "./call.validator.js";

const router = Router();

router.post("/", validate({ body: createCallSchema }), createCall);
router.get("/", validate({ query: listCallsSchema }), listCalls);
router.get("/:id", getCall);
router.patch("/:id", validate({ body: updateCallSchema }), updateCall);
// Deleting can't be undone, so it's for the product's admins (and the super admin) only
router.delete("/:id", requireProductAdmin, deleteCall);

export default router;
