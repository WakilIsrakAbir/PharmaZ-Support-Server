import { z } from "zod";

const name = z
  .string({ error: "Enter your name." })
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(80, "Name must be 80 characters or fewer.");

const email = z
  .string({ error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

const newPassword = z
  .string({ error: "Enter a password." })
  .min(8, "Use at least 8 characters.")
  .max(128, "Use 128 characters or fewer.");

// Bangladeshi mobile numbers: 01XXXXXXXXX, optionally starting with +88 or 88. Empty clears it.
const phone = z
  .string()
  .trim()
  .refine((value) => value === "" || /^(\+?88)?01[3-9]\d{8}$/.test(value.replace(/[\s-]/g, "")), {
    error: "Enter a valid mobile number, like 01712-345678.",
  });

export const registerSchema = z.strictObject({ name, email, password: newPassword });

export const loginSchema = z.strictObject({
  email,
  password: z.string({ error: "Enter your password." }).min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.strictObject({ email });

export const resetPasswordSchema = z.strictObject({
  token: z.string({ error: "This reset link is invalid." }).regex(/^[a-f0-9]{64}$/, "This reset link is invalid."),
  password: newPassword,
});

export const updateProfileSchema = z.strictObject({ name, email, phone: phone.optional() });

export const changePasswordSchema = z.strictObject({
  currentPassword: z.string({ error: "Enter your current password." }).min(1, "Enter your current password."),
  newPassword,
});
