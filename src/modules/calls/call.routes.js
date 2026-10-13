import { Router } from "express";
import { createCall, getCall, listCalls, updateCall } from "./call.controller.js";
import { validate } from "../../middlewares/validate.js";
import { createCallSchema, listCallsSchema, updateCallSchema } from "./call.validator.js";

const router = Router();

router.post("/", validate({ body: createCallSchema }), createCall);
router.get("/", validate({ query: listCallsSchema }), listCalls);
router.get("/:id", getCall);
router.patch("/:id", validate({ body: updateCallSchema }), updateCall);

export default router;
