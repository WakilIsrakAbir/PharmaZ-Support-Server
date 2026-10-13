import mongoose from "mongoose";
import { Product } from "./product.model.js";
import { HttpError } from "../../utils/http-error.js";

// Super admins aren't tied to one product; they pick one to work in, kept in this cookie.
export const PRODUCT_COOKIE = "product";

/**
 * The product a request works in: the user's own product, or for a super admin
 * the one they opened (falling back to the first product). Null if there is none.
 */
export async function findActiveProduct(req) {
  const { user } = req;

  if (!user.isSuperAdmin) {
    return user.product ? Product.findOne({ _id: user.product, isArchived: false }) : null;
  }

  const openedId = req.cookies[PRODUCT_COOKIE];
  const opened = mongoose.isValidObjectId(openedId) ? await Product.findById(openedId) : null;
  return opened ?? Product.findOne({ isArchived: false }).sort({ createdAt: 1 });
}

/**
 * Use after requireAuth. Puts the product on `req.product`. Every product query
 * filters by it, so one product's data never shows up in another.
 */
export async function resolveProduct(req, _res, next) {
  const product = await findActiveProduct(req);

  if (!product) {
    // The client shows a "Waiting for access" page for this code
    const message = req.user.product
      ? "Your product has been archived. Ask the super admin if you still need access."
      : "You aren't in a product yet. Ask your product admin to add you.";
    throw new HttpError(403, message, { product: "none" });
  }

  req.product = product;
  next();
}

/** Use after resolveProduct: the product's admins (and super admins) only. */
export function requireProductAdmin(req, _res, next) {
  if (req.user.role !== "admin" && !req.user.isSuperAdmin) {
    throw new HttpError(403, "Only admins can do this.");
  }
  next();
}

/** Use after requireAuth: the platform owner only. */
export function requireSuperAdmin(req, _res, next) {
  if (!req.user.isSuperAdmin) {
    throw new HttpError(403, "Only the super admin can do this.");
  }
  next();
}
