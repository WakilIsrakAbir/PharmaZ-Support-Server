import { Router } from "express";
import { addUser, listUsers, removeUser, updateUser } from "./user.controller.js";
import { requireSuperAdmin } from "../products/product.middleware.js";
import { validate } from "../../middlewares/validate.js";
import { newMemberSchema, listUsersSchema, updateUserSchema } from "./user.validator.js";

const router = Router();

router.get("/", validate({ query: listUsersSchema }), listUsers);
router.post("/", validate({ body: newMemberSchema }), addUser);
// Who is an admin is the super admin's call
router.patch("/:id", requireSuperAdmin, validate({ body: updateUserSchema }), updateUser);
router.delete("/:id", removeUser);

export default router;
