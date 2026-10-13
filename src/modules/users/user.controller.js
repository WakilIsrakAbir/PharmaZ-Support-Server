import mongoose from "mongoose";
import { User } from "../auth/user.model.js";
import { addMember } from "./member-accounts.js";
import { escapeRegExp } from "../../utils/escape-regexp.js";
import { HttpError } from "../../utils/http-error.js";

// The people in the current product. Every route runs behind
// requireAuth + resolveProduct + requireProductAdmin, so `req.product` is set.
// Product admins manage agents; admins themselves are managed by the super admin.

export async function listUsers(req, res) {
  const { page, limit, search, role } = req.validated.query;
  const inProduct = { product: req.product._id };

  const query = { ...inProduct };
  if (role) query.role = role;
  if (search) {
    const pattern = new RegExp(escapeRegExp(search), "i");
    query.$or = [{ name: pattern }, { email: pattern }];
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [users, total, admins, everyone, signedInThisMonth] = await Promise.all([
    User.find(query)
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(query),
    User.countDocuments({ ...inProduct, role: "admin" }),
    User.countDocuments(inProduct),
    User.countDocuments({ ...inProduct, lastLoginAt: { $gte: startOfMonth } }),
  ]);

  res.json({
    data: users,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    // Totals for the whole product team, whatever the filters
    summary: { total: everyone, admins, agents: everyone - admins, signedInThisMonth },
  });
}

/**
 * Adds a support agent. A new account comes back with its temporary password,
 * which is shown once and never stored in readable form.
 */
export async function addUser(req, res) {
  const { name, email } = req.validated.body;
  const { user, temporaryPassword } = await addMember({ productId: req.product._id, name, email, role: "agent" });
  res.status(201).json({ data: user, temporaryPassword });
}

/** Super admin only (see user.routes.js): makes someone an admin or an agent. */
export async function updateUser(req, res) {
  const user = await findOtherMember(req);
  user.role = req.validated.body.role;
  await user.save();
  res.json({ data: user });
}

/** Takes someone out of this product. Their account stays, waiting to be added again. */
export async function removeUser(req, res) {
  const user = await findOtherMember(req);
  if (user.role === "admin" && !req.user.isSuperAdmin) {
    throw new HttpError(403, "Only the super admin can remove an admin.");
  }
  user.set({ product: null, role: "agent" });
  await user.save();
  // Their calls stay in the logs under their name
  res.status(204).end();
}

// Admins can't change or remove themselves, so a product always keeps an admin
async function findOtherMember(req) {
  const { id } = req.params;

  if (id === req.user.id) {
    throw new HttpError(400, "You can't change or remove your own account here.");
  }

  const user = mongoose.isValidObjectId(id) ? await User.findOne({ _id: id, product: req.product._id }) : null;
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return user;
}
