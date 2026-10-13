import mongoose from "mongoose";
import { User } from "../auth/user.model.js";
import { Call } from "../calls/call.model.js";
import { toKey } from "../products/option-list.js";
import { PRODUCT_COOKIE } from "../products/product.middleware.js";
import { Product } from "../products/product.model.js";
import { addMember, findJoinableAccount } from "../users/member-accounts.js";
import { env } from "../../config/env.js";
import { escapeRegExp } from "../../utils/escape-regexp.js";
import { HttpError } from "../../utils/http-error.js";
import { startOfLocalDay } from "../../utils/local-dates.js";

// The super admin's console. Every route runs behind requireAuth + requireSuperAdmin.
// Unlike the rest of the API, it looks across all products.

const MAX_ADMINS_SHOWN = 5;

/** Every product as a card: details, its admins, team size and call activity. */
export async function listProducts(req, res) {
  const { tz } = req.validated.query;
  const products = await Product.find().sort({ createdAt: 1 });
  const cards = await toCards(products, tz);

  const active = cards.filter((card) => !card.isArchived);
  res.json({
    data: cards,
    summary: {
      products: active.length,
      archived: cards.length - active.length,
      people: await User.countDocuments({ isSuperAdmin: false, product: { $ne: null } }),
      callsToday: active.reduce((sum, card) => sum + card.callsToday, 0),
      callsTotal: cards.reduce((sum, card) => sum + card.callsTotal, 0),
    },
  });
}

/**
 * Creates a product together with its first admin. The admin's email is checked first,
 * so a refused email never leaves a product without an admin behind.
 */
export async function createProduct(req, res) {
  const { name, description, accentColor, admin } = req.validated.body;

  const existing = await withFieldPrefix("admin", () => findJoinableAccount(admin.email, null));
  if (!existing && !admin.name) {
    const message = "Enter their name. There's no account with this email yet, so one will be made.";
    throw new HttpError(400, message, { "admin.name": message });
  }

  const product = await Product.create({
    name,
    slug: await freeSlug(name),
    description,
    accentColor,
    createdBy: req.user._id,
  });
  const { user, temporaryPassword } = await addMember({ productId: product._id, ...admin, role: "admin" });

  res.status(201).json({
    data: (await toCards([product], req.validated.query.tz))[0],
    admin: { user, temporaryPassword },
  });
}

export async function updateProduct(req, res) {
  const product = await findProduct(req.params.id);
  product.set(req.validated.body);
  await product.save();
  res.json({ data: (await toCards([product], req.validated.query.tz))[0] });
}

/**
 * Makes someone an admin of the product: an agent already in it is promoted, anyone
 * else is added (with a new account and temporary password if they need one).
 */
export async function addAdmin(req, res) {
  const product = await findProduct(req.params.id);
  const { name, email } = req.validated.body;

  const member = await User.findOne({ email, product: product._id });
  let result;
  if (member) {
    if (member.role === "admin") {
      const message = "This person is already an admin of this product.";
      throw new HttpError(409, message, { email: message });
    }
    member.role = "admin";
    await member.save();
    result = { user: member, temporaryPassword: null };
  } else {
    result = await addMember({ productId: product._id, name, email, role: "admin" });
  }

  res.status(201).json({ data: (await toCards([product], req.validated.query.tz))[0], admin: result });
}

/** Stops someone being an admin. They stay in the product as an agent. */
export async function removeAdmin(req, res) {
  const product = await findProduct(req.params.id);
  const { userId } = req.params;
  const admin = mongoose.isValidObjectId(userId)
    ? await User.findOne({ _id: userId, product: product._id, role: "admin" })
    : null;
  if (!admin) throw new HttpError(404, "Admin not found");

  admin.role = "agent";
  await admin.save();
  res.json({ data: (await toCards([product], req.validated.query.tz))[0] });
}

/** Every account on the platform, with the product each one is in. */
export async function listAllUsers(req, res) {
  const { page, limit, search, product, role } = req.validated.query;
  const query = {};

  if (search) {
    const pattern = new RegExp(escapeRegExp(search), "i");
    query.$or = [{ name: pattern }, { email: pattern }];
  }
  if (product) query.product = product === "none" ? null : product;
  if (role === "super-admin") query.isSuperAdmin = true;
  else if (role) Object.assign(query, { role, isSuperAdmin: false });

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ isSuperAdmin: -1, createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "product", select: "name slug accentColor isArchived" }),
    User.countDocuments(query),
  ]);

  res.json({
    data: users.map((user) => ({ ...user.toJSON(), product: user.product ? summary(user.product) : null })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/** Opens a product: from now on the super admin's /product, /calls, /users and /dashboard work inside it. */
export async function openProduct(req, res) {
  const product = await findProduct(req.validated.body.productId);

  res.cookie(PRODUCT_COOKIE, product.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });
  res.json({ data: product.toSummary() });
}

async function findProduct(id) {
  const product = mongoose.isValidObjectId(id) ? await Product.findById(id) : null;
  if (!product) throw new HttpError(404, "Product not found");
  return product;
}

/** "PharmaZ 247" -> "pharmaz-247", or "pharmaz-247-2" if that's taken. */
async function freeSlug(name) {
  const base = toKey(name);
  let slug = base;
  for (let n = 2; await Product.exists({ slug }); n++) slug = `${base}-${n}`;
  return slug;
}

/** Runs `work`; field errors it throws are renamed "admin.email" etc., to match the form. */
async function withFieldPrefix(prefix, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof HttpError && error.fields) {
      error.fields = Object.fromEntries(Object.entries(error.fields).map(([key, value]) => [`${prefix}.${key}`, value]));
    }
    throw error;
  }
}

const summary = (product) => ({
  id: product._id.toString(),
  name: product.name,
  slug: product.slug,
  accentColor: product.accentColor,
  isArchived: product.isArchived,
});

/** Products plus their admins, team size and call numbers, in a few grouped queries. */
async function toCards(products, tz) {
  const ids = products.map((product) => product._id);
  const startOfToday = startOfLocalDay(tz);

  const [members, calls] = await Promise.all([
    User.aggregate([
      { $match: { product: { $in: ids } } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$product",
          agentCount: { $sum: { $cond: [{ $eq: ["$role", "agent"] }, 1, 0] } },
          admins: {
            $push: {
              $cond: [
                { $eq: ["$role", "admin"] },
                { id: { $toString: "$_id" }, name: "$name", email: "$email", mustChangePassword: "$mustChangePassword" },
                "$$REMOVE",
              ],
            },
          },
        },
      },
    ]),
    Call.aggregate([
      { $match: { product: { $in: ids } } },
      {
        $group: {
          _id: "$product",
          callsTotal: { $sum: 1 },
          callsToday: { $sum: { $cond: [{ $gte: ["$calledAt", startOfToday] }, 1, 0] } },
          lastCallAt: { $max: "$calledAt" },
        },
      },
    ]),
  ]);

  const membersOf = new Map(members.map((group) => [group._id.toString(), group]));
  const callsOf = new Map(calls.map((group) => [group._id.toString(), group]));

  return products.map((product) => {
    const team = membersOf.get(product.id);
    const activity = callsOf.get(product.id);
    return {
      ...summary(product),
      description: product.description,
      createdAt: product.createdAt,
      admins: (team?.admins ?? []).slice(0, MAX_ADMINS_SHOWN),
      adminCount: team?.admins.length ?? 0,
      agentCount: team?.agentCount ?? 0,
      callsToday: activity?.callsToday ?? 0,
      callsTotal: activity?.callsTotal ?? 0,
      lastCallAt: activity?.lastCallAt ?? null,
    };
  });
}
