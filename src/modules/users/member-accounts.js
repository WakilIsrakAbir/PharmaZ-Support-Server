import { User } from "../auth/user.model.js";
import { createTemporaryPassword, hashPassword } from "../auth/password.js";
import { HttpError } from "../../utils/http-error.js";

// Accounts are never self-made: the super admin adds product admins, and product
// admins add agents. Both go through here.

const conflict = (message) => new HttpError(409, message, { email: message });

/**
 * The existing account for `email` if it can join `productId`, or null when a new
 * account is needed. Throws 409 when the person can't be added. Call it before
 * creating anything, so a refused email never leaves half-made records behind.
 */
export async function findJoinableAccount(email, productId) {
  const user = await User.findOne({ email });
  if (!user) return null;

  if (user.isSuperAdmin) throw conflict("This is the super admin's account.");
  if (productId && user.product?.equals(productId)) throw conflict("This person is already in this product.");
  if (user.product) throw conflict("This person already belongs to another product.");
  return user;
}

/**
 * Adds a person to a product with `role`. Someone without an account gets one with
 * a temporary password, returned once as `temporaryPassword` (null for an existing
 * account). They must replace it when they first log in.
 */
export async function addMember({ productId, name, email, role }) {
  const existing = await findJoinableAccount(email, productId);

  if (existing) {
    existing.set({ product: productId, role });
    await existing.save();
    return { user: existing, temporaryPassword: null };
  }

  if (!name) {
    const message = "Enter their name. There's no account with this email yet, so one will be made.";
    throw new HttpError(400, message, { name: message });
  }

  const temporaryPassword = createTemporaryPassword();
  const user = await User.create({
    name,
    email,
    product: productId,
    role,
    passwordHash: await hashPassword(temporaryPassword),
    mustChangePassword: true,
  });
  return { user, temporaryPassword };
}
