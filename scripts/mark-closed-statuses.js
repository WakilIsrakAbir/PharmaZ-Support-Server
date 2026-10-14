// Marks which statuses close a call, for products made before statuses had `isClosed`.
// Safe to run more than once.
//
//   npm run migrate:closed-statuses              (make the changes)
//   npm run migrate:closed-statuses -- --dry-run (only report)
//
// A product that has never had the flag saved gets it on its "completed" and "resolved"
// statuses, the same as a new product. Products whose admin already chose are left alone.
// Admins can change the choice any time under Settings > Statuses & priorities.

import mongoose from "mongoose";
import { Product } from "../src/modules/products/product.model.js";

const CLOSED_KEYS = ["completed", "resolved"];
const isDryRun = process.argv.includes("--dry-run");

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing (it is read from server/.env).");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
console.log(isDryRun ? "DRY RUN: nothing will be changed.\n" : "");

// Read the raw documents: Mongoose would fill in isClosed: false and hide what's missing
const products = await Product.collection.find({}, { projection: { name: 1, statuses: 1 } }).toArray();

for (const product of products) {
  const statuses = product.statuses ?? [];
  if (statuses.some((status) => "isClosed" in status)) {
    console.log(`${product.name}: already set, skipped`);
    continue;
  }

  const closed = statuses.filter((status) => CLOSED_KEYS.includes(status.key)).map((status) => status.label);
  console.log(`${product.name}: closed = ${closed.length ? closed.join(", ") : "none (no matching statuses)"}`);

  if (!isDryRun) {
    await Product.collection.updateOne(
      { _id: product._id },
      { $set: { statuses: statuses.map((status) => ({ ...status, isClosed: CLOSED_KEYS.includes(status.key) })) } },
    );
  }
}

await mongoose.disconnect();
