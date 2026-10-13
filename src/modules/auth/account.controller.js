import { User } from "./user.model.js";
import { setAuthCookie } from "./auth-token.js";
import { verifyPassword } from "./password.js";
import { HttpError } from "../../utils/http-error.js";
import { findActiveProduct } from "../products/product.middleware.js";

// Everything here runs behind requireAuth, so `req.user` is the logged-in user.

/** The user, plus the product they work in (null while waiting to be added to one). */
export async function getCurrentUser(req, res) {
  const product = await findActiveProduct(req);
  res.json({ data: { ...req.user.toJSON(), product: product?.toSummary() ?? null } });
}

export async function updateCurrentUser(req, res) {
  const { name, email, phone } = req.validated.body;
  const user = req.user;

  if (email !== user.email && (await User.exists({ email }))) {
    const message = "Another account already uses this email.";
    throw new HttpError(409, message, { email: message });
  }

  user.set({ name, email, ...(phone !== undefined && { phone }) });
  await user.save();

  res.json({ data: user });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.validated.body;
  const user = await User.findById(req.user.id).select("+passwordHash");

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    const message = "Your current password is incorrect.";
    throw new HttpError(400, message, { currentPassword: message });
  }

  await user.setPassword(newPassword);
  await user.save();

  // Other devices are logged out by the change; give this one a fresh login
  setAuthCookie(res, user);
  res.json({ data: user });
}
