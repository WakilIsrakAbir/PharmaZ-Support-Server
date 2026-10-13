import { z } from "zod";
import { USER_ROLES } from "../auth/user.model.js";
import { timezoneOffset } from "../dashboard/dashboard.validator.js";
import { ACCENT_COLORS } from "../products/product.constants.js";
import { newMemberSchema } from "../users/user.validator.js";

const objectId = (what) => z.string({ error: `Pick a ${what}.` }).regex(/^[a-f\d]{24}$/i, `Unknown ${what}.`);

const productName = z
  .string({ error: "Give the product a name." })
  .trim()
  .min(2, "Use at least 2 characters.")
  .max(60, "Keep it to 60 characters.");

const description = z.string().trim().max(200, "Keep it to 200 characters.");

export const productsQuerySchema = z.object({ tz: timezoneOffset });

export const createProductSchema = z.strictObject({
  name: productName,
  description: description.default(""),
  accentColor: z.enum(ACCENT_COLORS).default("emerald"),
  // Every product starts with an admin, who then sets it up and adds the agents
  admin: newMemberSchema,
});

export const updateProductSchema = z.strictObject({
  name: productName.optional(),
  description: description.optional(),
  accentColor: z.enum(ACCENT_COLORS).optional(),
  // Archived products disappear for their members; nothing is deleted
  isArchived: z.boolean().optional(),
});

export const addAdminSchema = newMemberSchema;

export const usersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => value || undefined),
  // A product id, or "none" for accounts that aren't in a product
  product: z.union([objectId("product"), z.literal("none")]).optional(),
  role: z.enum([...USER_ROLES, "super-admin"]).optional(),
});

export const openProductSchema = z.strictObject({ productId: objectId("product") });
