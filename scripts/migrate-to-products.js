// Moves a single-product database onto the multi-product model. Safe to run more than once.
//
//   npm run migrate:products -- --super-admin=you@example.com            (make the changes)
//   npm run migrate:products -- --super-admin=you@example.com --dry-run  (only report)
//   npm run migrate:products -- --super-admin=you@example.com --name="Your Name"
//     (on an empty database: there's no sign-up, so this creates the super admin's
//     account and prints a temporary password to replace at the first login)
//
// 1. Creates the "PharmaZ247" product if it doesn't exist.
// 2. Makes the given account the super admin (creating it if needed). The super admin
//    sits above every product (no product of their own) and opens whichever one they need.
// 3. Puts every other user who has no product into PharmaZ247 (keeping their role).
// 4. Puts every call that has no product into PharmaZ247.
// 5. Gives PharmaZ247 its problem areas and issues, if it has none yet.
// 6. Points calls that saved their area as text ("inventory") at the matching problem area.

import mongoose from "mongoose";
import { Product } from "../src/modules/products/product.model.js";
import { User } from "../src/modules/auth/user.model.js";
import { Call } from "../src/modules/calls/call.model.js";
import { ProblemArea } from "../src/modules/products/problem-area.model.js";
import { PHARMAZ247_AREAS } from "./data/pharmaz247-setup.js";
import { createTemporaryPassword, hashPassword } from "../src/modules/auth/password.js";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [name, value = "true"] = arg.replace(/^--/, "").split("=");
    return [name, value];
  }),
);

const superAdminEmail = args["super-admin"]?.toLowerCase();
const isDryRun = args["dry-run"] === "true";
const PRODUCT = { name: "PharmaZ247", slug: "pharmaz247", description: "Pharmacy management system", accentColor: "emerald" };

if (!superAdminEmail) {
  console.error("Pass the super admin's email: --super-admin=you@example.com");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing (it is read from server/.env).");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

let superAdmin = await User.findOne({ email: superAdminEmail });

let product = await Product.findOne({ slug: PRODUCT.slug });
const usersWithoutProduct = await User.countDocuments({ product: null, email: { $ne: superAdminEmail } });
const callsWithoutProduct = await Call.countDocuments({ product: { $exists: false } });

console.log(isDryRun ? "DRY RUN: nothing will be changed.\n" : "");
console.log(`Product "${PRODUCT.name}": ${product ? "already exists" : "will be created"}`);
const isSettled = superAdmin?.isSuperAdmin && !superAdmin.product;
const superAdminPlan = !superAdmin ? "no account yet: it will be created" : isSettled ? "already" : "will be set, outside any product";
console.log(`Super admin: ${superAdminEmail} (${superAdminPlan})`);
console.log(`Users to move into ${PRODUCT.name}: ${usersWithoutProduct}`);
console.log(`Calls to move into ${PRODUCT.name}: ${callsWithoutProduct}`);

// Read straight from the collection: the Call model now expects an id here, not text
const calls = Call.collection;
const textAreaCalls = await calls.countDocuments({ area: { $type: "string" } });
const areaCount = product ? await ProblemArea.countDocuments({ product: product._id }) : 0;
console.log(`Problem areas: ${areaCount ? `${areaCount} already set up` : `${PHARMAZ247_AREAS.length} will be added`}`);
console.log(`Calls with a text area to convert: ${textAreaCalls}`);

if (!isDryRun) {
  let temporaryPassword = null;
  if (!superAdmin) {
    temporaryPassword = createTemporaryPassword();
    superAdmin = await User.create({
      name: args.name || "Super Admin",
      email: superAdminEmail,
      passwordHash: await hashPassword(temporaryPassword),
      isSuperAdmin: true,
      mustChangePassword: true,
    });
  }

  product ??= await Product.create({ ...PRODUCT, createdBy: superAdmin._id });

  await User.updateMany({ product: null, _id: { $ne: superAdmin._id } }, { $set: { product: product._id } });
  await User.updateOne({ _id: superAdmin._id }, { $set: { isSuperAdmin: true, product: null } });
  await Call.updateMany({ product: { $exists: false } }, { $set: { product: product._id } });

  if ((await ProblemArea.countDocuments({ product: product._id })) === 0) {
    await ProblemArea.insertMany(
      PHARMAZ247_AREAS.map(({ name, icon, issues }, order) => ({
        product: product._id,
        name,
        icon,
        order,
        issues: issues.map((label) => ({ label })),
      })),
    );
  }

  const areas = await ProblemArea.find({ product: product._id });
  const areaByName = new Map(areas.map((area) => [area.name, area]));
  for (const { legacyKey, name } of PHARMAZ247_AREAS) {
    const area = areaByName.get(name);
    if (!area) continue;
    await calls.updateMany(
      { product: product._id, area: legacyKey },
      { $set: { area: area._id, areaName: area.name } },
    );
  }

  // Anything left is an area the old list didn't know; keep the text as the name
  const leftover = await calls.find({ area: { $type: "string" } }, { projection: { area: 1 } }).toArray();
  for (const call of leftover) {
    await calls.updateOne({ _id: call._id }, { $set: { areaName: call.area }, $unset: { area: "" } });
  }

  console.log("\nDone.");
  if (temporaryPassword) {
    // Shown once, here only: it isn't stored in readable form
    console.log(`\nSign in as ${superAdminEmail} with the temporary password ${temporaryPassword}`);
    console.log("and choose your own password when asked.");
  }
}

await mongoose.disconnect();
