import { Router } from "express";
import {
  createArea,
  getSetup,
  reorderAreas,
  replaceCustomFields,
  replacePriorities,
  replaceStatuses,
  updateArea,
  updateProduct,
} from "./product.controller.js";
import { requireProductAdmin } from "./product.middleware.js";
import { validate } from "../../middlewares/validate.js";
import {
  createAreaSchema,
  customFieldsSchema,
  prioritiesSchema,
  reorderAreasSchema,
  statusesSchema,
  updateAreaSchema,
  updateProductSchema,
} from "./product.validator.js";

// The current product (mounted behind requireAuth + resolveProduct)
const router = Router();

// Everyone in the product reads the setup; the forms are built from it
router.get("/setup", getSetup);

// Changing it is for the product's admins
router.use(requireProductAdmin);
router.patch("/", validate({ body: updateProductSchema }), updateProduct);
router.put("/statuses", validate({ body: statusesSchema }), replaceStatuses);
router.put("/priorities", validate({ body: prioritiesSchema }), replacePriorities);
router.put("/custom-fields", validate({ body: customFieldsSchema }), replaceCustomFields);
router.post("/areas", validate({ body: createAreaSchema }), createArea);
router.put("/areas/order", validate({ body: reorderAreasSchema }), reorderAreas);
router.patch("/areas/:id", validate({ body: updateAreaSchema }), updateArea);

export default router;
