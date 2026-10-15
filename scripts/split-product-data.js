// Moves each product's calls and problem areas out of the shared collections and into the
// product's own database, "tulip_<slug>" (see src/config/product-db.js). Safe to run again.
//
//   npm run migrate:split-products -- --dry-run   only report what would be copied
//   npm run migrate:split-products                copy (the shared collections are left as they are)
//   npm run migrate:split-products -- --drop-old  once the app looks right: check every document
//                                                 was copied, back the shared collections up to
//                                                 server/backups/, then remove them
//
// Copies keep their _id, so calls still point at their problem areas. A copy replaces any
// earlier copy with the same _id, so running it twice changes nothing.

import { mkdirSync, writeFileSync } from "node:fs";
import mongoose from "mongoose";
import { productDbName, productModels } from "../src/config/product-db.js";
import { Product } from "../src/modules/products/product.model.js";

// Shared collection -> the product model that now holds its documents
const MOVES = { calls: "Call", problemareas: "ProblemArea" };
const BATCH_SIZE = 500;

const isDryRun = process.argv.includes("--dry-run");
const dropOld = process.argv.includes("--drop-old");

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing (it is read from server/.env).");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.db;
const shared = new Set((await db.listCollections().toArray()).map((collection) => collection.name));
const products = await Product.find().sort({ createdAt: 1 });

console.log(isDryRun ? "DRY RUN: nothing will be changed.\n" : "");
console.log(`Main database: ${db.databaseName}\n`);

let missingTotal = 0;

for (const product of products) {
  console.log(`${product.name} -> ${productDbName(product)}`);
  const models = productModels(product);

  for (const [name, modelName] of Object.entries(MOVES)) {
    if (!shared.has(name)) continue;
    const from = db.collection(name);
    const to = models[modelName];
    const filter = { product: product._id };

    if (!isDryRun && !dropOld) {
      await to.init(); // makes the collection and its indexes
      await copy(from.find(filter), to.collection);
    }

    const total = await from.countDocuments(filter);
    const missing = isDryRun ? total : await countMissing(from.find(filter, { projection: { _id: 1 } }), to.collection);
    missingTotal += missing;
    const state = isDryRun ? "to copy" : missing ? `${missing} NOT copied yet` : "all copied";
    console.log(`  ${name.padEnd(13)} ${String(total).padStart(6)} in the shared collection, ${state}`);
  }
}

// Documents whose product no longer exists can't be placed anywhere; they stay in the backup
const productIds = products.map((product) => product._id);
for (const name of Object.keys(MOVES)) {
  if (!shared.has(name)) continue;
  const orphans = await db.collection(name).countDocuments({ product: { $nin: productIds } });
  if (orphans) console.log(`\n${orphans} ${name} belong to no existing product. They are not copied (the backup keeps them).`);
}

if (dropOld && !isDryRun) {
  if (missingTotal > 0) {
    console.error(`\nNot removing anything: ${missingTotal} documents are not copied yet. Run without --drop-old first.`);
    process.exitCode = 1;
  } else {
    const folder = `backups/split-products-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    mkdirSync(folder, { recursive: true });

    for (const name of Object.keys(MOVES)) {
      if (!shared.has(name)) continue;
      const documents = await db.collection(name).find().toArray();
      // Extended JSON keeps ObjectIds and dates exact, so the backup can be restored as is
      writeFileSync(`${folder}/${name}.json`, mongoose.mongo.BSON.EJSON.stringify(documents, { relaxed: false }, 2));
      await db.collection(name).drop();
      console.log(`\nBacked up ${documents.length} ${name} to server/${folder}/${name}.json and removed the shared collection.`);
    }
  }
} else if (!isDryRun && missingTotal === 0) {
  console.log("\nDone. Check the app, then run again with --drop-old to remove the shared collections.");
}

await mongoose.disconnect();

/** Copies every document from `cursor` into `target`, a batch at a time, replacing earlier copies. */
async function copy(cursor, target) {
  let batch = [];
  for await (const document of cursor) {
    batch.push({ replaceOne: { filter: { _id: document._id }, replacement: document, upsert: true } });
    if (batch.length === BATCH_SIZE) {
      await target.bulkWrite(batch, { ordered: false });
      batch = [];
    }
  }
  if (batch.length) await target.bulkWrite(batch, { ordered: false });
}

/** How many of the documents in `cursor` have no copy in `target` yet. */
async function countMissing(cursor, target) {
  let missing = 0;
  let ids = [];
  const check = async () => {
    missing += ids.length - (await target.countDocuments({ _id: { $in: ids } }));
    ids = [];
  };
  for await (const { _id } of cursor) {
    ids.push(_id);
    if (ids.length === BATCH_SIZE) await check();
  }
  if (ids.length) await check();
  return missing;
}
