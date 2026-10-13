import { Router } from "express";
import { createCall, getCall, listCalls } from "./call.controller.js";
import { validate } from "../../middlewares/validate.js";
import { createCallSchema, listCallsSchema } from "./call.validator.js";

const router = Router();

router.post("/", validate({ body: createCallSchema }), createCall);
router.get("/", validate({ query: listCallsSchema }), listCalls);
router.get("/:id", getCall);

export default router;
