import mongoose from "mongoose";
import { callSchema } from "../modules/calls/call.model.js";
import { problemAreaSchema } from "../modules/products/problem-area.model.js";

// Each product keeps its own data (calls and problem areas) in its own database,
// "tulip_<slug>", so every product shows up as its own folder in Atlas or Compass.
// Accounts and the product list stay in the main database: one login can move between
// products, and the super admin works across all of them.
//
// Every product database shares the app's one connection (useDb), so this costs nothing
// extra. Nothing joins across databases: look people up with the User model directly.

export const PRODUCT_DB_PREFIX = "tulip_";

/** "pharmaz247" -> "tulip_pharmaz247". A product's slug never changes, so neither does this. */
export function productDbName(product) {
  return `${PRODUCT_DB_PREFIX}${product.slug}`;
}

/** The product's own database. Made by MongoDB on the first write. */
function productDb(product) {
  return mongoose.connection.useDb(productDbName(product), { useCache: true });
}

/** The product's models: { Call, ProblemArea }, reading and writing in its own database. */
export function productModels(product) {
  const db = productDb(product);
  return {
    Call: db.models.Call ?? db.model("Call", callSchema),
    ProblemArea: db.models.ProblemArea ?? db.model("ProblemArea", problemAreaSchema),
  };
}

/** Erases everything the product kept in its own database. */
export function dropProductDb(product) {
  return productDb(product).dropDatabase();
}
