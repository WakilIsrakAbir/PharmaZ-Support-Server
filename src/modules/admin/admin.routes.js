import { Router } from "express";
import {
  addAdmin,
  createProduct,
  listAllUsers,
  listProducts,
  openProduct,
  removeAdmin,
  updateProduct,
} from "./admin.controller.js";
import {
  addAdminSchema,
  createProductSchema,
  openProductSchema,
  productsQuerySchema,
  updateProductSchema,
  usersQuerySchema,
} from "./admin.validator.js";
import { validate } from "../../middlewares/validate.js";

// The super admin's console (mounted behind requireAuth + requireSuperAdmin)
const router = Router();

router.get("/products", validate({ query: productsQuerySchema }), listProducts);
router.post("/products", validate({ body: createProductSchema, query: productsQuerySchema }), createProduct);
// Each answers with the product's card; `tz` counts its "calls today" in the viewer's timezone
router.patch("/products/:id", validate({ body: updateProductSchema, query: productsQuerySchema }), updateProduct);
router.post("/products/:id/admins", validate({ body: addAdminSchema, query: productsQuerySchema }), addAdmin);
router.delete("/products/:id/admins/:userId", validate({ query: productsQuerySchema }), removeAdmin);

router.get("/users", validate({ query: usersQuerySchema }), listAllUsers);

router.post("/open-product", validate({ body: openProductSchema }), openProduct);

export default router;
