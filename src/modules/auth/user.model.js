import mongoose from "mongoose";

// New sign-ups are agents. Promote someone to admin directly in the database for now.
const USER_ROLES = ["agent", "admin"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Never returned by queries unless asked for with .select("+passwordHash")
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "agent" },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, user) {
        user.id = user._id.toString();
        delete user._id;
        delete user.passwordHash;
        return user;
      },
    },
  },
);

export const User = mongoose.model("User", userSchema);
