import mongoose from "mongoose";
import { hashPassword } from "./password.js";
import { clearOnWrite, createDocCache } from "../../utils/doc-cache.js";

// A role inside the user's product. Product admins are made by the super admin;
// product admins add agents.
export const USER_ROLES = ["agent", "admin"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    // Each person belongs to one product. Null for the super admin, and for someone
    // who was removed from their product.
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null, index: true },
    role: { type: String, enum: USER_ROLES, default: "agent" },
    // The platform owner: creates products and can open any of them
    isSuperAdmin: { type: Boolean, default: false },
    lastLoginAt: Date,

    // Never returned by queries unless asked for with .select("+passwordHash")
    passwordHash: { type: String, required: true, select: false },
    passwordChangedAt: Date,
    // Accounts made by an admin start with a temporary password, which must be
    // replaced at the first login before anything else works (see requirePasswordSet)
    mustChangePassword: { type: Boolean, default: false },
    // Goes up on every password change. Logins carry the number they were issued with,
    // so older ones stop working (see auth.middleware.js).
    sessionVersion: { type: Number, default: 0 },

    // Forgot-password link. Only a hash is stored, so a database leak can't be used to reset passwords.
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, user) {
        user.id = user._id.toString();
        delete user._id;
        delete user.passwordHash;
        delete user.sessionVersion;
        delete user.resetTokenHash;
        delete user.resetTokenExpiresAt;
        return user;
      },
    },
  },
);

userSchema.index({ resetTokenHash: 1 }, { sparse: true });

/** Sets a new password and logs out every other session. */
userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await hashPassword(password);
  this.passwordChangedAt = new Date();
  this.mustChangePassword = false;
  this.sessionVersion += 1;
  this.resetTokenHash = undefined;
  this.resetTokenExpiresAt = undefined;
};

/** Logged-in accounts, read on every request by requireAuth. Emptied by any write to users. */
export const userCache = createDocCache(() => User);
clearOnWrite(userSchema, userCache);

export const User = mongoose.model("User", userSchema);
