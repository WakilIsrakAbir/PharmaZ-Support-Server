import mongoose from "mongoose";
import { hashPassword } from "./password.js";

// New sign-ups are agents. Promote someone to admin directly in the database for now.
const USER_ROLES = ["agent", "admin"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    role: { type: String, enum: USER_ROLES, default: "agent" },
    lastLoginAt: Date,

    // Never returned by queries unless asked for with .select("+passwordHash")
    passwordHash: { type: String, required: true, select: false },
    passwordChangedAt: Date,
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
  this.sessionVersion += 1;
  this.resetTokenHash = undefined;
  this.resetTokenExpiresAt = undefined;
};

export const User = mongoose.model("User", userSchema);
